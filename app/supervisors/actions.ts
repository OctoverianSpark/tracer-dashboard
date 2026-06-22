'use server'
import { getappuser } from '../app/actions'
import { getMachines, findAsignedMachines } from '../computers/actions'
import { getSchedules, getProgramations, getStateLog, getRawAppUsageLogs } from '../time/actions'
import { getCategorizationApps } from './categorization-actions'
import { AppUser, AppUsageLog } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation } from '@/types/Schedules'
import { StateLog, StateLogCategory } from '@/types/StateLog'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export interface UserConnectionStatus {
  user: AppUser
  wsConnected: boolean      // WebSocket activo ahora mismo
  isConnected: boolean      // wsConnected O tiene tiempo registrado hoy
  shouldBeConnected: boolean
  machine?: Machine
  programation?: Programation
  startTime?: string
  endTime?: string
  todaySeconds: number      // segundos de uso de apps contados hoy
}

export const getUserConnectionStatuses = async (): Promise<UserConnectionStatus[]> => {
  // All time logic uses Bogotá (UTC-5) — the server may run in a different timezone
  const bogota   = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const todayStr = bogota.toLocaleDateString('sv')   // YYYY-MM-DD
  const nowMs    = bogota.getTime()

  const [users, machines, schedules, programations, rawLogs] = await Promise.all([
    getappuser(),
    getMachines(),
    getSchedules(),
    getProgramations(),
    getRawAppUsageLogs(todayStr),
  ])

  // Segundos de uso por machine_id para hoy: se suma la duración real de cada intervalo
  // (interval_end - interval_start), no los `seconds` reportados por app dentro del log —
  // ese campo no está acotado a la duración del intervalo y si se registran varias apps en
  // el mismo bloque de tiempo, sumarlas directamente multiplica el total muy por encima del
  // tiempo realmente transcurrido. Se descartan además intervalos con interval_start posterior
  // al momento actual (reloj desincronizado en el equipo monitoreado).
  const secondsByMachine = new Map<number, number>()
  for (const log of rawLogs) {
    const startMs = new Date(log.interval_start).getTime()
    if (startMs > nowMs) continue
    const endMs = new Date(log.interval_end).getTime()
    const secs  = endMs > startMs ? Math.round((endMs - startMs) / 1000) : 300
    const cid   = Number(log.computer_id)
    secondsByMachine.set(cid, (secondsByMachine.get(cid) ?? 0) + secs)
  }

  // Máquinas por usuario
  const machinesPerUser = await Promise.all(
    users.map(u =>
      findAsignedMachines(Number(u.id))
        .then(ms => ({ userId: Number(u.id), machines: ms }))
        .catch(() => ({
          userId: Number(u.id),
          machines: machines.filter(m => Number(m.appuser_id) === Number(u.id)),
        }))
    )
  )
  const machinesByUser = new Map(machinesPerUser.map(r => [r.userId, r.machines]))

  // getMachines() (/machines/list) devuelve isAlive/alive correctamente.
  // findAsignedMachines() (/machines?appuser_id=...) puede no incluirlos.
  // Construimos un mapa de alive status por id y por serial para enriquecer.
  const aliveById     = new Map<number, boolean>()
  const aliveBySerial = new Map<string, boolean>()
  for (const m of machines) {
    const live = !!(m.isAlive || m.alive)
    if (m.id != null) aliveById.set(Number(m.id), live)
    aliveBySerial.set(m.serial_number, live)
  }

  const todayKey    = DAY_KEYS[bogota.getDay()]
  const currentTime = `${bogota.getHours().toString().padStart(2, '0')}:${bogota.getMinutes().toString().padStart(2, '0')}`

  return users.map(user => {
    const userScheduleToday = schedules.find(
      s => Number(s.appuser_id) === Number(user.id) && s.day_of_week === todayKey
    )

    let shouldBeConnected = false
    let programation: Programation | undefined
    let startTime: string | undefined
    let endTime: string | undefined

    if (userScheduleToday) {
      programation = programations.find(p => p.id === userScheduleToday.programation_id)
      if (programation) {
        startTime = programation.start_day
        endTime   = programation.end_day
        shouldBeConnected =
          !user.on_vacation &&
          currentTime >= programation.start_day &&
          (!programation.end_day || currentTime <= programation.end_day)
      }
    }

    const userMachines = machinesByUser.get(Number(user.id)) ?? []
    // Enriquecer con alive status del endpoint autoritativo (/machines/list)
    const enriched = userMachines.map(m => {
      const live = aliveById.get(Number(m.id)) ?? aliveBySerial.get(m.serial_number) ?? !!(m.isAlive || m.alive)
      return { ...m, isAlive: live, alive: live }
    })

    const machine      = enriched.find(m => m.isAlive || m.alive) ?? enriched[0]
    const wsConnected  = !!(machine && (machine.isAlive || machine.alive))
    const todaySeconds = enriched.reduce((sum, m) => sum + (secondsByMachine.get(Number(m.id)) ?? 0), 0)
    const isConnected  = wsConnected || todaySeconds > 0

    return { user, wsConnected, isConnected, shouldBeConnected, machine, programation, startTime, endTime, todaySeconds }
  })
}


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

const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const scheduledWorkMinutes = (prog: Programation): number => {
  if (!prog.start_day || !prog.end_day) return 0
  let total = timeToMinutes(prog.end_day) - timeToMinutes(prog.start_day)
  if (prog.start_lunch && prog.end_lunch) {
    total -= timeToMinutes(prog.end_lunch) - timeToMinutes(prog.start_lunch)
  }
  return Math.max(0, total)
}

// Construye ventanas de tiempo donde el estado era ACTIVE para un día dado.
// Cada StateLog marca el inicio de un nuevo estado; el siguiente log marca su fin.
const buildActiveWindows = (stateLogs: StateLog[]): Array<{ start: number; end: number }> => {
  const sorted = [...stateLogs].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const windows: Array<{ start: number; end: number }> = []
  for (let i = 0; i < sorted.length; i++) {
    if (Number(sorted[i].category) !== StateLogCategory.ACTIVE) continue
    const start = new Date(sorted[i].timestamp).getTime()
    const end = i + 1 < sorted.length
      ? new Date(sorted[i + 1].timestamp).getTime()
      : Infinity
    windows.push({ start, end })
  }
  return windows
}

// Devuelve true si el punto medio del intervalo de app cae dentro de una ventana activa.
const isIntervalActive = (log: AppUsageLog, windows: Array<{ start: number; end: number }>): boolean => {
  if (windows.length === 0) return true // sin datos de estado → contar todo
  const mid = (new Date(log.interval_start).getTime() + new Date(log.interval_end).getTime()) / 2
  return windows.some(w => mid >= w.start && mid < w.end)
}

export const getProductivityReport = async (date: string): Promise<UserProductivity[]> => {
  const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]

  // Si la fecha consultada es "hoy", la ventana de jornada no puede extenderse más allá del
  // momento actual: evita contar intervalos con timestamp futuro (ej. por desincronización de
  // reloj en el equipo monitoreado).
  const bogotaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const nowMs     = date === bogotaNow.toLocaleDateString('sv') ? bogotaNow.getTime() : Infinity

  // Ronda 1: datos globales que no dependen del usuario
  const [users, schedules, programations, rawLogs, categorizationApps] = await Promise.all([
    getappuser(),
    getSchedules(),
    getProgramations(),
    getRawAppUsageLogs(date),
    getCategorizationApps(),
  ])

  // Ronda 2: máquinas asignadas a cada usuario (endpoint correcto por usuario)
  const machinesPerUser = await Promise.all(
    users.map(u =>
      findAsignedMachines(Number(u.id))
        .then(ms => ({ userId: Number(u.id), machines: ms }))
        .catch(() => ({ userId: Number(u.id), machines: [] as Machine[] }))
    )
  )
  const machinesByUser = new Map(machinesPerUser.map(r => [r.userId, r.machines]))

  // Agrupar intervalos de app por machineId
  const logsByMachine = new Map<number, AppUsageLog[]>()
  for (const log of rawLogs) {
    const cid = Number(log.computer_id)
    if (!logsByMachine.has(cid)) logsByMachine.set(cid, [])
    logsByMachine.get(cid)!.push(log)
  }

  // Pares usuario-máquina para cargar state logs
  const pairs: Array<{ userId: number; machine: Machine }> = []
  for (const [userId, machines] of machinesByUser) {
    for (const m of machines) {
      if (m.id != null) pairs.push({ userId, machine: m })
    }
  }

  // Ronda 3: state logs para todos los pares en paralelo
  const stateLogResults = await Promise.all(
    pairs.map(async ({ userId, machine }) => {
      try {
        const raw = await getStateLog(userId, Number(machine.id))
        const logs: StateLog[] = (Array.isArray(raw) ? raw : [])
          .filter((l: StateLog) => l.timestamp?.slice(0, 10) === date)
        return { machineId: Number(machine.id), logs }
      } catch {
        return { machineId: Number(machine.id), logs: [] as StateLog[] }
      }
    })
  )
  const stateByMachine = new Map(stateLogResults.map(r => [r.machineId, r.logs]))

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))

  return users.map(user => {
    const userId = Number(user.id)
    const userMachines = machinesByUser.get(userId) ?? []
    const userSchedule = schedules.find(s => Number(s.appuser_id) === userId && s.day_of_week === dayKey)
    const programation = userSchedule ? programations.find(p => p.id === userSchedule.programation_id) : undefined
    const scheduledMinutes = programation ? scheduledWorkMinutes(programation) : 0
    const primaryMachine = userMachines[0]

    const empty: UserProductivity = {
      user, machine: primaryMachine, programation, scheduledMinutes,
      productiveSeconds: 0, unproductiveSeconds: 0, uncategorizedSeconds: 0, totalSeconds: 0,
      appProductivityPercent: 0, workCompliancePercent: 0, overallProductivityPercent: 0,
      topApps: [],
    }

    if (!userMachines.length) return empty

    // Acumular intervalos y ventanas activas de TODAS las máquinas del usuario
    const allIntervals: AppUsageLog[] = []
    const allActiveWindows: Array<{ start: number; end: number }> = []
    for (const m of userMachines) {
      const mid = Number(m.id)
      allIntervals.push(...(logsByMachine.get(mid) ?? []))
      allActiveWindows.push(...buildActiveWindows(stateByMachine.get(mid) ?? []))
    }
    if (!allIntervals.length) return empty

    // Ventana de jornada laboral — descarta intervalos fuera del horario programado
    const schedWinStart = programation?.start_day
      ? new Date(`${date}T${programation.start_day}:00`).getTime()
      : new Date(`${date}T06:00:00`).getTime()
    const schedWinEnd = Math.min(
      programation?.end_day
        ? new Date(`${date}T${programation.end_day}:00`).getTime()
        : new Date(`${date}T23:00:00`).getTime(),
      nowMs,
    )

    let productive = 0, unproductive = 0, uncategorized = 0, totalIntervalSecs = 0
    const appMap = new Map<string, UserAppUsage>()

    for (const interval of allIntervals) {
      const startMs = new Date(interval.interval_start).getTime()
      const endMs   = new Date(interval.interval_end).getTime()
      if (startMs < schedWinStart || startMs >= schedWinEnd) continue
      if (!isIntervalActive(interval, allActiveWindows)) continue

      const intervalSecs = endMs > startMs ? Math.round((endMs - startMs) / 1000) : 300
      totalIntervalSecs += intervalSecs

      for (const a of interval.apps ?? []) {
        const cat = categoryMap.get(a.app.toLowerCase())
        if (cat === 'ignore') continue

        // Cap defensivo: los segundos de una app no pueden superar la duración del intervalo
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

    // totalIntervalSecs = suma de duraciones de intervalos activos (unidad: bloques de ~5 min)
    const total         = totalIntervalSecs
    const categorized   = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60
    // efectivo: productivo 100% + sin-categoría 30% (beneficio de la duda al usuario)
    const effective = productive + uncategorized * 0.3

    const appProd    = categorized > 0   ? Math.round((productive / categorized)  * 100) : 0
    const compliance = scheduledSecs > 0 ? Math.min(100, Math.round((total      / scheduledSecs) * 100)) : 0
    const overall    = scheduledSecs > 0 ? Math.min(100, Math.round((effective   / scheduledSecs) * 100)) : 0

    return {
      user, machine: primaryMachine, programation, scheduledMinutes,
      productiveSeconds: Math.round(productive),
      unproductiveSeconds: Math.round(unproductive),
      uncategorizedSeconds: Math.round(uncategorized),
      totalSeconds: Math.round(total),
      appProductivityPercent: appProd,
      workCompliancePercent: compliance,
      overallProductivityPercent: overall,
      topApps: [...appMap.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 8),
    }
  })
}