'use client'
import { Machine } from '@/types/Machine'
import React from 'react'
import MachineCard from './MachineCard'

interface MachineListProps {
  machines: Machine[]
}

export default function MachineList ({ machines }: MachineListProps) {
  return (
    <div className='flex gap-4'>
      {machines.map(pc => (
        <MachineCard machine={pc} key={crypto.randomUUID()} />
      ))}
    </div>
  )
}
