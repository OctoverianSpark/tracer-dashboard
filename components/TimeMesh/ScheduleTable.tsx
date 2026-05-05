'use client'
import { Schedule, Programation } from '@/types/Schedules'
import { AppUser } from '@/types/AppUser'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Button } from '@/app/_components/_ui/button'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { deleteSchedule } from '@/app/time/actions'
import { DIAS } from './shared'

interface Props {
  schedules: Schedule[]
  appuser: AppUser[]
  programations: Programation[]
}

export default function ScheduleTable({ schedules, appuser, programations }: Props) {
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Agrupar por usuario
  const grouped = appuser
    .map(u => ({
      user: u,
      rows: schedules.filter(s => s.appuser_id === u.id),
    }))
    .filter(g => g.rows.length > 0)

  const confirmUser = appuser.find(u => u.id === confirmUserId)

  async function handleDelete() {
    if (!confirmUserId) return
    setLoading(true)
    const rows = schedules.filter(s => s.appuser_id === confirmUserId)
    await Promise.all(rows.filter(s => s.id).map(s => deleteSchedule(s.id!)))
    setLoading(false)
    setConfirmUserId(null)
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead>Días</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className='text-center h-24 text-muted-foreground text-sm'>
                No hay asignaciones
              </TableCell>
            </TableRow>
          ) : grouped.map(({ user, rows }) => {
            const programation = programations.find(p => p.id === rows[0].programation_id)
            const days = rows
              .map(r => DIAS.find(d => d.key === r.day_of_week)?.label ?? r.day_of_week)
              .join(', ')
            return (
              <TableRow key={user.id}>
                <TableCell className='font-medium'>{user.full_name}</TableCell>
                <TableCell>{programation?.name ?? '—'}</TableCell>
                <TableCell className='text-sm text-muted-foreground'>{days}</TableCell>
                <TableCell>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='cursor-pointer'
                    onClick={() => setConfirmUserId(user.id!)}
                  >
                    <Trash2 className='size-4 text-destructive' />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!confirmUserId} onOpenChange={open => { if (!open) setConfirmUserId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los horarios asignados a <strong>{confirmUser?.full_name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
