'use server'
import { getappuser } from '../app/actions'
import { getMachines } from '../computers/actions'
import { getSchedules, getProgramations, getStateLog } from '../time/actions'
import { AppUser } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation } from '@/types/Schedules'

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

export interface UserProductivity {
  user: AppUser
  machine?: Machine
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

export const getProductivityReport = async (date: string): Promise<UserProductivity[]> => {
  const [users, machines] = await Promise.all([getappuser(), getMachines()])

  const results = await Promise.all(
    users.map(async user => {
      const machine = machines.find(m => Number(m.appuser_id) === user.id)
      const empty = { user, machine, activeMinutes: 0, neutralMinutes: 0, inactiveMinutes: 0, totalMinutes: 0, productivityPercent: 0 }
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
        machine,
        activeMinutes: Math.round(active),
        neutralMinutes: Math.round(neutral),
        inactiveMinutes: Math.round(inactive),
        totalMinutes: Math.round(total),
        productivityPercent: total > 0 ? Math.round((active / total) * 100) : 0,
      }
    })
  )

  return results
}
