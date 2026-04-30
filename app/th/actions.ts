'use server'
import { getappuser } from '../app/actions'
import { getMachines } from '../computers/actions'
import { getSchedules, getProgramations, getStateLog } from '../time/actions'
import { AppUser } from '@/types/AppUser'
import { Programation, Schedule } from '@/types/Schedules'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const
const DAY_LABELS: Record<string, string> = { D: 'Dom', L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb' }

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
      if (s) {
        const prog = programations.find(p => p.id === s.programation_id)
        days[key] = prog ? { programation: prog, scheduleId: s.id! } : null
      } else {
        days[key] = null
      }
    }
    return { user, days }
  })

  return { rows, dayKeys: [...DAY_KEYS] }
}

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
        const state = l.state?.toString().toUpperCase()
        return state !== 'OFFLINE' && state !== '5'
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

export interface THProductivity {
  user: AppUser
  activeMinutes: number
  neutralMinutes: number
  inactiveMinutes: number
  totalMinutes: number
  productivityPercent: number
}

const resolveCategory = (cat: string | number): 'active' | 'neutral' | 'inactive' => {
  const s = cat?.toString().toUpperCase()
  if (s === 'ACTIVE' || s === '0') return 'active'
  if (s === 'NEUTRAL' || s === '1') return 'neutral'
  return 'inactive'
}

export const getTHProductivityReport = async (date: string): Promise<THProductivity[]> => {
  const [users, machines] = await Promise.all([getappuser(), getMachines()])

  return Promise.all(
    users.map(async user => {
      const machine = machines.find(m => Number(m.appuser_id) === user.id)
      const empty = { user, activeMinutes: 0, neutralMinutes: 0, inactiveMinutes: 0, totalMinutes: 0, productivityPercent: 0 }
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

      let active = 0, neutral = 0, inactive = 0
      for (let i = 0; i < dateLogs.length - 1; i++) {
        const dur = (new Date(dateLogs[i + 1].timestamp).getTime() - new Date(dateLogs[i].timestamp).getTime()) / 60000
        if (dur <= 0) continue
        const cat = resolveCategory(dateLogs[i].category)
        if (cat === 'active') active += dur
        else if (cat === 'neutral') neutral += dur
        else inactive += dur
      }

      const total = active + neutral + inactive
      return {
        user,
        activeMinutes: Math.round(active),
        neutralMinutes: Math.round(neutral),
        inactiveMinutes: Math.round(inactive),
        totalMinutes: Math.round(total),
        productivityPercent: total > 0 ? Math.round((active / total) * 100) : 0,
      }
    })
  )
}
