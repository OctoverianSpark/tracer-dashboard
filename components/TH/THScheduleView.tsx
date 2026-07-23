'use client'
import { useState } from 'react'
import { UserScheduleRow, setAbsenceStatus, saveLunchSkip, deleteLunchSkip } from '@/app/th/actions'
import { AbsenceStatus } from '@/types/AppUser'
import { LunchSkip } from '@/types/Schedules'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { MotionTableBody, MotionTableRow } from '@/components/motion/MotionTable'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { UtensilsCrossed } from 'lucide-react'

const DAY_LABELS: Record<string, string> = {
  D: 'Dom', L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb',
}
const DAY_KEYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const ABSENCE_LABELS: Record<string, string> = {
  VACACIONES:     'Vacaciones',
  INACTIVIDAD:    'Inactividad',
  AUSENCIA_MEDICA:'Ausencia médica',
  PERMISO:        'Permiso',
}

const ABSENCE_STYLES: Record<string, string> = {
  VACACIONES:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
  INACTIVIDAD:     'bg-gray-500/15 text-gray-400 border-gray-500/30',
  AUSENCIA_MEDICA: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  PERMISO:         'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

type FilterType = 'all' | 'assigned' | 'unassigned'

interface Props {
  rows: UserScheduleRow[]
}

function hasSchedule(row: UserScheduleRow): boolean {
  return Object.values(row.days).some(v => v !== null)
}

export default function THScheduleView({ rows }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')
  // Overrides optimistas: userId → ausencia actual (puede diferir del prop inicial)
  const [overrides, setOverrides] = useState<Map<number, AbsenceStatus>>(() => {
    const m = new Map<number, AbsenceStatus>()
    for (const { user } of rows) {
      if (user.id != null) m.set(user.id, user.absence_status ?? null)
    }
    return m
  })

  const handleStatusChange = async (userId: number, value: string) => {
    const status: AbsenceStatus = value === 'ACTIVO' ? null : (value as AbsenceStatus)
    setOverrides(prev => new Map(prev).set(userId, status))
    await setAbsenceStatus(userId, status)
  }

  // Overrides optimistas de almuerzo: clave `${userId}_${date}` → LunchSkip si está desactivado
  const [lunchSkips, setLunchSkips] = useState<Map<string, LunchSkip>>(() => {
    const m = new Map<string, LunchSkip>()
    for (const { user, days } of rows) {
      for (const entry of Object.values(days)) {
        if (entry?.lunchSkip) m.set(`${user.id}_${entry.date}`, entry.lunchSkip)
      }
    }
    return m
  })

  const handleToggleLunch = async (userId: number, date: string) => {
    const key = `${userId}_${date}`
    const existing = lunchSkips.get(key)

    if (existing) {
      setLunchSkips(prev => { const m = new Map(prev); m.delete(key); return m })
      if (existing.id != null) await deleteLunchSkip(existing.id)
    } else {
      setLunchSkips(prev => new Map(prev).set(key, { appuser_id: userId, date }))
      const saved = await saveLunchSkip(userId, date)
      setLunchSkips(prev => new Map(prev).set(key, saved))
    }
  }

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
        <Button size="sm" variant={filter === 'all'        ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          Todos ({rows.length})
        </Button>
        <Button size="sm" variant={filter === 'assigned'   ? 'default' : 'outline'} onClick={() => setFilter('assigned')}>
          Asignados ({assignedCount})
        </Button>
        <Button size="sm" variant={filter === 'unassigned' ? 'default' : 'outline'} onClick={() => setFilter('unassigned')}>
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
                <TableHead className="sticky left-0 bg-background min-w-40">Usuario</TableHead>
                <TableHead className="min-w-44">Estado</TableHead>
                {DAY_KEYS.map(k => (
                  <TableHead key={k} className="text-center min-w-24">{DAY_LABELS[k]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <MotionTableBody variants={staggerContainer} initial="initial" animate="animate">
              {filtered.map(({ user, days }) => {
                const uid    = user.id!
                const status = overrides.get(uid) ?? null

                return (
                  <MotionTableRow key={uid} variants={staggerItem}>
                    <TableCell className="font-medium sticky left-0 bg-background">
                      <div className="flex flex-col gap-0.5">
                        <span>{user.full_name}</span>
                        {status && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 w-fit ${ABSENCE_STYLES[status]}`}>
                            {ABSENCE_LABELS[status]}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Select
                        value={status ?? 'ACTIVO'}
                        onValueChange={(v) => handleStatusChange(uid, v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVO">Activo</SelectItem>
                          <SelectItem value="VACACIONES">Vacaciones</SelectItem>
                          <SelectItem value="INACTIVIDAD">Inactividad</SelectItem>
                          <SelectItem value="AUSENCIA_MEDICA">Ausencia médica</SelectItem>
                          <SelectItem value="PERMISO">Permiso</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {DAY_KEYS.map(k => {
                      const entry = days[k]
                      if (!entry) {
                        return (
                          <TableCell key={k} className="text-center">
                            <span className="text-muted-foreground text-xs">—</span>
                          </TableCell>
                        )
                      }

                      const hasLunchBlock = !!(entry.programation.start_lunch && entry.programation.end_lunch)
                      const skipped = lunchSkips.get(`${uid}_${entry.date}`)

                      return (
                        <TableCell key={k} className="text-center">
                          <div className="space-y-0.5">
                            <Badge variant="secondary" className="text-xs font-normal">
                              {entry.programation.start_day} – {entry.programation.end_day ?? '—'}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{entry.programation.name}</p>
                            {hasLunchBlock && (
                              entry.skipLunch ? (
                                <span className="flex items-center gap-1 mx-auto text-[10px] text-amber-500 w-fit">
                                  <UtensilsCrossed className="h-3 w-3" />Sin almuerzo (fijo)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleLunch(uid, entry.date)}
                                  className={`flex items-center gap-1 mx-auto text-[10px] cursor-pointer ${
                                    skipped
                                      ? 'text-amber-500 hover:text-amber-400'
                                      : 'text-muted-foreground hover:text-foreground underline decoration-dotted'
                                  }`}
                                >
                                  {skipped ? <><UtensilsCrossed className="h-3 w-3" />Sin almuerzo</> : 'Quitar almuerzo'}
                                </button>
                              )
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </MotionTableRow>
                )
              })}
            </MotionTableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
