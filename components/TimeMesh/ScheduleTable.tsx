'use client'
import { Schedule, Programation, RotationData, RotationSlot } from '@/types/Schedules'
import { AppUser } from '@/types/AppUser'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/_components/_ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Trash2, FileDown, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useRef, useState } from 'react'
import { deleteSchedule, deleteRotationCycle } from '@/app/time/actions'

interface Props {
  schedules: Schedule[]
  appuser: AppUser[]
  programations: Programation[]
  rotations?: RotationData[]
}

const DAY_ORDER = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_ABBR: Record<string, string> = {
  L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb', D: 'Dom',
}

interface DayEntry {
  dayKey: string
  label: string
  rotating: boolean
}

function buildDayEntries(rows: Schedule[], rotation: RotationData | null, programations: Programation[]): DayEntry[] {
  const nameOf = (id: number) => programations.find(p => p.id === id)?.name ?? '—'

  const entries: DayEntry[] = rows.map(r => ({
    dayKey: r.day_of_week,
    label: nameOf(r.programation_id),
    rotating: false,
  }))

  if (rotation) {
    const byDay = new Map<string, RotationSlot[]>()
    for (const slot of rotation.slots) {
      if (!byDay.has(slot.day_of_week)) byDay.set(slot.day_of_week, [])
      byDay.get(slot.day_of_week)!.push(slot)
    }
    for (const [day, slots] of byDay) {
      const sorted = [...slots].sort((a, b) => a.week_index - b.week_index)
      entries.push({
        dayKey: day,
        label: sorted.map(s => nameOf(s.programation_id)).join(' → '),
        rotating: true,
      })
    }
  }

  return entries.sort((a, b) => DAY_ORDER.indexOf(a.dayKey) - DAY_ORDER.indexOf(b.dayKey))
}

function DayChip({ entry }: { entry: DayEntry }) {
  return (
    <Badge variant={entry.rotating ? 'outline' : 'secondary'} className="gap-1 text-xs font-normal whitespace-nowrap">
      {entry.rotating && <RefreshCw className="size-3" />}
      <span className="font-medium">{DAY_ABBR[entry.dayKey] ?? entry.dayKey}</span>
      <span className="text-muted-foreground ml-1">- {entry.label}</span>
    </Badge>
  )
}

const MAX_INLINE = 4

function exportXLSX(
  grouped: { user: AppUser; rows: Schedule[]; rotation: RotationData | null }[],
  programations: Programation[]
) {
  const rows = grouped.map(({ user, rows: schedRows, rotation }) => {
    const entries = buildDayEntries(schedRows, rotation, programations)
    return {
      'Empleado':        user.full_name,
      'Días y horarios': entries.map(e => `${DAY_ABBR[e.dayKey] ?? e.dayKey}: ${e.label}`).join(', '),
    }
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 1 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Asignaciones')
  XLSX.writeFile(wb, `asignaciones_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export default function ScheduleTable({ schedules, appuser, programations, rotations = [] }: Props) {
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const grouped = appuser
    .map(u => ({
      user: u,
      rows: schedules.filter(s => s.appuser_id === u.id),
      rotation: rotations.find(r => r.cycle.appuser_id === u.id) ?? null,
    }))
    .filter(g => g.rows.length > 0 || g.rotation)

  const confirmUser = appuser.find(u => u.id === confirmUserId)
  const confirmRotation = rotations.find(r => r.cycle.appuser_id === confirmUserId) ?? null

  const bodyRef = useRef<HTMLTableSectionElement>(null)
  useStaggerChildren(bodyRef, { deps: [grouped.map(g => g.user.id).join(',')] })

  async function handleDelete() {
    if (!confirmUserId) return
    setLoading(true)
    const rows = schedules.filter(s => s.appuser_id === confirmUserId)
    await Promise.all([
      ...rows.filter(s => s.id).map(s => deleteSchedule(s.id!)),
      ...(confirmRotation ? [deleteRotationCycle(confirmRotation.cycle.id!)] : []),
    ])
    setLoading(false)
    setConfirmUserId(null)
  }

  return (
    <TooltipProvider>
      <div className='space-y-2'>
        {grouped.length > 0 && (
          <div className='flex justify-end'>
            <button
              onClick={() => exportXLSX(grouped, programations)}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors cursor-pointer'
            >
              <FileDown className='size-3.5' />
              Exportar
            </button>
          </div>
        )}
        <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody ref={bodyRef}>
            {grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className='text-center h-24 text-muted-foreground text-sm'>
                  No hay asignaciones
                </TableCell>
              </TableRow>
            ) : grouped.map(({ user, rows, rotation }) => {
              const entries = buildDayEntries(rows, rotation, programations)
              const visible = entries.slice(0, MAX_INLINE)
              const hidden  = entries.slice(MAX_INLINE)

              return (
                <TableRow key={user.id} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
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
                                  {entry.label}
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
      </div>

      <AlertDialog open={!!confirmUserId} onOpenChange={open => { if (!open) setConfirmUserId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los horarios{confirmRotation ? ' y la rotación' : ''} asignados a <strong>{confirmUser?.full_name}</strong>. Esta acción no se puede deshacer.
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
