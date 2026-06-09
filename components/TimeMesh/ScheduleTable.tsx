'use client'
import { Schedule, Programation } from '@/types/Schedules'
import { AppUser } from '@/types/AppUser'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { Badge } from '@/app/_components/_ui/badge'
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

const DAY_ORDER = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_ABBR: Record<string, string> = {
  L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb', D: 'Dom',
}

interface DayEntry {
  dayKey: string
  progName: string
}

function buildDayEntries(rows: Schedule[], programations: Programation[]): DayEntry[] {
  return rows
    .map(r => ({
      dayKey:   r.day_of_week,
      progName: programations.find(p => p.id === r.programation_id)?.name ?? '—',
    }))
    .sort((a, b) => DAY_ORDER.indexOf(a.dayKey) - DAY_ORDER.indexOf(b.dayKey))
}

function DayChip({ entry }: { entry: DayEntry }) {
  return (
    <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">
      <span className="font-medium">{DAY_ABBR[entry.dayKey] ?? entry.dayKey}</span>
      <span className="text-muted-foreground ml-1">- {entry.progName}</span>
    </Badge>
  )
}

const MAX_INLINE = 4

export default function ScheduleTable({ schedules, appuser, programations }: Props) {
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

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
    <TooltipProvider>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className='text-center h-24 text-muted-foreground text-sm'>
                  No hay asignaciones
                </TableCell>
              </TableRow>
            ) : grouped.map(({ user, rows }) => {
              const entries = buildDayEntries(rows, programations)
              const visible = entries.slice(0, MAX_INLINE)
              const hidden  = entries.slice(MAX_INLINE)

              return (
                <TableRow key={user.id}>
                  <TableCell className='font-medium'>{user.full_name}</TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {visible.map((entry, i) => (
                        <DayChip key={i} entry={entry} />
                      ))}

                      {hidden.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground underline decoration-dashed cursor-help">
                              +{hidden.length} más
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              {hidden.map((entry, i) => (
                                <p key={i}>
                                  <span className="font-semibold">{DAY_ABBR[entry.dayKey] ?? entry.dayKey}</span>
                                  {' - '}
                                  {entry.progName}
                                </p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

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
      </div>

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
    </TooltipProvider>
  )
}
