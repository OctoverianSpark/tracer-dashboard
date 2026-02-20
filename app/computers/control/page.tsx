'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Machine } from '@/types/Machine'
import { getMachines } from '../actions'
import MachineList from '@/components/ComputerManager/MachineList'

export default function page () {
  const [machines, setMachines] = useState<Machine[]>([])
  useEffect(() => {
    const findMachines = async () => {
      const computers = await getMachines()

      setMachines(computers)
    }
    findMachines()
  }, [])

  return (
    <div className='flex min-h-screen items-center justify-center font-sans dark:bg-black'>
      <MachineList machines={machines} />
    </div>
  )
}
