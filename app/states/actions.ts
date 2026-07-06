'use server'
import { StateCategory, WorkState } from '@/types/States'
import { revalidatePath } from 'next/cache'

const API = process.env.NEXT_PUBLIC_API_URL

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

// GET /states y GET /state-categories ya existen en el backend. Los estados (0-6) son fijos —
// los usa el agente tal cual en POST /tracer/states — así que aquí solo se edita su nombre,
// categoría y orden, nunca su código. Las categorías sí se pueden crear/borrar libremente.
// Los endpoints de escritura (update/save/delete) siguen el mismo patrón que el resto del
// dashboard pero aún no fueron confirmados por el backend — quedan como scaffold.

export const getStates = async (): Promise<WorkState[]> =>
  fetcher(`${API}/states`)

export const getStateCategories = async (): Promise<StateCategory[]> =>
  fetcher(`${API}/state-categories`)

export const updateState = async (id: number, body: Omit<WorkState, 'id' | 'code'>) => {
  await fetch(`${API}/states/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
