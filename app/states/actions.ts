'use server'
import { StateCategory, WorkState } from '@/types/States'
import { revalidatePath } from 'next/cache'

const API = process.env.NEXT_PUBLIC_API_URL

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

// GET /states y GET /state-categories ya existen en el backend para el catálogo por defecto
// (sin group_id). Cada grupo puede tener su propio catálogo, totalmente independiente del
// default y del de otros grupos — el código (0-6) sigue siendo el mismo que usa el agente en
// POST /tracer/states, pero qué estados existen, su nombre/categoría/orden y si el código está
// presente o no en ese catálogo es libre por grupo. El soporte de `?group_id=` y los endpoints
// de escritura (save/delete de states) aún no fueron confirmados por el backend — quedan como
// scaffold, mismo patrón que el resto de este archivo.

export const getStates = async (groupId?: number | null): Promise<WorkState[]> =>
  fetcher(`${API}/states${groupId != null ? `?group_id=${groupId}` : ''}`)

export const getStateCategories = async (groupId?: number | null): Promise<StateCategory[]> =>
  fetcher(`${API}/state-categories${groupId != null ? `?group_id=${groupId}` : ''}`)

export const saveState = async (body: WorkState) => {
  await fetch(`${API}/states/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  revalidatePath('/states/control')
}

export const deleteState = async (id: number) => {
  await fetch(`${API}/states/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/states/control')
}

export const saveStateCategory = async (body: StateCategory) => {
  await fetch(`${API}/state-categories/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  revalidatePath('/states/control')
}

export const deleteStateCategory = async (id: number) => {
  await fetch(`${API}/state-categories/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/states/control')
}
