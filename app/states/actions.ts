'use server'
import { StateCategory, WorkState } from '@/types/States'
import { revalidatePath } from 'next/cache'

const API = process.env.NEXT_PUBLIC_API_URL

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

// GET/POST/DELETE de /states y /state-categories (incluyendo `?group_id=` y el save/delete)
// ya están implementados en el backend. Cada grupo puede tener su propio catálogo, totalmente
// independiente del default y del de otros grupos — el código (0-6) sigue siendo el mismo que
// usa el agente en POST /tracer/states, pero qué estados existen, su nombre/categoría/orden y
// si el código está presente o no en ese catálogo es libre por grupo.

export const getStates = async (groupId?: number | null): Promise<WorkState[]> =>
  fetcher(`${API}/states${groupId != null ? `?group_id=${groupId}` : ''}`)

export const getStateCategories = async (groupId?: number | null): Promise<StateCategory[]> =>
  fetcher(`${API}/state-categories${groupId != null ? `?group_id=${groupId}` : ''}`)

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

// Copia todas las categorías y estados de un catálogo (por defecto o de otro grupo) hacia el
// catálogo del grupo destino, como punto de partida editable — no crea una referencia viva
// entre ambos, son filas nuevas e independientes desde el momento en que se clonan.
export const cloneStateCatalog = async (fromGroupId: number | null, toGroupId: number | null) => {
  const [sourceCategories, sourceStates] = await Promise.all([
    getStateCategories(fromGroupId),
    getStates(fromGroupId),
  ])

  const categoryIdMap = new Map<number, number>()
  for (const { id: oldId, ...rest } of sourceCategories) {
    const created = await saveStateCategory({ ...rest, group_id: toGroupId })
    if (oldId != null && created.id != null) categoryIdMap.set(oldId, created.id)
  }

  for (const { id, category_id, ...rest } of sourceStates) {
    await saveState({ ...rest, category_id: categoryIdMap.get(category_id) ?? category_id, group_id: toGroupId })
  }
}
