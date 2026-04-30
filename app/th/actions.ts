'use server'
import { getappuser } from '../app/actions'
import { getMachines } from '../computers/actions'
import { getSchedules, getProgramations, getStateLog } from '../time/actions'
import { getCategorizationApps } from '../supervisors/categorization-actions'
import { AppUser } from '@/types/AppUser'
import { Programation } from '@/types/Schedules'

const API_URL = process.env.NEXT_PUBLIC_API_URL
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

const fetchUsageLogs = async (date: string) => {
  const res  = await fetch(`${API_URL}/app-usage-logs/by-date?from=${date}T00:00:00&to=${date}T23:59:59`)
  const data = await res.json()
  return Array.isArray(data) ? data as { app: string; seconds: number; computer_id: number }[] : []
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
  const dateObj = new Date(`${date}T12:00:00`)
  const dayKey  = DAY_KEYS[dateObj.getDay()]

  const [users, machines, schedules, programations] = await Promise.all([
    getappuser(),
    getMachines(),
    getSchedules(),
    getProgramations(),
  ])

  const scheduledUsers = users.filter(user =>
    schedules.some(s => s.appuser_id === user.id && s.day_of_week === dayKey)
  )

  return Promise.all(
    scheduledUsers.map(async user => {
      const userSchedule = schedules.find(s => s.appuser_id === user.id && s.day_of_week === dayKey)
      const programation = programations.find(p => p.id === userSchedule?.programation_id)
      const scheduledStart = programation?.start_day ?? '08:00'

      const machine = machines.find(m => Number(m.appuser_id) === user.id)
      const absent  = { user, scheduledStart, firstActivity: null, minutesLate: 0, status: 'absent' as const }

      if (!machine?.id) return absent

      let logs: any[] = []
      try {
        logs = await getStateLog(user.id!, machine.id)
      } catch {
        return absent
      }

      const dateLogs   = Array.isArray(logs) ? logs.filter(l => l.timestamp?.startsWith(date)) : []
      const activeLogs = dateLogs.filter(l => {
        const s = l.state?.toString().toUpperCase()
        return s !== 'OFFLINE' && s !== '5'
      })

      if (activeLogs.length === 0) return absent

      const firstTime = new Date(activeLogs[0].timestamp)
      const [schedH, schedM] = scheduledStart.split(':').map(Number)
      const scheduled = new Date(firstTime)
      scheduled.setHours(schedH, schedM, 0, 0)

      const minutesLate = Math.round((firstTime.getTime() - scheduled.getTime()) / 60000)

      return {
        user,
        scheduledStart,
        firstActivity: firstTime.toTimeString().slice(0, 5),
        minutesLate:   Math.max(0, minutesLate),
        status:        minutesLate > 5 ? ('late' as const) : ('on_time' as const),
      }
    })
  )
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
  const dateObj = new Date(`${date}T12:00:00`)
  const dayKey  = DAY_KEYS[dateObj.getDay()]

  const [users, machines, schedules, programations, usageLogs, categorizationApps] =
    await Promise.all([
      getappuser(),
      getMachines(),
      getSchedules(),
      getProgramations(),
      fetchUsageLogs(date),
      getCategorizationApps(),
    ])

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))

  return users.map(user => {
    const machine      = machines.find(m => Number(m.appuser_id) === user.id)
    const userSchedule = schedules.find(s => s.appuser_id === user.id && s.day_of_week === dayKey)
    const programation = userSchedule ? programations.find(p => p.id === userSchedule.programation_id) : undefined
    const scheduledMinutes = programation ? scheduledWorkMinutes(programation) : 0

    const empty: THProductivity = {
      user, programation, scheduledMinutes,
      productiveSeconds: 0, unproductiveSeconds: 0, uncategorizedSeconds: 0, totalSeconds: 0,
      appProductivityPercent: 0, workCompliancePercent: 0, overallProductivityPercent: 0,
    }

    if (!machine?.id) return empty

    const userLogs = usageLogs.filter(l => Number(l.computer_id) === machine.id)
    if (userLogs.length === 0) return empty

    let productive = 0, unproductive = 0, uncategorized = 0

    for (const l of userLogs) {
      const cat = categoryMap.get(l.app.toLowerCase())
      if (cat === 'productive')     productive    += l.seconds
      else if (cat === 'unproductive') unproductive += l.seconds
      else                          uncategorized += l.seconds
    }

    const total         = productive + unproductive + uncategorized
    const categorized   = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60

    return {
      user, programation, scheduledMinutes,
      productiveSeconds:    Math.round(productive),
      unproductiveSeconds:  Math.round(unproductive),
      uncategorizedSeconds: Math.round(uncategorized),
      totalSeconds:         Math.round(total),
      appProductivityPercent:     categorized > 0 ? Math.round((productive / categorized) * 100) : 0,
      workCompliancePercent:      scheduledSecs > 0 ? Math.min(100, Math.round((total / scheduledSecs) * 100)) : 0,
      overallProductivityPercent: scheduledSecs > 0 ? Math.min(100, Math.round((productive / scheduledSecs) * 100)) : 0,
    }
  })
}
