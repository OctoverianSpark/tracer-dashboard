'use server'
import AppUserList from '@/components/UserManager/UserList'
import React from 'react'
import { deleteappuser, getappuser, saveappuser } from '../../actions'
import { AppUser } from '@/types/AppUser'
import { revalidatePath } from 'next/cache'
import BulkUploadForm from '@/components/UserManager/BulkUploadForm'

export default async function page () {


  const handleDelete = async (selected: number[]) => {
    'use server'
    deleteappuser(selected)
    revalidatePath('/appuser')

  }

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
