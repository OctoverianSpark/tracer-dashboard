'use client'
import { useState, useEffect } from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'

function isPrivateIP(ip: string): boolean {
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.0\.0\.0$|::1$|fd|fc)/.test(ip.trim())
}
import { Button } from '@/app/_components/_ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/_ui/dialog'
import { getIPInfo, lockMachine, sendFileToMachine, sendNotice } from '@/app/computers/actions'
import { Machine, machineLabel } from '@/types/Machine'
import MachineActions from './MachineActions'

interface MachineDialogProps {
  machine: Machine
}

export default function MachineDialog({ machine }: MachineDialogProps) {
  const [open, setOpen] = useState(false)
  const [ip, setIp] = useState<Record<string, string>>()

  useEffect(() => {
    if (!open || !machine.ip_address || isPrivateIP(machine.ip_address)) return
    getIPInfo(machine.ip_address)
      .then(data => {
        if (data?.city) setIp(data)
      })
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
            {machine.hostname}
            <span className="text-sm font-normal text-muted-foreground ml-2 font-mono">
              {machineLabel(machine)} · {machine.serial_number}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Usuario</p>
            <p className="font-medium">{machine.displayName || machine.username || '—'}</p>
          </div>

          <div className="grid gap-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Nombre de usuario</p>
            <p className="font-medium font-mono">{machine.username || '—'}</p>
          </div>

          <div className="grid gap-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Localización</p>
            <div className="flex items-center gap-2 font-medium">
              {!machine.ip_address
                ? '—'
                : isPrivateIP(machine.ip_address)
                ? <span className="text-muted-foreground text-sm">Red local</span>
                : ip?.city
                ? <>{ip.city}{ip.flag && <img src={ip.flag} alt="" className="h-4" />}</>
                : <span className="text-muted-foreground text-sm">—</span>
              }
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
