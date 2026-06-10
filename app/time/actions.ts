'use server'
import { Programation, Schedule } from "@/types/Schedules"
import { revalidatePath } from "next/cache"
import { AppUsageLog, FlatAppUsageLog } from "@/types/AppUser"

const API = process.env.NEXT_PUBLIC_API_URL

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

export const getStateLog = async (appuser_id: number, computer_id: number) => {
  const { data } = await fetcher<{ data: any }>(`${API}/tracer/get-state-logs?appuser_id=${appuser_id}&computer_id=${computer_id}`)
  return data
}

export const getProgramations = async (): Promise<Programation[]> =>
  fetcher(`${API}/programations`)

export const getProgramationById = async (id: number): Promise<Programation> =>
  fetcher(`${API}/programations/${id}`)

export const deleteProgramation = async (id: number) => {
  await fetch(`${API}/programations/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/time/control')
}

export const saveProgramation = async (body: Programation) => {
  await fetch(`${API}/programations/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  revalidatePath('/time/control')
}

export const getSchedules = async (): Promise<Schedule[]> =>
  fetcher(`${API}/schedules`)

export const getScheduleByappuserId = async (appuser_id: number): Promise<Schedule[]> =>
  fetcher(`${API}/schedules?appuser_id=${appuser_id}`)

export const saveSchedule = async (body: Schedule[]) => {
  await fetch(`${API}/schedules/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  revalidatePath('/time/control')
}

export const updateSchedule = async (id: number, body: Omit<Schedule, 'id'>) => {
  await fetch(`${API}/schedules/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  revalidatePath('/time/control')
}

export const deleteSchedule = async (id: number) => {
  await fetch(`${API}/schedules/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/time/control')
}

export const getRawAppUsageLogs = async (date: string, computer_id?: number): Promise<AppUsageLog[]> => {
  const params = new URLSearchParams({
    from: `${date}T00:00:00`,
    to: `${date}T23:59:59`,
  })
  if (computer_id != null) params.set('computer_id', String(computer_id))
  const raw = await fetcher<any>(`${API}/app-usage-logs/by-date?${params}`)
  const list: AppUsageLog[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.logs ?? [])
  // Normaliza el separador fecha-hora y filtra al día pedido
  const normalized = list.map(log => ({
    ...log,
    interval_start: log.interval_start?.replace(' ', 'T') ?? log.interval_start,
    interval_end:   log.interval_end?.replace(' ', 'T')   ?? log.interval_end,
  }))
  return normalized.filter(log => log.interval_start?.startsWith(date))
}

export const getAppUsageLogs = async (date: string, computer_id?: number): Promise<FlatAppUsageLog[]> => {
  const params = new URLSearchParams({
    from: `${date}T00:00:00`,
    to: `${date}T23:59:59`,
  })
  if (computer_id != null) params.set('computer_id', String(computer_id))

  const raw = await fetcher<AppUsageLog[]>(`${API}/app-usage-logs/by-date?${params}`)

  if (!Array.isArray(raw)) return []

  const byKey = new Map<string, FlatAppUsageLog>()
  for (const log of raw
    .map(l => ({ ...l, interval_start: l.interval_start?.replace(' ', 'T') ?? l.interval_start }))
    .filter(l => l.interval_start?.startsWith(date))
  ) {
    for (const a of log.apps ?? []) {
      const key = `${log.computer_id}__${a.app}`
      const existing = byKey.get(key)
      if (existing) {
        existing.seconds += a.seconds
      } else {
        byKey.set(key, { app: a.app, seconds: a.seconds, computer_id: log.computer_id })
      }
    }
  }
  return Array.from(byKey.values())
}