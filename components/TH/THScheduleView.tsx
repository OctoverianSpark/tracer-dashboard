'use client'
import { useState } from 'react'
import { UserScheduleRow } from '@/app/th/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'

const DAY_LABELS: Record<string, string> = {
  D: 'Dom', L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb',
}
const DAY_KEYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type FilterType = 'all' | 'assigned' | 'unassigned'

interface Props {
  rows: UserScheduleRow[]
}

function hasSchedule(row: UserScheduleRow): boolean {
  return Object.values(row.days).some(v => v !== null)
}

export default function THScheduleView({ rows }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')

  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        No hay usuarios registrados.
      </p>
    )
  }

  const assignedCount   = rows.filter(hasSchedule).length
  const unassignedCount = rows.length - assignedCount

  const filtered = filter === 'assigned'
    ? rows.filter(hasSchedule)
    : filter === 'unassigned'
    ? rows.filter(r => !hasSchedule(r))
    : rows

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Todos ({rows.length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'assigned' ? 'default' : 'outline'}
          onClick={() => setFilter('assigned')}
        >
          Asignados ({assignedCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'unassigned' ? 'default' : 'outline'}
          onClick={() => setFilter('unassigned')}
        >
          Sin asignar ({unassignedCount})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">
          No hay usuarios en esta categoría.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Usuario</TableHead>
                {DAY_KEYS.map(k => (
                  <TableHead key={k} className="text-center min-w-24">
                    {DAY_LABELS[k]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ user, days }) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium sticky left-0 bg-background">{user.full_name}</TableCell>
                  {DAY_KEYS.map(k => {
                    const entry = days[k]
                    return (
                      <TableCell key={k} className="text-center">
                        {entry ? (
                          <div className="space-y-0.5">
                            <Badge variant="secondary" className="text-xs font-normal">
                              {entry.programation.start_day} – {entry.programation.end_day ?? '—'}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{entry.programation.name}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
