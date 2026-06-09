'use client'
import { UserConnectionStatus } from '@/app/supervisors/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { Wifi, WifiOff, Clock, Activity } from 'lucide-react'

interface Props {
  statuses: UserConnectionStatus[]
  mode: 'connected' | 'disconnected'
}

function formatSeconds(s: number): string {
  if (s === 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function ConnectedUsersTable({ statuses, mode }: Props) {
  const filtered = statuses.filter(s =>
    mode === 'connected'
      ? s.isConnected
      : s.shouldBeConnected && !s.isConnected
  )

  if (filtered.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        {mode === 'connected' ? 'No hay usuarios conectados hoy.' : 'Todos los usuarios están conectados.'}
      </p>
    )
  }

  return (
    <div className='overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Equipo</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead>Tiempo hoy</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(({ user, machine, startTime, endTime, wsConnected, todaySeconds }) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.full_name}</TableCell>
              <TableCell className="text-muted-foreground text-sm font-mono">
                {machine?.hostname ?? '—'}
              </TableCell>
              <TableCell>
                {startTime ? (
                  <span className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    {startTime}{endTime ? ` – ${endTime}` : ''}
                  </span>
                ) : '—'}
              </TableCell>
              <TableCell className="text-sm font-mono">
                {formatSeconds(todaySeconds)}
              </TableCell>
              <TableCell>
                {mode === 'connected' ? (
                  wsConnected ? (
                    <Badge variant="default" className="gap-1 bg-green-600 text-white">
                      <Wifi className="h-3 w-3" /> Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600">
                      <Activity className="h-3 w-3" /> Activo hoy
                    </Badge>
                  )
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
    </div>
  )
}
