'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/_ui/card'
import { Badge } from '@/app/_components/_ui/badge'
import { Machine, machineLabel } from '@/types/Machine'
import { AppUser } from '@/types/AppUser'
import MachineDialog from './MachineDialog'
import { Button } from '@/app/_components/_ui/button'
import { Trash2, Wifi, WifiOff, TreePalm } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { useState } from 'react'

interface CardMachineProps {
  machine: Machine
  appuser?: AppUser
  onDelete: (serial: string) => void
}

export default function MachineCard({ machine, appuser, onDelete }: CardMachineProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const online = machine.alive || machine.isAlive
  const vacation = appuser?.on_vacation ?? false

  const statusBadge = vacation
    ? <Badge className="text-xs bg-sky-500 hover:bg-sky-500 text-white gap-1"><TreePalm className="size-3" />Vacaciones</Badge>
    : online
      ? <Badge className="text-xs bg-green-500 hover:bg-green-500 gap-1"><Wifi className="size-3" />Online</Badge>
      : <Badge variant="secondary" className="text-xs gap-1"><WifiOff className="size-3" />Offline</Badge>

  return (
    <Card className={`relative flex flex-col border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer
      ${vacation ? 'border-sky-400' : online ? 'border-green-500' : 'border-red-500'}`}
    >
      <CardHeader className="w-full text-center pb-2 relative">
        <CardTitle className="text-xl truncate">{machine.hostname}</CardTitle>
        <p className="text-sm text-muted-foreground">{machineLabel(machine)}</p>
        <p className="text-xs text-muted-foreground">{machine.ip_address || 'Sin IP'}</p>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="cursor-pointer absolute -top-5 right-2" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eliminar computadora</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar computadora?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará <strong>{machineLabel(machine)}</strong> permanentemente. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(machine.serial_number)}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-3">
        <span className="text-md truncate">{machine.displayName}</span>
        {statusBadge}
        <MachineDialog machine={machine} appuser={appuser} />
      </CardContent>
    </Card>
  )
}
