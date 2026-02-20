'use client'
import EmployeeList from '@/components/PersonalManager/EmployeeList'
import React, { useEffect, useState } from 'react'
import { deletePersonal, getPersonal } from '../actions'
import { Employee } from '@/types/Personal'
import { useRouter } from 'next/navigation'

export default function page () {
  const [employees, setEmployees] = useState<Employee[]>([])

  const fetchEmployees = async () => {
    const emps = await getPersonal()
    setEmployees(emps)
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleUpdate = () => {
    fetchEmployees()
  }

  const handleDelete = (selected: number[]) => {
    deletePersonal(selected)
    fetchEmployees()
  }

  return (
    <div className='flex flex-col justify-between w-full h-full gap-8'>
      <h1 className='text-5xl font-medium text-center'>Lista del Personal</h1>
      <EmployeeList
        employees={employees}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}
