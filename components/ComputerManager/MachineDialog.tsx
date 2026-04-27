'use client'
import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/app/_components/_ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/_ui/dialog'
import { getIPInfo, lockMachine, sendFileToMachine, sendNotice } from '@/app/computers/actions'
import { Machine } from '@/types/Machine'
import MachineActions from './MachineActions'

interface MachineDialogProps {
  machine: Machine
}

export default function MachineDialog({ machine }: MachineDialogProps) {
  const [open, setOpen] = useState(false)
  const [ip, setIp] = useState<Record<string, string>>()

  useEffect(() => {
    if (!open || !machine.ip_address) return
    getIPInfo(machine.ip_address)
      .then(setIp)
      .catch(() => {})
  }, [open, machine.ip_address])

  const handleFileSelect = (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    sendFileToMachine(machine.serial_number, formData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          Ver Datos <ArrowRight />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <MachineActions
              onLock={() => lockMachine(machine.serial_number)}
              onSendFile={handleFileSelect}
              onSendNotice={(title, message) => sendNotice(machine.serial_number, { title, message })}
              onLogoff={() => {}}
              onRestart={() => {}}
              onShutdown={() => {}}
            />
          </div>
          <DialogTitle>
            {machine.hostname} ({machine.serial_number})
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Usuario</p>
            <p className="font-medium">{machine.displayName || machine.userName || '—'}</p>
          </div>

          <div className="grid gap-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Nombre de usuario</p>
            <p className="font-medium font-mono">{machine.userName || '—'}</p>
          </div>

          <div className="grid gap-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Localización</p>
            <div className="flex items-center gap-2 font-medium">
              {ip?.city ?? '—'}
              {ip?.flag && <img src={ip.flag} alt="" className="h-4" />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
