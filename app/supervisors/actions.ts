'use server'
import { getappuser } from '../app/actions'
import { getMachines } from '../computers/actions'
import { getSchedules, getProgramations, getStateLog, getRawAppUsageLogs } from '../time/actions'
import { getCategorizationApps } from './categorization-actions'
import { AppUser, AppUsageLog, FlatAppUsageLog } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation } from '@/types/Schedules'
import { StateLog, StateLogCategory } from '@/types/StateLog'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export interface UserConnectionStatus {
  user: AppUser
  isConnected: boolean
  shouldBeConnected: boolean
  machine?: Machine
  programation?: Programation
  startTime?: string
  endTime?: string
}

export const getUserConnectionStatuses = async (): Promise<UserConnectionStatus[]> => {
  const [users, machines, schedules, programations] = await Promise.all([
    getappuser(),
    getMachines(),
    getSchedules(),
    getProgramations(),
  ])

  const now = new Date()
  const todayKey = DAY_KEYS[now.getDay()]
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return users.map(user => {
    const userScheduleToday = schedules.find(
      s => s.appuser_id === user.id && s.day_of_week === todayKey
    )

    let shouldBeConnected = false
    let programation: Programation | undefined
    let startTime: string | undefined
    let endTime: string | undefined

    if (userScheduleToday) {
      programation = programations.find(p => p.id === userScheduleToday.programation_id)
      if (programation) {
        startTime = programation.start_day
        endTime = programation.end_day
        shouldBeConnected =
          currentTime >= programation.start_day &&
          (!programation.end_day || currentTime <= programation.end_day)
      }
    }

    const machine = machines.find(m => Number(m.appuser_id) === user.id)
    const isConnected = !!(machine && (machine.isAlive || machine.alive))

    return { user, isConnected, shouldBeConnected, machine, programation, startTime, endTime }
  })
}

export type AppUsageEntry = FlatAppUsageLog

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

  const [users, machines, schedules, programations, rawLogs, categorizationApps] =
    await Promise.all([
      getappuser(),
      getMachines(),
      getSchedules(),
      getProgramations(),
      getRawAppUsageLogs(date),
      getCategorizationApps(),
    ])

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))

  // Agrupar intervalos de uso por máquina
  const logsByMachine = new Map<number, AppUsageLog[]>()
  for (const log of rawLogs) {
    const cid = Number(log.computer_id)
    if (!logsByMachine.has(cid)) logsByMachine.set(cid, [])
    logsByMachine.get(cid)!.push(log)
  }

  // Obtener la máquina de cada usuario
  const machineByUser = new Map<number, Machine>()
  for (const user of users) {
    const m = machines.find(m => Number(m.appuser_id) === Number(user.id))
    if (m?.id != null) machineByUser.set(Number(user.id), m)
  }

  // Cargar state logs de todos los usuarios con máquina en paralelo
  const stateLogResults = await Promise.all(
    [...machineByUser.entries()].map(async ([userId, machine]) => {
      try {
        const raw = await getStateLog(userId, Number(machine.id))
        const logs: StateLog[] = (Array.isArray(raw) ? raw : [])
          .filter((l: StateLog) => l.timestamp?.startsWith(date))
        return { machineId: Number(machine.id), logs }
      } catch {
        return { machineId: Number(machine.id), logs: [] }
      }
    })
  )
  const stateByMachine = new Map(stateLogResults.map(r => [r.machineId, r.logs]))

  return users.map(user => {
    const machine = machineByUser.get(Number(user.id))
    const userSchedule = schedules.find(s => Number(s.appuser_id) === Number(user.id) && s.day_of_week === dayKey)
    const programation = userSchedule ? programations.find(p => p.id === userSchedule.programation_id) : undefined
    const scheduledMinutes = programation ? scheduledWorkMinutes(programation) : 0
    console.log(machine, userSchedule, programation, scheduledMinutes);


    const empty: UserProductivity = {
      user, machine, programation, scheduledMinutes,
      productiveSeconds: 0, unproductiveSeconds: 0, uncategorizedSeconds: 0, totalSeconds: 0,
      appProductivityPercent: 0, workCompliancePercent: 0, overallProductivityPercent: 0,
      topApps: [],
    }

    if (!machine) return empty

    const machineId = Number(machine.id)
    const intervals = logsByMachine.get(machineId) ?? []
    if (!intervals.length) return empty

    const activeWindows = buildActiveWindows(stateByMachine.get(machineId) ?? [])

    let productive = 0, unproductive = 0, uncategorized = 0
    const appMap = new Map<string, UserAppUsage>()

    for (const interval of intervals) {
      if (!isIntervalActive(interval, activeWindows)) continue
      for (const a of interval.apps ?? []) {
        const cat = categoryMap.get(a.app.toLowerCase())
        const resolved: UserAppUsage['category'] = cat === 'productive' ? 'productive'
          : cat === 'unproductive' ? 'unproductive'
            : 'uncategorized'

        if (resolved === 'productive') productive += a.seconds
        else if (resolved === 'unproductive') unproductive += a.seconds
        else uncategorized += a.seconds

        const existing = appMap.get(a.app)
        if (existing) existing.seconds += a.seconds
        else appMap.set(a.app, { app: a.app, seconds: a.seconds, category: resolved })
      }
    }

    const total = productive + unproductive + uncategorized
    const categorized = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60

    const appProd = categorized > 0 ? Math.round((productive / categorized) * 100) : 0
    const compliance = scheduledSecs > 0 ? Math.min(100, Math.round((total / scheduledSecs) * 100)) : 0
    const overall = scheduledSecs > 0 ? Math.min(100, Math.round((productive / scheduledSecs) * 100)) : 0

    const topApps = [...appMap.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 8)

    return {
      user, machine, programation, scheduledMinutes,
      productiveSeconds: Math.round(productive),
      unproductiveSeconds: Math.round(unproductive),
      uncategorizedSeconds: Math.round(uncategorized),
      totalSeconds: Math.round(total),
      appProductivityPercent: appProd,
      workCompliancePercent: compliance,
      overallProductivityPercent: overall,
      topApps,
    }
  })
}