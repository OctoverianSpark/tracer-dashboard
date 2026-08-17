'use server'
import { AppUser } from '@/types/AppUser'
import { revalidatePath } from 'next/cache'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getappuser = async (): Promise<AppUser[]> => {
  const appuser = await (await fetch(`${API_URL}/appuser`)).json()
  return appuser
}

export const saveappuser = async (body: AppUser): Promise<AppUser> => {
  const res = await fetch(`${API_URL}/appuser${body.id ? `/update/${body.id}` : '/save'}`, {
    method: body.id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  revalidatePath('/app/users')
  return data
}

export const setUserVacation = async (userId: number, on_vacation: boolean) => {
  await fetch(`${API_URL}/appuser/update/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ on_vacation }),
  })
}

export const deleteappuser = async (selected: number[]) => {
  if (selected.length === 0) return

  const res = await fetch(`${API_URL}/appuser/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: selected }),
  })

  if (!res.ok) throw new Error(`Error al eliminar usuarios: ${res.status}`)

  revalidatePath('/users/get')
}

export const revokeUserSession = async (userId: number): Promise<void> => {
  const res = await fetch(`${API_URL}/appuser/${userId}/revoke-session`, { method: 'POST' })
  if (!res.ok) throw new Error(`Error al cerrar la sesión: ${res.status}`)
}

export const revokeAllSessions = async (): Promise<void> => {
  const res = await fetch(`${API_URL}/appuser/revoke-all-sessions`, { method: 'POST' })
  if (!res.ok) throw new Error(`Error al cerrar las sesiones: ${res.status}`)
}
