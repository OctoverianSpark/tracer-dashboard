'use server'
import { getappuser } from '../app/actions'
import { getMachines } from '../computers/actions'
import { getSchedules, getProgramations, getStateLog, getAppUsageLogs, AppUsageLog } from '../time/actions'
import { getCategorizationApps } from './categorization-actions'
import { AppUser } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation } from '@/types/Schedules'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

// ─── Conexión en tiempo real ──────────────────────────────────────────────────

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

export type AppUsageEntry = AppUsageLog

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
  appProductivityPercent: number      // productivo / (prod + improd)
  workCompliancePercent: number       // total / jornada programada
  overallProductivityPercent: number  // productivo / jornada programada
  topApps: UserAppUsage[]
}

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


// ─── Reporte de productividad ─────────────────────────────────────────────────

export const getProductivityReport = async (date: string): Promise<UserProductivity[]> => {
  const dateObj = new Date(`${date}T12:00:00`)
  const dayKey  = DAY_KEYS[dateObj.getDay()]

  const [users, machines, schedules, programations, usageLogs, categorizationApps] =
    await Promise.all([
      getappuser(),
      getMachines(),
      getSchedules(),
      getProgramations(),
      getAppUsageLogs(date),
      getCategorizationApps(),
    ])

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))

  return users.map(user => {
    const machine      = machines.find(m => Number(m.appuser_id) === user.id)
    const userSchedule = schedules.find(s => s.appuser_id === user.id && s.day_of_week === dayKey)
    const programation = userSchedule ? programations.find(p => p.id === userSchedule.programation_id) : undefined
    const scheduledMinutes = programation ? scheduledWorkMinutes(programation) : 0

    const empty: UserProductivity = {
      user, machine, programation, scheduledMinutes,
      productiveSeconds: 0, unproductiveSeconds: 0, uncategorizedSeconds: 0, totalSeconds: 0,
      appProductivityPercent: 0, workCompliancePercent: 0, overallProductivityPercent: 0,
      topApps: [],
    }

    if (!machine?.id) return empty

    const userLogs = usageLogs.filter(l => Number(l.computer_id) === machine.id)
    if (userLogs.length === 0) return empty

    let productive = 0, unproductive = 0, uncategorized = 0

    const topApps: UserAppUsage[] = userLogs
      .sort((a, b) => b.seconds - a.seconds)
      .map(l => {
        const cat = categoryMap.get(l.app.toLowerCase())
        const resolved = cat === 'productive' ? 'productive'
          : cat === 'unproductive' ? 'unproductive'
          : 'uncategorized'

        if (resolved === 'productive')     productive    += l.seconds
        else if (resolved === 'unproductive') unproductive += l.seconds
        else                              uncategorized += l.seconds

        return { app: l.app, seconds: l.seconds, category: resolved }
      })

    const total         = productive + unproductive + uncategorized
    const categorized   = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60

    const appProd      = categorized > 0 ? Math.round((productive / categorized) * 100) : 0
    const compliance   = scheduledSecs > 0 ? Math.min(100, Math.round((total / scheduledSecs) * 100)) : 0
    const overall      = scheduledSecs > 0 ? Math.min(100, Math.round((productive / scheduledSecs) * 100)) : appProd

    return {
      user, machine, programation, scheduledMinutes,
      productiveSeconds:    Math.round(productive),
      unproductiveSeconds:  Math.round(unproductive),
      uncategorizedSeconds: Math.round(uncategorized),
      totalSeconds:         Math.round(total),
      appProductivityPercent:     appProd,
      workCompliancePercent:      compliance,
      overallProductivityPercent: overall,
      topApps: topApps.slice(0, 8),
    }
  })
}
