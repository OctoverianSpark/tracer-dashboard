'use server'
import { AppUser } from '@/types/AppUser'
import { revalidatePath } from 'next/cache'

export const getappuser = async (): Promise<AppUser[]> => {
  const appuser = await (await fetch('https://actimetrics.asistentevirtualsas.com/appuser')).json()
  console.log(appuser);

  return appuser
}

export const saveappuser = async (body: AppUser) => {
  await fetch(`https://actimetrics.asistentevirtualsas.com/appuser${body.id ? `/update/${body.id}` : '/save'}`, {
    method: body.id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  revalidatePath('/appuser')
}

export const deleteappuser = async (selected: number[]) => {
  await fetch('https://actimetrics.asistentevirtualsas.com/appuser/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selected)
  })
  revalidatePath('/appuser')
}