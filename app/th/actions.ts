'use server'
import { getappuser } from '../app/actions'
import { getMachines } from '../computers/actions'
import { getSchedules, getProgramations, getStateLog } from '../time/actions'
import { AppUser } from '@/types/AppUser'
import { Programation } from '@/types/Schedules'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

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
  const dayKey = DAY_KEYS[dateObj.getDay()]

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
      const absent = { user, scheduledStart, firstActivity: null, minutesLate: 0, status: 'absent' as const }

      if (!machine?.id) return absent

      let logs: any[] = []
      try {
        logs = await getStateLog(user.id!, machine.id)
      } catch {
        return absent
      }

      const dateLogs: any[] = Array.isArray(logs)
        ? logs.filter(l => l.timestamp?.startsWith(date))
        : []

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
        minutesLate: Math.max(0, minutesLate),
        status: minutesLate > 5 ? ('late' as const) : ('on_time' as const),
      }
    })
  )
}

// ─── Productividad TH ─────────────────────────────────────────────────────────

export interface THProductivity {
  user: AppUser
  programation?: Programation
  scheduledMinutes: number
  activeMinutes: number
  neutralMinutes: number
  inactiveMinutes: number
  offlineMinutes: number
  totalLoggedMinutes: number
  appProductivityPercent: number
  workCompliancePercent: number
  overallProductivityPercent: number
}

const resolveCategory = (cat: string | number): 'active' | 'neutral' | 'inactive' => {
  const s = cat?.toString().toUpperCase()
  if (s === 'ACTIVE' || s === '0') return 'active'
  if (s === 'NEUTRAL' || s === '1') return 'neutral'
  return 'inactive'
}

const isOffline = (state: string | number) => {
  const s = state?.toString().toUpperCase()
  return s === 'OFFLINE' || s === '5'
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

export const getTHProductivityReport = async (date: string): Promise<THProductivity[]> => {
  const dateObj = new Date(`${date}T12:00:00`)
  const dayKey = DAY_KEYS[dateObj.getDay()]

  const [users, machines, schedules, programations] = await Promise.all([
    getappuser(),
    getMachines(),
    getSchedules(),
    getProgramations(),
  ])

  return Promise.all(
    users.map(async user => {
      const machine = machines.find(m => Number(m.appuser_id) === user.id)
      const userSchedule = schedules.find(s => s.appuser_id === user.id && s.day_of_week === dayKey)
      const programation = userSchedule ? programations.find(p => p.id === userSchedule.programation_id) : undefined
      const scheduledMinutes = programation ? scheduledWorkMinutes(programation) : 0

      const empty: THProductivity = {
        user, programation, scheduledMinutes,
        activeMinutes: 0, neutralMinutes: 0, inactiveMinutes: 0, offlineMinutes: 0,
        totalLoggedMinutes: 0, appProductivityPercent: 0, workCompliancePercent: 0, overallProductivityPercent: 0,
      }

      if (!machine?.id) return empty

      let logs: any[] = []
      try {
        logs = await getStateLog(user.id!, machine.id)
      } catch {
        return empty
      }

      const dateLogs: any[] = Array.isArray(logs)
        ? logs.filter(l => l.timestamp?.startsWith(date))
        : []

      let active = 0, neutral = 0, inactive = 0, offline = 0

      for (let i = 0; i < dateLogs.length - 1; i++) {
        const dur =
          (new Date(dateLogs[i + 1].timestamp).getTime() - new Date(dateLogs[i].timestamp).getTime()) / 60000
        if (dur <= 0 || dur > 600) continue

        if (isOffline(dateLogs[i].state)) {
          offline += dur
        } else {
          const cat = resolveCategory(dateLogs[i].category)
          if (cat === 'active') active += dur
          else if (cat === 'neutral') neutral += dur
          else inactive += dur
        }
      }

      const totalLogged = active + neutral + inactive
      const appProd = totalLogged > 0 ? Math.round((active / totalLogged) * 100) : 0
      const workCompliance = scheduledMinutes > 0 ? Math.min(100, Math.round((totalLogged / scheduledMinutes) * 100)) : 0
      const overall = scheduledMinutes > 0
        ? Math.min(100, Math.round((active / scheduledMinutes) * 100))
        : appProd

      return {
        user, programation, scheduledMinutes,
        activeMinutes: Math.round(active),
        neutralMinutes: Math.round(neutral),
        inactiveMinutes: Math.round(inactive),
        offlineMinutes: Math.round(offline),
        totalLoggedMinutes: Math.round(totalLogged),
        appProductivityPercent: appProd,
        workCompliancePercent: workCompliance,
        overallProductivityPercent: overall,
      }
    })
  )
}
