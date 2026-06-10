'use client'
import { useState, useEffect, useTransition } from 'react'
import { ArrowRight, TreePalm, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/app/_components/_ui/button'
import { Badge } from '@/app/_components/_ui/badge'
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

function formatDate(raw: string | undefined) {
  if (!raw) return '—'
  return new Date(raw).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className='space-y-0.5'>
      <p className='text-[11px] text-muted-foreground uppercase tracking-wider'>{label}</p>
      <p className={`text-sm font-medium truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

interface MachineDialogProps {
  machine: Machine
  appuser?: AppUser
}

export default function MachineDialog({ machine, appuser }: MachineDialogProps) {
  const [open, setOpen]       = useState(false)
  const [ip, setIp]           = useState<Record<string, string>>()
  const [vacation, setVacation] = useState(appuser?.on_vacation ?? false)
  const [pending, startTransition] = useTransition()

  const online     = machine.alive || machine.isAlive
  const isVacation = vacation

  useEffect(() => {
    setVacation(appuser?.on_vacation ?? false)
  }, [appuser?.on_vacation])

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
    startTransition(async () => { await setUserVacation(userId, next) })
  }

  const locationValue = !machine.ip_address
    ? '—'
    : isPrivateIP(machine.ip_address)
    ? 'Red local'
    : ip?.city
    ? `${ip.city}${ip.country_name ? `, ${ip.country_name}` : ''}`
    : '—'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='sm' className='cursor-pointer gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-foreground'>
          Ver datos <ArrowRight className='size-3' />
        </Button>
      </DialogTrigger>

      <DialogContent className='max-w-md'>
        <DialogHeader>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex-1 min-w-0'>
              <DialogTitle className='text-lg leading-tight'>{machine.hostname}</DialogTitle>
              <p className='text-sm text-muted-foreground mt-0.5'>
                {machineLabel(machine)}
                {' · '}
                <span className='font-mono text-xs'>{machine.serial_number}</span>
              </p>
            </div>
            {isVacation ? (
              <Badge className='bg-sky-500 hover:bg-sky-500 gap-1 shrink-0'>
                <TreePalm className='size-3' />Vacaciones
              </Badge>
            ) : online ? (
              <Badge className='bg-green-500 hover:bg-green-500 gap-1 shrink-0'>
                <Wifi className='size-3' />Online
              </Badge>
            ) : (
              <Badge variant='secondary' className='gap-1 shrink-0'>
                <WifiOff className='size-3' />Offline
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Actions row */}
        <div className='flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30'>
          <MachineActions
            onLock={() => lockMachine(machine.serial_number)}
            onSendFile={handleFileSelect}
            onSendNotice={(title, message) => sendNotice(machine.serial_number, { title, message })}
            onLogoff={() => {}}
            onRestart={() => {}}
            onShutdown={() => {}}
          />
          {machine.appuser_id && (
            <button
              onClick={toggleVacation}
              disabled={pending}
              title={vacation ? 'Quitar vacaciones' : 'Marcar de vacaciones'}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer disabled:opacity-50
                ${vacation
                  ? 'bg-sky-500/10 border-sky-400 text-sky-600 hover:bg-sky-500/20'
                  : 'border-dashed border-muted-foreground/40 text-muted-foreground hover:border-sky-400 hover:text-sky-500'
                }`}
            >
              <TreePalm className='size-3.5' />
              {vacation ? 'De vacaciones' : 'Vacaciones'}
            </button>
          )}
        </div>

        {/* Info grid */}
        <div className='grid grid-cols-2 gap-x-6 gap-y-4 pt-1'>
          <InfoField
            label='Usuario'
            value={machine.displayName || machine.username || '—'}
          />
          <InfoField
            label='Nombre de sistema'
            value={machine.username || '—'}
            mono
          />
          <InfoField
            label='Dirección IP'
            value={machine.ip_address || '—'}
            mono
          />
          <InfoField
            label='Número de serie'
            value={machine.serial_number}
            mono
          />
          <InfoField
            label='Último visto'
            value={formatDate(machine.last_seen)}
          />
          <InfoField
            label='Localización'
            value={locationValue}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
