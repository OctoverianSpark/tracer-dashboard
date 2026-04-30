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

// ─── Tipos de productividad ───────────────────────────────────────────────────

export interface UserProductivity {
  user: AppUser
  machine?: Machine
  programation?: Programation
  scheduledMinutes: number    // minutos programados según malla
  activeMinutes: number       // apps productivas (categoría ACTIVE)
  neutralMinutes: number      // apps neutras (categoría NEUTRAL)
  inactiveMinutes: number     // apps improductivas / IDLE (categoría INACTIVE)
  offlineMinutes: number      // tiempo OFFLINE dentro del horario
  totalLoggedMinutes: number  // activo + neutral + inactivo (sin offline)
  appProductivityPercent: number    // activo / total_logged  (calidad de uso de apps)
  workCompliancePercent: number     // total_logged / programado  (cumplimiento horario)
  overallProductivityPercent: number // activo / programado  (métrica combinada)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveCategory = (cat: string | number): 'active' | 'neutral' | 'inactive' => {
  const s = cat?.toString().toUpperCase()
  if (s === 'ACTIVE' || s === '0') return 'active'
  if (s === 'NEUTRAL' || s === '1') return 'neutral'
  return 'inactive'
}

const isOffline = (state: string | number): boolean => {
  const s = state?.toString().toUpperCase()
  return s === 'OFFLINE' || s === '5'
}

const timeToMinutes = (hhmm: string): number => {
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

// ─── Action principal ─────────────────────────────────────────────────────────

export const getProductivityReport = async (date: string): Promise<UserProductivity[]> => {
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

      const empty: UserProductivity = {
        user, machine, programation, scheduledMinutes,
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
        if (dur <= 0 || dur > 600) continue // ignorar saltos de > 10 h

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
        user, machine, programation, scheduledMinutes,
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
