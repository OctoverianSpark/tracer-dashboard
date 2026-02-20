import { Button } from '@/app/_components/_ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/app/_components/_ui/card'
import { Machine } from '@/types/Machine'
import React from 'react'
import MachineDialog from './MachineDialog'
import { Badge } from '@/app/_components/_ui/badge'
import { FileImageIcon } from 'lucide-react'

interface CardMachineProps {
  machine: Machine
}
export default function MachineCard ({ machine }: CardMachineProps) {
  return (
    <Card className='w-50 h-50 grid place-items-center'>
      <CardHeader className='w-full text-center flex'>
        <CardTitle className='text-2xl'>{machine.machineName}</CardTitle>
      </CardHeader>
      <CardContent>
        <MachineDialog machine={machine} />
      </CardContent>
    </Card>
  )
}
