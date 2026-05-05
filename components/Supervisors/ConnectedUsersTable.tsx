'use client'
import { UserConnectionStatus } from '@/app/supervisors/actions'
import { machineLabel } from '@/types/Machine'
import { Badge } from '@/app/_components/_ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Wifi, WifiOff, Clock } from 'lucide-react'

interface Props {
  statuses: UserConnectionStatus[]
  mode: 'connected' | 'disconnected'
}

export default function ConnectedUsersTable({ statuses, mode }: Props) {
  const filtered = statuses.filter(s =>
    mode === 'connected'
      ? s.isConnected && s.shouldBeConnected
      : s.shouldBeConnected && !s.isConnected
  )

  if (filtered.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        {mode === 'connected' ? 'No hay usuarios conectados ahora.' : 'Todos los usuarios están conectados.'}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead>Equipo</TableHead>
          <TableHead>Horario</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map(({ user, machine, startTime, endTime }) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.full_name}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {machine ? machineLabel(machine) : '—'}
            </TableCell>
            <TableCell>
              {startTime ? (
                <span className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3" />
                  {startTime}{endTime ? ` – ${endTime}` : ''}
                </span>
              ) : '—'}
            </TableCell>
            <TableCell>
              {mode === 'connected' ? (
                <Badge variant="default" className="gap-1 bg-green-600 text-white">
                  <Wifi className="h-3 w-3" /> Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <WifiOff className="h-3 w-3" /> Sin conexión
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
