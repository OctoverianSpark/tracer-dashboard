import { findAsignedMachines } from '@/app/computers/actions'
import { getRawAppUsageLogsRange, getSchedules, getProgramations, getStateLog, getAllRotations } from '@/app/time/actions'
import { getCategorizationApps } from '@/app/supervisors/categorization-actions'
import { resolveEffectiveProgramation } from '@/lib/scheduleResolver'
import { AppUser, AppUsageLog } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation } from '@/types/Schedules'
import { StateLog } from '@/types/StateLog'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export interface UserAppUsage {
  app: string
  seconds: number
  category: 'productive' | 'unproductive' | 'uncategorized'
}

export interface UserProductivity {
  user: AppUser
  machine?: Machine
  programation?: Programation
  scheduledMinutes: number
  productiveSeconds: number
  unproductiveSeconds: number
  uncategorizedSeconds: number
  totalSeconds: number
  appProductivityPercent: number
  workCompliancePercent: number
  overallProductivityPercent: number
  topApps: UserAppUsage[]
}

// Vista TH: mismos datos que UserProductivity sin machine/topApps (definida acá, no en
// app/th/actions.ts, porque los archivos 'use server' solo deben exportar funciones async —
// exportar un tipo desde ahí rompe en runtime bajo Turbopack: "X is not defined").
export type THProductivity = Omit<UserProductivity, 'machine' | 'topApps'>

export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const scheduledWorkMinutes = (prog: Programation): number => {
  if (!prog.start_day || !prog.end_day) return 0
  let total = timeToMinutes(prog.end_day) - timeToMinutes(prog.start_day)
  if (prog.start_lunch && prog.end_lunch) {
    total -= timeToMinutes(prog.end_lunch) - timeToMinutes(prog.start_lunch)
  }
  return Math.max(0, total)
}

// Construye ventanas de tiempo donde el estado era ACTIVE para un día dado.
// Cada StateLog marca el inicio de un nuevo estado; el siguiente log marca su fin.
export const buildActiveWindows = (stateLogs: StateLog[]): Array<{ start: number; end: number }> => {
  const sorted = [...stateLogs].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const windows: Array<{ start: number; end: number }> = []
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].category?.key !== 'active') continue
    const start = new Date(sorted[i].timestamp).getTime()
    const end = i + 1 < sorted.length
      ? new Date(sorted[i + 1].timestamp).getTime()
      : Infinity
    windows.push({ start, end })
  }
  return windows
}

// Devuelve true si el punto medio del intervalo de app cae dentro de una ventana activa.
export const isIntervalActive = (log: AppUsageLog, windows: Array<{ start: number; end: number }>): boolean => {
  if (windows.length === 0) return true // sin datos de estado → contar todo
  const mid = (new Date(log.interval_start).getTime() + new Date(log.interval_end).getTime()) / 2
  return windows.some(w => mid >= w.start && mid < w.end)
}

// Máquinas asignadas + historial COMPLETO de state logs por máquina (sin filtrar por fecha — el
// backend no soporta rango de fechas para state logs, así que se trae todo una sola vez y cada
// llamador filtra los días que le interesan a partir de este mismo resultado).
export const loadMachinesAndStateLogs = async (
  users: AppUser[]
): Promise<{
  machinesByUser: Map<number, Machine[]>
  stateByMachine: Map<number, StateLog[]>
}> => {
  const machinesPerUser = await Promise.all(
    users.map(u =>
      findAsignedMachines(Number(u.id))
        .then(ms => ({ userId: Number(u.id), machines: ms }))
        .catch(() => ({ userId: Number(u.id), machines: [] as Machine[] }))
    )
  )
  const machinesByUser = new Map(machinesPerUser.map(r => [r.userId, r.machines]))

  const pairs: Array<{ userId: number; machine: Machine }> = []
  for (const [userId, machines] of machinesByUser) {
    for (const m of machines) {
      if (m.id != null) pairs.push({ userId, machine: m })
    }
  }

  const stateLogResults = await Promise.all(
    pairs.map(async ({ userId, machine }) => {
      try {
        const raw = await getStateLog(userId, Number(machine.id))
        return { machineId: Number(machine.id), logs: Array.isArray(raw) ? raw as StateLog[] : [] }
      } catch {
        return { machineId: Number(machine.id), logs: [] as StateLog[] }
      }
    })
  )
  const stateByMachine = new Map(stateLogResults.map(r => [r.machineId, r.logs]))

  return { machinesByUser, stateByMachine }
}

const dateRange = (dateFrom: string, dateTo: string): string[] => {
  const dates: string[] = []
  let cursor = new Date(`${dateFrom}T12:00:00`)
  const end = new Date(`${dateTo}T12:00:00`)
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toLocaleDateString('sv'))
    cursor = new Date(cursor.getTime() + 86400000)
  }
  return dates
}

/**
 * Calcula productividad por usuario acumulada sobre [dateFrom, dateTo] (inclusive; un solo día
 * si dateFrom === dateTo). Reutiliza por día la misma lógica de ventana de jornada +
 * clasificación productivo/improductivo que existía para un solo día, y suma los totales en vez
 * de promediar los porcentajes. Un día sin `programation` para el usuario no aporta a la suma —
 * mismo criterio que ya aplicaba por día (scheduledSecs=0 → ese día no cuenta), para que un
 * rango con días libres no infle el porcentaje final.
 */
export async function computeProductivityRange(
  users: AppUser[],
  dateFrom: string,
  dateTo: string,
): Promise<UserProductivity[]> {
  const dates = dateRange(dateFrom, dateTo)

  const bogotaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const todayStr = bogotaNow.toLocaleDateString('sv')
  const nowMs = bogotaNow.getTime()

  const [schedules, programations, rawLogs, categorizationApps, rotations, { machinesByUser, stateByMachine }] =
    await Promise.all([
      getSchedules(),
      getProgramations(),
      getRawAppUsageLogsRange(dateFrom, dateTo),
      getCategorizationApps(),
      getAllRotations(),
      loadMachinesAndStateLogs(users),
    ])

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))

  const logsByMachineByDate = new Map<string, Map<number, AppUsageLog[]>>()
  for (const date of dates) logsByMachineByDate.set(date, new Map())
  for (const log of rawLogs) {
    const date = log.interval_start?.slice(0, 10)
    const byMachine = logsByMachineByDate.get(date)
    if (!byMachine) continue // fuera del rango pedido, no debería pasar
    const cid = Number(log.computer_id)
    if (!byMachine.has(cid)) byMachine.set(cid, [])
    byMachine.get(cid)!.push(log)
  }

  const stateByMachineByDate = new Map<string, Map<number, StateLog[]>>()
  for (const date of dates) stateByMachineByDate.set(date, new Map())
  for (const [machineId, logs] of stateByMachine) {
    for (const log of logs) {
      const date = log.timestamp?.slice(0, 10)
      const byMachine = stateByMachineByDate.get(date)
      if (!byMachine) continue // fuera del rango pedido
      if (!byMachine.has(machineId)) byMachine.set(machineId, [])
      byMachine.get(machineId)!.push(log)
    }
  }

  return users.map(user => {
    const userId = Number(user.id)
    const userMachines = machinesByUser.get(userId) ?? []
    const primaryMachine = userMachines[0]

    let productive = 0, unproductive = 0, uncategorized = 0, total = 0, scheduledMinutes = 0
    let lastProgramation: Programation | undefined
    const appMap = new Map<string, UserAppUsage>()

    for (const date of dates) {
      const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]
      const programation = resolveEffectiveProgramation(schedules, rotations, programations, userId, dayKey, date)
      const dayScheduledMinutes = programation ? scheduledWorkMinutes(programation) : 0
      if (programation) lastProgramation = programation

      // Sin programación ese día: no cuenta para el rango (mismo criterio que el cálculo de un
      // solo día, donde scheduledSecs=0 ya deja los porcentajes en 0 sin usar `total`).
      if (dayScheduledMinutes === 0 || !userMachines.length) continue

      const dayLogsByMachine = logsByMachineByDate.get(date)!
      const dayStateByMachine = stateByMachineByDate.get(date)!

      const dayIntervals: AppUsageLog[] = []
      const dayActiveWindows: Array<{ start: number; end: number }> = []
      for (const m of userMachines) {
        const mid = Number(m.id)
        dayIntervals.push(...(dayLogsByMachine.get(mid) ?? []))
        dayActiveWindows.push(...buildActiveWindows(dayStateByMachine.get(mid) ?? []))
      }
      if (!dayIntervals.length) continue

      const dayNowMs = date === todayStr ? nowMs : Infinity
      const schedWinStart = new Date(`${date}T${programation!.start_day}:00`).getTime()
      const schedWinEnd = Math.min(
        programation!.end_day
          ? new Date(`${date}T${programation!.end_day}:00`).getTime()
          : new Date(`${date}T23:00:00`).getTime(),
        dayNowMs,
      )

      scheduledMinutes += dayScheduledMinutes

      for (const interval of dayIntervals) {
        const startMs = new Date(interval.interval_start).getTime()
        const endMs = new Date(interval.interval_end).getTime()
        if (startMs < schedWinStart || startMs >= schedWinEnd) continue
        if (!isIntervalActive(interval, dayActiveWindows)) continue

        const intervalSecs = endMs > startMs ? Math.round((endMs - startMs) / 1000) : 300
        total += intervalSecs

        for (const a of interval.apps ?? []) {
          const cat = categoryMap.get(a.app.toLowerCase())
          if (cat === 'ignore') continue

          const secs = Math.min(a.seconds, intervalSecs)
          const resolved: UserAppUsage['category'] = cat === 'productive' ? 'productive'
            : cat === 'unproductive' ? 'unproductive'
              : 'uncategorized'

          if (resolved === 'productive') productive += secs
          else if (resolved === 'unproductive') unproductive += secs
          else uncategorized += secs

          const existing = appMap.get(a.app)
          if (existing) existing.seconds += secs
          else appMap.set(a.app, { app: a.app, seconds: secs, category: resolved })
        }
      }
    }

    const categorized = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60
    const effective = productive + uncategorized * 0.3

    return {
      user, machine: primaryMachine, programation: lastProgramation, scheduledMinutes,
      productiveSeconds: Math.round(productive),
      unproductiveSeconds: Math.round(unproductive),
      uncategorizedSeconds: Math.round(uncategorized),
      totalSeconds: Math.round(total),
      appProductivityPercent: categorized > 0 ? Math.round((productive / categorized) * 100) : 0,
      workCompliancePercent: scheduledSecs > 0 ? Math.min(100, Math.round((total / scheduledSecs) * 100)) : 0,
      overallProductivityPercent: scheduledSecs > 0 ? Math.min(100, Math.round((effective / scheduledSecs) * 100)) : 0,
      topApps: [...appMap.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 8),
    }
  })
}
