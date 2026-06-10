'use server'
import { AppUser } from '@/types/AppUser'
import { revalidatePath } from 'next/cache'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getappuser = async (): Promise<AppUser[]> => {
  const appuser = await (await fetch(`${API_URL}/appuser`)).json()
  return appuser
}

export const saveappuser = async (body: AppUser) => {
  await fetch(`${API_URL}/appuser${body.id ? `/update/${body.id}` : '/save'}`, {
    method: body.id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  revalidatePath('/app/users')
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
