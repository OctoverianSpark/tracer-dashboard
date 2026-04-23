'use server'
import RoleForm from '@/components/RolesManager/RoleForm'
import RolesList from '@/components/RolesManager/RolesList'
import React from 'react'
import { getRoles } from '../actions'

export default async function page() {

  const roles = await getRoles()

  return (
    <div className='grid gap-3'>
      <RoleForm />
      <RolesList roles={roles}/>
    </div>
  )
}
