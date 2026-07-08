'use server'
import { GroupStateVisibility, StateCategory, WorkState } from '@/types/States'
import { revalidatePath } from 'next/cache'

const API = process.env.NEXT_PUBLIC_API_URL

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

// Catálogo único y global — GET/POST/DELETE de /states y /state-categories ya están
// implementados en el backend. El código (0-6) es el mismo que usa el agente en
// POST /tracer/states.

export const getStates = async (): Promise<WorkState[]> =>
  fetcher(`${API}/states`)

export const getStateCategories = async (): Promise<StateCategory[]> =>
  fetcher(`${API}/state-categories`)

export const saveState = async (body: WorkState): Promise<WorkState> => {
  const res = await fetch(`${API}/states/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} — /states/save`)
  revalidatePath('/states/control')
  return res.json()
}

export const deleteState = async (id: number) => {
  await fetch(`${API}/states/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/states/control')
}

export const saveStateCategory = async (body: StateCategory): Promise<StateCategory> => {
  const res = await fetch(`${API}/state-categories/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} — /state-categories/save`)
  revalidatePath('/states/control')
  return res.json()
}

export const deleteStateCategory = async (id: number) => {
  await fetch(`${API}/state-categories/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/states/control')
}

// Visibilidad por grupo: la presencia de una fila { group_id, code } significa que ese estado
// está oculto del menú del agente para ese grupo puntual. No existen aún en el backend — quedan
// como scaffold hasta que se implementen, mismo patrón que el resto de este archivo.

export const getGroupStateVisibility = async (groupId: number): Promise<GroupStateVisibility[]> =>
  fetcher(`${API}/group-state-visibility?group_id=${groupId}`)

export const hideStateForGroup = async (groupId: number, code: number): Promise<GroupStateVisibility> => {
  const res = await fetch(`${API}/group-state-visibility/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: groupId, code }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} — /group-state-visibility/save`)
  revalidatePath('/states/control')
  return res.json()
}

export const unhideStateForGroup = async (id: number) => {
  await fetch(`${API}/group-state-visibility/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/states/control')
}
