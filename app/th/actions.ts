'use server'
import { AbsenceStatus } from '@/types/AppUser'
import { getappuser } from '../app/actions'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const setAbsenceStatus = async (userId: number, status: AbsenceStatus): Promise<void> => {
  await fetch(`${API_URL}/appuser/update/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ absence_status: status }),
  })
}

import { findAsignedMachines } from '../computers/actions'
import { getSchedules, getProgramations, getStateLog, getRawAppUsageLogs } from '../time/actions'
import { getCategorizationApps } from '../supervisors/categorization-actions'
import { AppUser, AppUsageLog } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation } from '@/types/Schedules'
import { StateLog, StateLogCategory, StateLogState } from '@/types/StateLog'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const buildActiveWindows = (stateLogs: StateLog[]): Array<{ start: number; end: number }> => {
  const sorted = [...stateLogs].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const windows: Array<{ start: number; end: number }> = []
  for (let i = 0; i < sorted.length; i++) {
    if (Number(sorted[i].category) !== StateLogCategory.ACTIVE) continue
    const start = new Date(sorted[i].timestamp).getTime()
    const end   = i + 1 < sorted.length
      ? new Date(sorted[i + 1].timestamp).getTime()
      : Infinity
    windows.push({ start, end })
  }
  return windows
}

const isIntervalActive = (log: AppUsageLog, windows: Array<{ start: number; end: number }>): boolean => {
  if (windows.length === 0) return true
  const mid = (new Date(log.interval_start).getTime() + new Date(log.interval_end).getTime()) / 2
  return windows.some(w => mid >= w.start && mid < w.end)
}

// Carga las máquinas y state logs de una lista de usuarios en dos rondas paralelas.
const loadMachinesAndStateLogs = async (
  users: AppUser[],
  date: string
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
        const logs: StateLog[] = (Array.isArray(raw) ? raw : [])
          .filter((l: StateLog) => l.timestamp?.slice(0, 10) === date)
        return { machineId: Number(machine.id), logs }
      } catch {
        return { machineId: Number(machine.id), logs: [] as StateLog[] }
      }
    })
  )
  const stateByMachine = new Map(stateLogResults.map(r => [r.machineId, r.logs]))

  return { machinesByUser, stateByMachine }
}

// ─── Malla horaria ────────────────────────────────────────────────────────────

export interface UserScheduleRow {
  user: AppUser
  days: Record<string, { programation: Programation; scheduleId: number } | null>
}

export const getUserSchedules = async (): Promise<{ rows: UserScheduleRow[]; dayKeys: string[] }> => {
  const [users, schedules, programations] = await Promise.all([
    getappuser(),
    getSchedules(),
    getProgramations(),
  ])

  const rows: UserScheduleRow[] = users.map(user => {
    const days: UserScheduleRow['days'] = {}
    for (const key of DAY_KEYS) {
      const s = schedules.find(sc => sc.appuser_id === user.id && sc.day_of_week === key)
      days[key] = s
        ? (programations.find(p => p.id === s.programation_id)
            ? { programation: programations.find(p => p.id === s.programation_id)!, scheduleId: s.id! }
            : null)
        : null
    }
    return { user, days }
  })

  return { rows, dayKeys: [...DAY_KEYS] }
}

// ─── Llegadas tarde ───────────────────────────────────────────────────────────

export interface LateArrival {
  user: AppUser
  scheduledStart: string
  firstActivity: string | null
  minutesLate: number
  status: 'on_time' | 'late' | 'absent'
}

export const getLateArrivals = async (date: string): Promise<LateArrival[]> => {
  const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]

  const [users, schedules, programations] = await Promise.all([
    getappuser(),
    getSchedules(),
    getProgramations(),
  ])

  const scheduledUsers = users.filter(user =>
    schedules.some(s => Number(s.appuser_id) === Number(user.id) && s.day_of_week === dayKey)
  )

  const { machinesByUser, stateByMachine } = await loadMachinesAndStateLogs(scheduledUsers, date)

  return scheduledUsers.map(user => {
    const userId       = Number(user.id)
    const userSchedule = schedules.find(s => Number(s.appuser_id) === userId && s.day_of_week === dayKey)
    const programation = programations.find(p => p.id === userSchedule?.programation_id)
    const scheduledStart = programation?.start_day ?? '08:00'
    const absent = { user, scheduledStart, firstActivity: null, minutesLate: 0, status: 'absent' as const }

    const userMachines = machinesByUser.get(userId) ?? []
    if (!userMachines.length) return absent

    // Toma el primer log activo (no OFFLINE) de cualquier máquina del usuario
    const allLogs: StateLog[] = []
    for (const m of userMachines) {
      allLogs.push(...(stateByMachine.get(Number(m.id)) ?? []))
    }

    const activeLogs = allLogs
      .filter(l => {
        // StateLogState.OFFLINE = 6; el API devuelve el valor numérico
        const s = Number(l.state)
        return s !== StateLogState.OFFLINE
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (activeLogs.length === 0) return absent

    const firstTime = new Date(activeLogs[0].timestamp)

    // Hora Colombia explícita, independiente del timezone del servidor
    const firstColTime = firstTime.toLocaleTimeString('es-CO', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Bogota',
    })

    // Comparar con hora programada usando minutos desde medianoche Colombia
    const [schedH, schedM] = scheduledStart.split(':').map(Number)
    const schedMinutes = schedH * 60 + schedM
    const [colH, colM] = firstColTime.split(':').map(Number)
    const firstMinutes = colH * 60 + colM

    const minutesLate = firstMinutes - schedMinutes

    return {
      user,
      scheduledStart,
      firstActivity: firstColTime,
      minutesLate:   Math.max(0, minutesLate),
      status:        minutesLate > 5 ? ('late' as const) : ('on_time' as const),
    }
  })
}

// ─── Productividad TH ─────────────────────────────────────────────────────────

export interface THProductivity {
  user: AppUser
  programation?: Programation
  scheduledMinutes: number
  productiveSeconds: number
  unproductiveSeconds: number
  uncategorizedSeconds: number
  totalSeconds: number
  appProductivityPercent: number
  workCompliancePercent: number
  overallProductivityPercent: number
}

export const getTHProductivityReport = async (date: string): Promise<THProductivity[]> => {
  const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]

  // Si la fecha consultada es "hoy", la ventana de jornada no puede extenderse más allá del
  // momento actual: evita contar intervalos con timestamp futuro (ej. por desincronización de
  // reloj en el equipo monitoreado).
  const bogotaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const nowMs     = date === bogotaNow.toLocaleDateString('sv') ? bogotaNow.getTime() : Infinity

  const [users, schedules, programations, rawLogs, categorizationApps] = await Promise.all([
    getappuser(),
    getSchedules(),
    getProgramations(),
    getRawAppUsageLogs(date),
    getCategorizationApps(),
  ])

  const { machinesByUser, stateByMachine } = await loadMachinesAndStateLogs(users, date)

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))

  const logsByMachine = new Map<number, AppUsageLog[]>()
  for (const log of rawLogs) {
    const cid = Number(log.computer_id)
    if (!logsByMachine.has(cid)) logsByMachine.set(cid, [])
    logsByMachine.get(cid)!.push(log)
  }

  return users.map(user => {
    const userId       = Number(user.id)
    const userMachines = machinesByUser.get(userId) ?? []
    const userSchedule = schedules.find(s => Number(s.appuser_id) === userId && s.day_of_week === dayKey)
    const programation = userSchedule ? programations.find(p => p.id === userSchedule.programation_id) : undefined
    const scheduledMinutes = programation ? scheduledWorkMinutes(programation) : 0

    const empty: THProductivity = {
      user, programation, scheduledMinutes,
      productiveSeconds: 0, unproductiveSeconds: 0, uncategorizedSeconds: 0, totalSeconds: 0,
      appProductivityPercent: 0, workCompliancePercent: 0, overallProductivityPercent: 0,
    }

    if (!userMachines.length) return empty

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

        if (cat === 'productive')        productive    += secs
        else if (cat === 'unproductive') unproductive  += secs
        else                             uncategorized += secs
      }
    }

    // totalIntervalSecs = suma de duraciones de intervalos activos (bloques de ~5 min)
    const total         = totalIntervalSecs
    const categorized   = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60
    // efectivo: productivo 100% + sin-categoría 30% (beneficio de la duda al usuario)
    const effective     = productive + uncategorized * 0.3

    return {
      user, programation, scheduledMinutes,
      productiveSeconds:    Math.round(productive),
      unproductiveSeconds:  Math.round(unproductive),
      uncategorizedSeconds: Math.round(uncategorized),
      totalSeconds:         Math.round(total),
      appProductivityPercent:     categorized > 0   ? Math.round((productive / categorized)  * 100) : 0,
      workCompliancePercent:      scheduledSecs > 0 ? Math.min(100, Math.round((total      / scheduledSecs) * 100)) : 0,
      overallProductivityPercent: scheduledSecs > 0 ? Math.min(100, Math.round((effective  / scheduledSecs) * 100)) : 0,
    }
  })
}
