'use server'
import GroupList from '@/components/GroupsManager/GroupList'
import React from 'react'
import { getGroups } from '../actions'
import { getappuser } from '../../actions'
import GroupForm from '@/components/GroupsManager/GroupForm'

export default async function Page() {

  const groups = await getGroups()
  console.log(groups);
  
  const users = await getappuser()
  return (
    <div className="grid gap-4">
      <GroupForm />
      <GroupList groups={groups} users={users}/>

    </div>
  )
}
