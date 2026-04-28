import AppUserList from '@/components/UserManager/UserList'
import React from 'react'
import { deleteappuser, getappuser } from '../../actions'
import { revalidatePath } from 'next/cache'
import BulkUploadForm from '@/components/UserManager/BulkUploadForm'

async function handleDelete(selected: number[]) {
  'use server'
  console.log(selected);
  
  await deleteappuser(selected)
  revalidatePath('/users/get')
}

export default async function page() {
  const appusers = await getappuser()

  return (
    <div className='flex flex-col justify-between w-full h-full gap-8'>
      <BulkUploadForm />
      <AppUserList
        appusers={appusers}
        onDelete={handleDelete}
      />
    </div>
  )
}
