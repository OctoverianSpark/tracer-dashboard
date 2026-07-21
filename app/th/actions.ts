'use server'
import { revalidatePath } from 'next/cache'
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

import { getSchedules, getProgramations, getAllRotations } from '../time/actions'
import { resolveEffectiveProgramation } from '@/lib/scheduleResolver'
import { computeProductivityRange, loadMachinesAndStateLogs, type UserProductivity } from '@/lib/productivity'
import { AppUser } from '@/types/AppUser'
import { LunchSkip, Programation } from '@/types/Schedules'
import { StateLog } from '@/types/StateLog'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

// ─── Almuerzo — excepción puntual por usuario+fecha ──────────────────────────

export const getLunchSkips = async (from: string, to: string): Promise<LunchSkip[]> => {
  const res = await fetch(`${API_URL}/lunch-skips?from=${from}&to=${to}`)
  if (!res.ok) return []
  return res.json()
}

export const saveLunchSkip = async (appuser_id: number, date: string): Promise<LunchSkip> => {
  const res = await fetch(`${API_URL}/lunch-skips/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appuser_id, date }),
  })
  if (!res.ok) throw new Error(`Error al quitar el almuerzo: ${res.status}`)
  revalidatePath('/th')
  return res.json()
}

export const deleteLunchSkip = async (id: number): Promise<void> => {
  await fetch(`${API_URL}/lunch-skips/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/th')
}

// ─── Malla horaria ────────────────────────────────────────────────────────────

export interface UserScheduleRow {
  user: AppUser
  days: Record<string, { programation: Programation; date: string; lunchSkip?: LunchSkip } | null>
}

export const getUserSchedules = async (): Promise<{ rows: UserScheduleRow[]; dayKeys: string[] }> => {
  // Cada day_of_week se ancla a su fecha real dentro de la semana actual: la rotación
  // depende de la fecha, no solo del día de la semana, así que hace falta esa fecha para
  // saber qué Programation aplica hoy en cada columna del grid.
  const bogotaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const todayStr  = bogotaNow.toLocaleDateString('sv')
  const todayDow  = bogotaNow.getDay()
  const dateForDayIndex = (i: number) => {
    const d = new Date(`${todayStr}T12:00:00`)
    d.setDate(d.getDate() + (i - todayDow))
    return d.toLocaleDateString('sv')
  }
  const weekFrom = dateForDayIndex(0) // domingo de la semana visible
  const weekTo   = dateForDayIndex(6) // sábado de la semana visible

  const [users, schedules, programations, rotations, lunchSkips] = await Promise.all([
    getappuser(),
    getSchedules(),
    getProgramations(),
    getAllRotations(),
    getLunchSkips(weekFrom, weekTo),
  ])

  const lunchSkipByKey = new Map(
    lunchSkips.map(ls => [`${ls.appuser_id}_${ls.date.slice(0, 10)}`, ls])
  )

  const rows: UserScheduleRow[] = users.map(user => {
    const days: UserScheduleRow['days'] = {}
    DAY_KEYS.forEach((key, i) => {
      const date = dateForDayIndex(i)
      const programation = resolveEffectiveProgramation(
        schedules, rotations, programations, Number(user.id), key, date
      )
      days[key] = programation
        ? { programation, date, lunchSkip: lunchSkipByKey.get(`${user.id}_${date}`) }
        : null
    })
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

  const [users, schedules, programations, rotations] = await Promise.all([
    getappuser(),
    getSchedules(),
    getProgramations(),
    getAllRotations(),
  ])

  const scheduledUsers = users.filter(user =>
    resolveEffectiveProgramation(schedules, rotations, programations, Number(user.id), dayKey, date) != null
  )

  // loadMachinesAndStateLogs ya no filtra por fecha (trae el historial completo por par
  // usuario-máquina) — se filtra aquí al día pedido, mismo criterio que antes.
  const { machinesByUser, stateByMachine } = await loadMachinesAndStateLogs(scheduledUsers)

  return scheduledUsers.map(user => {
    const userId       = Number(user.id)
    const programation = resolveEffectiveProgramation(schedules, rotations, programations, userId, dayKey, date)
    const scheduledStart = programation?.start_day ?? '08:00'
    const absent = { user, scheduledStart, firstActivity: null, minutesLate: 0, status: 'absent' as const }

    const userMachines = machinesByUser.get(userId) ?? []
    if (!userMachines.length) return absent

    // Toma el primer log activo (no OFFLINE) de cualquier máquina del usuario
    const allLogs: StateLog[] = []
    for (const m of userMachines) {
      allLogs.push(...(stateByMachine.get(Number(m.id)) ?? []).filter(l => l.timestamp?.slice(0, 10) === date))
    }

    const activeLogs = allLogs
      .filter(l => l.code !== 6) // code 6 = offline (código crudo, siempre presente aunque el catálogo se borre)
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

export type THProductivity = Omit<UserProductivity, 'machine' | 'topApps'>

// Rango de un solo día (dateFrom === dateTo) reproduce el reporte histórico de un día; un rango
// más amplio suma totales por día en vez de promediar porcentajes (computeProductivityRange en
// lib/productivity.ts). appuserId acota el cálculo a un solo usuario.
export const getTHProductivityReport = async (
  dateFrom: string,
  dateTo: string,
  appuserId?: number,
): Promise<THProductivity[]> => {
  const allUsers = await getappuser()
  const users = appuserId != null ? allUsers.filter(u => Number(u.id) === appuserId) : allUsers
  const report = await computeProductivityRange(users, dateFrom, dateTo)
  return report.map(({ machine: _machine, topApps: _topApps, ...rest }) => rest)
}
