'use server'
import { Programation, RotationCycle, RotationData, RotationSlot, Schedule } from "@/types/Schedules"
import { revalidatePath } from "next/cache"
import { AppUsageLog, FlatAppUsageLog } from "@/types/AppUser"
import { bogotaToMs, bogotaDateOf } from "@/lib/bogotaTime"

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

export const updateProgramation = async (id: number, body: Omit<Programation, 'id'>) => {
  await fetch(`${API}/programations/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  revalidatePath('/time/control')
}

export const getSchedules = async (): Promise<Schedule[]> =>
  fetcher(`${API}/schedules`)

// Igual que findAsignedMachines en app/computers/actions.ts: re-filtramos del lado del cliente
// por si el backend no respeta el ?appuser_id= en este endpoint de lista, como ya pasó con /machines.
export const getScheduleByappuserId = async (appuser_id: number): Promise<Schedule[]> => {
  const data = await fetcher<Schedule[]>(`${API}/schedules?appuser_id=${appuser_id}`)
  return data.filter(s => Number(s.appuser_id) === appuser_id)
}

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

// --- Rotación de turnos ---
// Los endpoints /rotation-cycles* y /schedules/effective aún no existen en el backend.
// Quedan como scaffold hasta que se implementen del lado del API.

export const getRotationCycles = async (): Promise<RotationCycle[]> =>
  fetcher(`${API}/rotation-cycles`)

export const getRotationCycleByappuserId = async (appuser_id: number): Promise<RotationCycle | null> => {
  const cycles = await fetcher<RotationCycle[]>(`${API}/rotation-cycles?appuser_id=${appuser_id}`)
  return cycles[0] ?? null
}

export const getRotationSlots = async (rotation_cycle_id: number): Promise<RotationSlot[]> =>
  fetcher(`${API}/rotation-cycles/${rotation_cycle_id}/slots`)

// Guarda el ciclo y sus slots en una sola llamada para evitar estados intermedios inconsistentes.
export const saveRotationCycle = async (
  cycle: Omit<RotationCycle, 'id'>,
  slots: Omit<RotationSlot, 'id' | 'rotation_cycle_id'>[]
) => {
  await fetch(`${API}/rotation-cycles/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...cycle, slots }),
  })
  revalidatePath('/time/control')
}

export const deleteRotationCycle = async (id: number) => {
  await fetch(`${API}/rotation-cycles/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/time/control')
}

// Carga todos los ciclos y sus slots en bloque, para resolver el horario efectivo de
// muchos empleados en memoria (con resolveEffectiveProgramation) sin un fetch por empleado.
export const getAllRotations = async (): Promise<RotationData[]> => {
  const cycles = await getRotationCycles()
  const slots = await Promise.all(cycles.map(c => getRotationSlots(c.id!)))
  return cycles.map((cycle, i) => ({ cycle, slots: slots[i] }))
}

// Resolución del horario efectivo para una fecha puntual (rotación o fijo).
// Debe vivir en el backend para que todos los consumidores (malla, TH, supervisores)
// compartan la misma lógica en vez de recalcularla cada uno por su lado.
export const getEffectiveProgramation = async (
  appuser_id: number,
  date: string // 'YYYY-MM-DD'
): Promise<Programation | null> =>
  fetcher(`${API}/schedules/effective?appuser_id=${appuser_id}&date=${date}`)

// Los timestamps que devuelve la API son UTC real (ver lib/bogotaTime.ts) — el rango que se le
// manda al backend tiene que ser el instante UTC real que corresponde a "00:00–23:59 hora de
// Bogotá" de esa fecha, no los mismos dígitos sin convertir (eso desfasaba la ventana ~5h,
// perdiendo la mayoría de los intervalos del día real).
function colDayRange(localDate: string): { from: string; to: string } {
  return {
    from: new Date(bogotaToMs(localDate, '00:00:00')).toISOString(),
    to:   new Date(bogotaToMs(localDate, '23:59:59')).toISOString(),
  }
}

export const getRawAppUsageLogs = async (date: string, computer_id?: number): Promise<AppUsageLog[]> => {
  const { from, to } = colDayRange(date)
  const params = new URLSearchParams({ from, to })
  if (computer_id != null) params.set('computer_id', String(computer_id))

  const raw = await fetcher<any>(`${API}/app-usage-logs/by-date?${params}`)
  const list: AppUsageLog[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.logs ?? [])

  const normalized = list.map(log => ({
    ...log,
    interval_start: log.interval_start?.replace(' ', 'T') ?? log.interval_start,
    interval_end:   log.interval_end?.replace(' ', 'T')   ?? log.interval_end,
  }))

  // Filtro por fecha calendario de Bogotá real (no el prefijo UTC crudo del timestamp).
  const filtered = normalized.filter(log =>
    log.interval_start != null && bogotaDateOf(log.interval_start) === date
  )

  console.log(
    `[getRawAppUsageLogs] date=${date} computer_id=${computer_id ?? 'ALL'}`,
    `| raw=${list.length} → filtered=${filtered.length}`,
    `| rango solicitado: ${from} → ${to}`,
  )

  return filtered
}

export const getRawAppUsageLogsRange = async (dateFrom: string, dateTo: string, computer_id?: number): Promise<AppUsageLog[]> => {
  const from = new Date(bogotaToMs(dateFrom, '00:00:00')).toISOString()
  const to   = new Date(bogotaToMs(dateTo, '23:59:59')).toISOString()
  const params = new URLSearchParams({ from, to })
  if (computer_id != null) params.set('computer_id', String(computer_id))

  const raw = await fetcher<any>(`${API}/app-usage-logs/by-date?${params}`)
  const list: AppUsageLog[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.logs ?? [])

  const normalized = list.map(log => ({
    ...log,
    interval_start: log.interval_start?.replace(' ', 'T') ?? log.interval_start,
    interval_end:   log.interval_end?.replace(' ', 'T')   ?? log.interval_end,
  }))

  // Igual que getRawAppUsageLogs pero por rango: conserva cualquier intervalo cuyo día de Bogotá
  // (no el prefijo UTC crudo) caiga dentro de [dateFrom, dateTo].
  const filtered = normalized.filter(log => {
    if (log.interval_start == null) return false
    const day = bogotaDateOf(log.interval_start)
    return day >= dateFrom && day <= dateTo
  })

  console.log(
    `[getRawAppUsageLogsRange] ${dateFrom} → ${dateTo} computer_id=${computer_id ?? 'ALL'}`,
    `| raw=${list.length} → filtered=${filtered.length}`,
  )

  return filtered
}

export const getAppUsageLogs = async (date: string, computer_id?: number): Promise<FlatAppUsageLog[]> => {
  const { from, to } = colDayRange(date)
  const params = new URLSearchParams({ from, to })
  if (computer_id != null) params.set('computer_id', String(computer_id))

  const raw = await fetcher<AppUsageLog[]>(`${API}/app-usage-logs/by-date?${params}`)

  if (!Array.isArray(raw)) return []

  const byKey = new Map<string, FlatAppUsageLog>()
  for (const log of raw.filter(l => l.interval_start != null && bogotaDateOf(l.interval_start) === date)) {
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