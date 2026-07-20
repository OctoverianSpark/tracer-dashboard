'use server'
import { Group } from "@/types/AppUser"
import { revalidatePath } from "next/cache"

const API = process.env.NEXT_PUBLIC_API_URL

export const getGroups = async () => {
  const data = await (await fetch(`${API}/groups/`)).json()
  return data
}

export const saveGroup = async (group: Group): Promise<Group> => {
  const { visible_group_ids, ...groupBody } = group
  const res = await fetch(`${API}/groups${group.id ? `/update/${group.id}` : `/save`}`, {
    method: group.id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupBody),
  })
  if (!res.ok) throw new Error(`Error al guardar el grupo: ${res.status}`)
  revalidatePath('/app/groups/get')
  return res.json()
}

export const deleteGroup = async (id: number) => {
  const res = await fetch(`${API}/groups/delete/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Error al eliminar el grupo: ${res.status}`)
  revalidatePath('/app/groups/get')
}

export const updateUserGroup = async (userId: number, groupId: number | null) => {
  await fetch(`${API}/appuser/update/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: groupId }),
  })
}

export const updateGroupPreferences = async (groupId: number, preferences: Group['agent_preferences']) => {
  const res = await fetch(`${API}/groups/update/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_preferences: preferences }),
  })
  if (!res.ok) throw new Error(`Error al actualizar preferencias del grupo: ${res.status}`)
  revalidatePath('/states/control')
}

export const getGroupVisibility = async (groupId: number): Promise<number[]> => {
  try {
    const res = await fetch(`${API}/groups/${groupId}/visibility`)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data
      .map((item: any) => Number(item.visible_group_id ?? item.id))
      .filter(Boolean)
  } catch {
    return []
  }
}

export const addGroupVisibility = async (groupId: number, visibleGroupId: number) => {
  await fetch(`${API}/groups/${groupId}/visibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visible_group_id: visibleGroupId }),
  })
  revalidatePath('/app/groups/get')
}

export const removeGroupVisibility = async (groupId: number, visibleGroupId: number) => {
  await fetch(`${API}/groups/${groupId}/visibility/${visibleGroupId}`, { method: 'DELETE' })
  revalidatePath('/app/groups/get')
}
