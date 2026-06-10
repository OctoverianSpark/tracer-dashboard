'use client'
import { useState, useEffect, useTransition } from 'react'
import { ArrowRight, TreePalm } from 'lucide-react'
import { Button } from '@/app/_components/_ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/_ui/dialog'
import { getIPInfo, lockMachine, sendFileToMachine, sendNotice } from '@/app/computers/actions'
import { setUserVacation } from '@/app/app/actions'
import { Machine, machineLabel } from '@/types/Machine'
import { AppUser } from '@/types/AppUser'
import MachineActions from './MachineActions'

function isPrivateIP(ip: string): boolean {
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.0\.0\.0$|::1$|fd|fc)/.test(ip.trim())
}

interface MachineDialogProps {
  machine: Machine
  appuser?: AppUser
}

export default function MachineDialog({ machine, appuser }: MachineDialogProps) {
  const [open, setOpen] = useState(false)
  const [ip, setIp] = useState<Record<string, string>>()
  const [vacation, setVacation] = useState(appuser?.on_vacation ?? false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setVacation(appuser?.on_vacation ?? false)
  }, [appuser?.on_vacation])
  console.log(machine)
  useEffect(() => {
    if (!open || !machine.ip_address || isPrivateIP(machine.ip_address)) return
    getIPInfo(machine.ip_address)
      .then(data => { if (data?.city) setIp(data) })
      .catch(() => {})
  }, [open, machine.ip_address])

  const handleFileSelect = (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    sendFileToMachine(machine.serial_number, formData)
  }

  const toggleVacation = () => {
    const userId = Number(appuser?.id ?? machine.appuser_id)
    
    if (!userId) return
    const next = !vacation
    setVacation(next)
    startTransition(async () => {
      await setUserVacation(userId, next)
    })
  }

  const userId = appuser?.id ?? (machine.appuser_id ? Number(machine.appuser_id) : null)

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

          {userId && (
            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <p className="text-sm font-medium">Vacaciones</p>
                <p className="text-xs text-muted-foreground">Marcar al usuario como de vacaciones</p>
              </div>
              <button
                onClick={toggleVacation}
                disabled={pending}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50
                  ${vacation
                    ? 'bg-sky-500/10 border-sky-400 text-sky-600 hover:bg-sky-500/20'
                    : 'border-dashed border-muted-foreground/40 text-muted-foreground hover:border-sky-400 hover:text-sky-500'
                  }`}
              >
                <TreePalm className="size-4" />
                {vacation ? 'De vacaciones' : 'Sin vacaciones'}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
