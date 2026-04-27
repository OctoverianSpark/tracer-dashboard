'use server'
import { Role } from "@/types/AppUser"
import { revalidatePath } from "next/cache"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const saveRole = async (role: Role) => {
  await fetch(`${API_URL}/roles${role.id ? `/update/${role.id}` : `/save`}`, {
    method: role.id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(role),
  })
  revalidatePath('/app/roles/get')
}

export const getRoles = async (): Promise<Role[]> => {
  const data = await (await fetch(`${API_URL}/roles`)).json()
  return data
}
