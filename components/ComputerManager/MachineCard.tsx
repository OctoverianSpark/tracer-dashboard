'use client'
import { Card, CardContent, CardHeader } from '@/app/_components/_ui/card'
import { Badge } from '@/app/_components/_ui/badge'
import { Machine, machineLabel } from '@/types/Machine'
import { AppUser } from '@/types/AppUser'
import MachineDialog from './MachineDialog'
import { Monitor, Wifi, WifiOff, TreePalm, Clock, User, Trash2 } from 'lucide-react'
import { Button } from '@/app/_components/_ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { useState } from 'react'

function formatDate(raw: string | undefined) {
  if (!raw) return '—'
  return new Date(raw).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

interface CardMachineProps {
  machine: Machine
  appuser?: AppUser
  onDelete: (serial: string) => void
}

export default function MachineCard({ machine, appuser, onDelete }: CardMachineProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const online  = machine.alive || machine.isAlive
  const vacation = appuser?.on_vacation ?? false

  return (
    <Card className={`transition-all border-2 ${vacation ? 'border-sky-400/60' : online ? 'border-green-500/50' : 'border-border'}`}>
      <CardHeader className='pb-2 flex flex-row items-center justify-between gap-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <Monitor className='size-4 text-muted-foreground shrink-0' />
          <div className='min-w-0'>
            <span className='font-medium text-sm truncate block'>{machine.hostname}</span>
            <p className='text-[11px] text-muted-foreground leading-none mt-0.5 truncate'>{machineLabel(machine)}</p>
          </div>
        </div>

        <div className='flex items-center gap-1 shrink-0'>
          {vacation ? (
            <Badge className='text-xs bg-sky-500 hover:bg-sky-500 text-white gap-1'>
              <TreePalm className='size-3' />Vacaciones
            </Badge>
          ) : (
            <Badge
              variant={online ? 'default' : 'secondary'}
              className={`text-xs ${online ? 'bg-green-500 hover:bg-green-500' : ''}`}
            >
              {online
                ? <><Wifi className='size-3 mr-1' />Online</>
                : <><WifiOff className='size-3 mr-1' />Offline</>}
            </Badge>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-6 text-muted-foreground hover:text-destructive cursor-pointer'
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar computadora</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className='space-y-2 text-xs text-muted-foreground'>
        <div className='flex items-center gap-2'>
          <User className='size-3 shrink-0' />
          <span className='truncate'>{machine.username || '—'}</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]'>{machine.ip_address || '—'}</span>
          <span className='text-[11px] opacity-60 truncate'>{machine.serial_number}</span>
        </div>
        <div className='flex items-center gap-2'>
          <Clock className='size-3 shrink-0' />
          <span className='truncate'>{formatDate(machine.last_seen)}</span>
        </div>

        <div className='flex justify-end pt-1'>
          <MachineDialog machine={machine} appuser={appuser} />
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar computadora?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{machine.hostname}</strong> permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(machine.serial_number)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
