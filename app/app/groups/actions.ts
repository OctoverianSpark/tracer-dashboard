'use server'
import { Group } from "@/types/AppUser"
import { revalidatePath } from "next/cache"


const API = process.env.NEXT_PUBLIC_API_URL

export const getGroups = async () => {

  const data = await (await fetch(`${API}/groups/`)).json()

  return data

}
export const saveGroup = async (group: Group) => {
  const res = await fetch(`${API}/groups${group.id ? `/update/${group.id}` : `/save`}`, {
    method: group.id ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(group)
  })

  if (!res.ok) throw new Error(`Error al guardar el grupo: ${res.status}`)

  revalidatePath('/app/groups/get')
}


export const updateUserGroup = async (userId: number, groupId: number) => {
  const res = await fetch(`${API}/appuser/update/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ group_id: groupId })
  })

}