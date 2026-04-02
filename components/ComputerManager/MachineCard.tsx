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
    <Card className={`w-50 h-50 flex flex-col items-center border-2 transition-all duration-200
  hover:shadow-lg hover:scale-105 cursor-pointer
  ${machine.isAlive ? 'border-green-500' : 'border-red-500'}`}>
  <CardHeader className='w-full text-center pb-2'>
    <CardTitle className='text-2xl truncate'>{machine.machineName}</CardTitle>
    <p className='text-sm text-muted-foreground'>{machine.ip ?? 'Sin IP'}</p>
  </CardHeader>
  <CardContent className='flex flex-col items-center gap-3 w-full'>
    <Badge variant={machine.isAlive ? "default" : "destructive"}>
      {machine.isAlive ? '🟢 Online' : '🔴 Offline'}
    </Badge>
    <MachineDialog machine={machine} />
  </CardContent>
</Card>
  )
}
