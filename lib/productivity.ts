import { findAsignedMachines } from '@/app/computers/actions'
import { getRawAppUsageLogsRange, getSchedules, getProgramations, getStateLog, getAllRotations } from '@/app/time/actions'
import { getCategorizationApps } from '@/app/supervisors/categorization-actions'
import { getLunchSkips } from '@/app/th/actions'
import { resolveEffectiveProgramation } from '@/lib/scheduleResolver'
import { AppUser, AppUsageLog } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation, Schedule, RotationData } from '@/types/Schedules'
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

// Crédito que aporta el tiempo en apps "sin categorizar" al cálculo de productividad Global —
// no es 0% (no confirmado que sea improductivo) ni 100% (no confirmado que sea productivo).
export const UNCATEGORIZED_CREDIT = 0.7

export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// skipLunch: excepción puntual de un usuario+fecha (ver lunch_skips / THScheduleView "Quitar
// almuerzo") — ese día no se resta el bloque de almuerzo de la jornada programada.
export const scheduledWorkMinutes = (prog: Programation, skipLunch = false): number => {
  if (!prog.start_day || !prog.end_day) return 0
  let total = timeToMinutes(prog.end_day) - timeToMinutes(prog.start_day)
  if (!skipLunch && prog.start_lunch && prog.end_lunch) {
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

interface DayContext {
  schedules: Schedule[]
  rotations: RotationData[]
  programations: Programation[]
  categoryMap: Map<string, string>
  todayStr: string
  nowMs: number
  // Claves `${appuser_id}_${date}` con excepción "sin almuerzo" ese día (ver lunch_skips).
  lunchSkipDates: Set<string>
}

interface UserDayStats {
  programation?: Programation
  scheduledMinutes: number
  productive: number
  unproductive: number
  uncategorized: number
  total: number
  appUsage: Map<string, UserAppUsage>
}

const EMPTY_DAY_STATS: UserDayStats = {
  scheduledMinutes: 0, productive: 0, unproductive: 0, uncategorized: 0, total: 0,
  appUsage: new Map(),
}

// Un día puntual para un usuario: ventana de jornada, filtra intervalos activos, clasifica
// productivo/improductivo/sin-categorizar. No decide si el día "cuenta" — computeProductivityRange
// lo salta cuando scheduledMinutes=0; computeProductivityDaily lo devuelve igual (en cero) para
// que la curva tenga el eje de fechas continuo.
function computeUserDayStats(
  userId: number,
  userMachines: Machine[],
  date: string,
  ctx: DayContext,
  dayLogsByMachine: Map<number, AppUsageLog[]>,
  dayStateByMachine: Map<number, StateLog[]>,
): UserDayStats {
  const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]
  const resolved = resolveEffectiveProgramation(ctx.schedules, ctx.rotations, ctx.programations, userId, dayKey, date)
  const programation = resolved?.programation
  const skipLunch = ctx.lunchSkipDates.has(`${userId}_${date}`) || (resolved?.skipLunch ?? false)
  const scheduledMinutes = resolved ? scheduledWorkMinutes(resolved.programation, skipLunch) : 0

  if (scheduledMinutes === 0 || !userMachines.length) return { ...EMPTY_DAY_STATS, programation }

  const dayIntervals: AppUsageLog[] = []
  const dayActiveWindows: Array<{ start: number; end: number }> = []
  for (const m of userMachines) {
    const mid = Number(m.id)
    dayIntervals.push(...(dayLogsByMachine.get(mid) ?? []))
    dayActiveWindows.push(...buildActiveWindows(dayStateByMachine.get(mid) ?? []))
  }
  if (!dayIntervals.length) return { ...EMPTY_DAY_STATS, programation, scheduledMinutes }

  const dayNowMs = date === ctx.todayStr ? ctx.nowMs : Infinity
  const schedWinStart = new Date(`${date}T${programation!.start_day}:00`).getTime()
  const schedWinEnd = Math.min(
    programation!.end_day
      ? new Date(`${date}T${programation!.end_day}:00`).getTime()
      : new Date(`${date}T23:00:00`).getTime(),
    dayNowMs,
  )

  let productive = 0, unproductive = 0, uncategorized = 0, total = 0
  const appUsage = new Map<string, UserAppUsage>()

  for (const interval of dayIntervals) {
    const startMs = new Date(interval.interval_start).getTime()
    const endMs = new Date(interval.interval_end).getTime()
    if (startMs < schedWinStart || startMs >= schedWinEnd) continue
    if (!isIntervalActive(interval, dayActiveWindows)) continue

    const intervalSecs = endMs > startMs ? Math.round((endMs - startMs) / 1000) : 300
    total += intervalSecs

    for (const a of interval.apps ?? []) {
      const cat = ctx.categoryMap.get(a.app.toLowerCase())
      if (cat === 'ignore') continue

      const secs = Math.min(a.seconds, intervalSecs)
      const resolved: UserAppUsage['category'] = cat === 'productive' ? 'productive'
        : cat === 'unproductive' ? 'unproductive'
          : 'uncategorized'

      if (resolved === 'productive') productive += secs
      else if (resolved === 'unproductive') unproductive += secs
      else uncategorized += secs

      const existing = appUsage.get(a.app)
      if (existing) existing.seconds += secs
      else appUsage.set(a.app, { app: a.app, seconds: secs, category: resolved })
    }
  }

  return { programation, scheduledMinutes, productive, unproductive, uncategorized, total, appUsage }
}

// Prepara todo lo que no depende de un usuario puntual (catálogos, logs de app-usage y de
// estado agrupados por fecha) — compartido entre computeProductivityRange y
// computeProductivityDaily para no duplicar los mismos 5 fetches.
async function loadRangeContext(users: AppUser[], dateFrom: string, dateTo: string) {
  const dates = dateRange(dateFrom, dateTo)

  const bogotaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const todayStr = bogotaNow.toLocaleDateString('sv')
  const nowMs = bogotaNow.getTime()

  const [schedules, programations, rawLogs, categorizationApps, rotations, { machinesByUser, stateByMachine }, lunchSkips] =
    await Promise.all([
      getSchedules(),
      getProgramations(),
      getRawAppUsageLogsRange(dateFrom, dateTo),
      getCategorizationApps(),
      getAllRotations(),
      loadMachinesAndStateLogs(users),
      getLunchSkips(dateFrom, dateTo),
    ])

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))
  const lunchSkipDates = new Set(lunchSkips.map(ls => `${ls.appuser_id}_${ls.date.slice(0, 10)}`))

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

  const ctx: DayContext = { schedules, rotations, programations, categoryMap, todayStr, nowMs, lunchSkipDates }
  return { dates, ctx, machinesByUser, logsByMachineByDate, stateByMachineByDate }
}

/**
 * Calcula productividad por usuario acumulada sobre [dateFrom, dateTo] (inclusive; un solo día
 * si dateFrom === dateTo). Suma los totales de cada día en vez de promediar porcentajes. Un día
 * sin `programation` para el usuario no aporta a la suma (mismo criterio que ya aplicaba por
 * día), para que un rango con días libres no infle el porcentaje final.
 */
export async function computeProductivityRange(
  users: AppUser[],
  dateFrom: string,
  dateTo: string,
): Promise<UserProductivity[]> {
  const { dates, ctx, machinesByUser, logsByMachineByDate, stateByMachineByDate } =
    await loadRangeContext(users, dateFrom, dateTo)

  return users.map(user => {
    const userId = Number(user.id)
    const userMachines = machinesByUser.get(userId) ?? []
    const primaryMachine = userMachines[0]

    let productive = 0, unproductive = 0, uncategorized = 0, total = 0, scheduledMinutes = 0
    let lastProgramation: Programation | undefined
    const appMap = new Map<string, UserAppUsage>()

    for (const date of dates) {
      const day = computeUserDayStats(
        userId, userMachines, date, ctx,
        logsByMachineByDate.get(date)!, stateByMachineByDate.get(date)!,
      )
      if (day.scheduledMinutes === 0) continue
      if (day.programation) lastProgramation = day.programation

      scheduledMinutes += day.scheduledMinutes
      productive += day.productive
      unproductive += day.unproductive
      uncategorized += day.uncategorized
      total += day.total
      for (const [app, usage] of day.appUsage) {
        const existing = appMap.get(app)
        if (existing) existing.seconds += usage.seconds
        else appMap.set(app, { ...usage })
      }
    }

    const categorized = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60
    const effective = productive + uncategorized * UNCATEGORIZED_CREDIT

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

export interface DailyProductivity {
  date: string
  productiveSeconds: number
  unproductiveSeconds: number
  uncategorizedSeconds: number
  totalSeconds: number
  scheduledMinutes: number
  overallProductivityPercent: number
}

/**
 * Desglose día por día (para la curva de productividad) de uno o varios usuarios sobre
 * [dateFrom, dateTo] — varios usuarios se combinan en una sola curva (uso: "global"/"por grupo").
 * A diferencia de computeProductivityRange, nunca salta un día — uno sin horario/actividad
 * aporta cero, para que el gráfico tenga el eje de fechas continuo.
 *
 * `overallProductivityPercent` y los segundos (productiveSeconds, etc.) son PROMEDIOS — suma del
 * día ÷ cantidad de usuarios con turno ese día, no la suma cruda del grupo — así un día con menos
 * gente programada no muestra menos horas solo por tener menos gente, y un usuario muy productivo
 * con poca jornada no pesa más que uno con jornada larga.
 */
export async function computeProductivityDaily(
  users: AppUser[],
  dateFrom: string,
  dateTo: string,
): Promise<DailyProductivity[]> {
  const { dates, ctx, machinesByUser, logsByMachineByDate, stateByMachineByDate } =
    await loadRangeContext(users, dateFrom, dateTo)

  return dates.map(date => {
    let productive = 0, unproductive = 0, uncategorized = 0, total = 0, scheduledMinutes = 0
    let percentSum = 0, scheduledUserCount = 0

    for (const user of users) {
      const userId = Number(user.id)
      const userMachines = machinesByUser.get(userId) ?? []
      const day = computeUserDayStats(
        userId, userMachines, date, ctx,
        logsByMachineByDate.get(date)!, stateByMachineByDate.get(date)!,
      )
      productive += day.productive
      unproductive += day.unproductive
      uncategorized += day.uncategorized
      total += day.total
      scheduledMinutes += day.scheduledMinutes

      if (day.scheduledMinutes > 0) {
        const userScheduledSecs = day.scheduledMinutes * 60
        const userEffective = day.productive + day.uncategorized * UNCATEGORIZED_CREDIT
        percentSum += Math.min(100, (userEffective / userScheduledSecs) * 100)
        scheduledUserCount++
      }
    }

    return {
      date,
      productiveSeconds: scheduledUserCount > 0 ? Math.round(productive / scheduledUserCount) : 0,
      unproductiveSeconds: scheduledUserCount > 0 ? Math.round(unproductive / scheduledUserCount) : 0,
      uncategorizedSeconds: scheduledUserCount > 0 ? Math.round(uncategorized / scheduledUserCount) : 0,
      totalSeconds: scheduledUserCount > 0 ? Math.round(total / scheduledUserCount) : 0,
      scheduledMinutes: scheduledUserCount > 0 ? Math.round(scheduledMinutes / scheduledUserCount) : 0,
      overallProductivityPercent: scheduledUserCount > 0 ? Math.round(percentSum / scheduledUserCount) : 0,
    }
  })
}
