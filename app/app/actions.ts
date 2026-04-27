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

export const deleteappuser = async (selected: number[]) => {
  await fetch(`${API_URL}/appuser/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selected),
  })
  revalidatePath('/app/users')
}
