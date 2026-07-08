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

// Completa el catálogo del grupo destino con lo que le falte, tomándolo de un catálogo origen
// (el default u otro grupo) — no es un reemplazo: si el destino ya tiene una categoría con la
// misma `key`, o un estado con el mismo `code`, esa fila no se toca (podría ya estar
// personalizada); solo se crean las que faltan. Deja todo como filas nuevas e independientes,
// sin referencia viva al origen — funciona igual con un catálogo destino vacío o parcial.
export const cloneStateCatalog = async (fromGroupId: number | null, toGroupId: number | null) => {
  const [sourceCategories, sourceStates, destCategories, destStates] = await Promise.all([
    getStateCategories(fromGroupId),
    getStates(fromGroupId),
    getStateCategories(toGroupId),
    getStates(toGroupId),
  ])

  const categoryIdMap = new Map<number, number>()
  for (const { id: oldId, ...rest } of sourceCategories) {
    const existing = destCategories.find(c => c.key === rest.key)
    if (existing) {
      if (oldId != null && existing.id != null) categoryIdMap.set(oldId, existing.id)
      continue
    }
    const created = await saveStateCategory({ ...rest, group_id: toGroupId })
    if (oldId != null && created.id != null) categoryIdMap.set(oldId, created.id)
  }

  const destCodes = new Set(destStates.map(s => s.code))
  for (const { id, category_id, ...rest } of sourceStates) {
    if (destCodes.has(rest.code)) continue
    await saveState({ ...rest, category_id: categoryIdMap.get(category_id) ?? category_id, group_id: toGroupId })
  }
}
