'use client'
import { useMemo, useRef, useState } from 'react'
import { getAttendance } from '@/app/th/actions'
import type { DayAttendance } from '@/lib/productivity'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'
import { Loader2, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import ListToolbar from '@/components/shared/ListToolbar'
import Paginator from '@/components/ComputerManager/Paginator'
import { useResetPageOnChange } from '@/components/shared/usePageReset'
import { Group } from '@/types/AppUser'

const today = () => {
  const bogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return bogota.toLocaleDateString('sv')
}

const fmtSpan = (s: number) => {
  if (s <= 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

const observation = (d: DayAttendance) => {
  const notes: string[] = []
  if (!d.firstActivity) notes.push('Sin actividad')
  else if (!d.lastActivity) notes.push('Sin tiempo en "Trabajando"')
  if (d.inProgress && d.firstActivity) notes.push('Jornada en curso')
  if (!d.hasRealSchedule) notes.push('Sin horario asignado (08:00-18:00 genérico)')
  return notes.join(' · ')
}

function exportXLSX(rows: DayAttendance[], groups: Group[], dateFrom: string, dateTo: string) {
  const groupMap  = new Map(groups.map(g => [g.id!, g.name]))
  const groupName = (d: DayAttendance) => d.user.group_id ? (groupMap.get(d.user.group_id) ?? 'Sin grupo') : 'Sin grupo'

  const HEADERS = ['Fecha', 'Grupo', 'Usuario', 'Equipo', 'Entrada programada', 'Hora de inicio', 'Salida programada', 'Hora de salida', 'Tiempo entre inicio y salida', 'Observación']
  const toRow = (d: DayAttendance) => [
    d.date, groupName(d), d.user.full_name, d.machines.join(', ') || '—',
    d.scheduledStart ?? '—', d.firstActivity ?? '—',
    d.scheduledEnd ?? '—', d.lastActivity ?? '—',
    fmtSpan(d.spanSeconds), observation(d),
  ]

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows.map(toRow)])
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: HEADERS.length - 1, r: rows.length } }) }
  ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 32 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 26 }, { wch: 44 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Entradas y salidas')
  const suffix = dateFrom === dateTo ? dateFrom : `${dateFrom}_a_${dateTo}`
  XLSX.writeFile(wb, `entradas_salidas_${suffix}.xlsx`)
}

interface Props {
  groups: Group[]
}

const PAGE_SIZE = 15

export default function AttendanceLog({ groups }: Props) {
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo]     = useState(today())
  const [data, setData]         = useState<DayAttendance[] | null>(null)
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [groupFilter, setGroupFilter] = useState<number | null>(null)
  const [page, setPage]         = useState(1)

  const rangeInvalid = dateTo < dateFrom

  const load = async () => {
    if (rangeInvalid) return
    setLoading(true)
    try {
      setData(await getAttendance(dateFrom, dateTo))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => (data ?? [])
    .filter(d =>
      (groupFilter === null || d.user.group_id === groupFilter) &&
      d.user.full_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.user.full_name.localeCompare(b.user.full_name)),
  [data, search, groupFilter])

  const withActivity = filtered.filter(d => d.firstActivity).length

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )
  useResetPageOnChange(`${search}|${groupFilter}`, setPage)
  useResetPageOnChange(data, setPage)

  const bodyRef = useRef<HTMLTableSectionElement>(null)
  useStaggerChildren(bodyRef, { deps: [paged.map(d => `${d.user.id}_${d.date}`).join(',')] })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Desde</Label>
          <Input
            type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value) }}
            className="w-44"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Hasta</Label>
          <Input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className={`w-44 ${rangeInvalid ? 'border-destructive' : ''}`}
          />
        </div>
        <Button onClick={load} disabled={loading || rangeInvalid}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Consultar'}
        </Button>
      </div>
      {rangeInvalid && (
        <p className="text-xs text-destructive">La fecha &quot;Hasta&quot; no puede ser anterior a &quot;Desde&quot;.</p>
      )}

      <p className="text-xs text-muted-foreground border rounded-md p-3">
        <span className="font-semibold text-foreground">Hora de inicio</span> = primer estado distinto de &quot;Desconectado&quot; (mismo criterio que Llegadas tarde).{' '}
        <span className="font-semibold text-foreground">Hora de salida</span> = última vez en &quot;Trabajando&quot; o &quot;Tiempo extra&quot; (mismo criterio que Horas Extra).
        Horas en la zona horaria de cada equipo.
      </p>

      {data === null && !loading && (
        <p className="text-center text-sm text-muted-foreground py-10">
          Selecciona un rango de fechas para ver las entradas y salidas.
        </p>
      )}

      {data !== null && (
        <>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium">{filtered.length} registros</span>
            <span className="text-green-600 font-medium">{withActivity} con actividad</span>
            <span className="text-red-500 font-medium">{filtered.length - withActivity} sin actividad</span>
          </div>

          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar usuario..."
            groups={groups}
            groupFilter={groupFilter}
            onGroupFilterChange={setGroupFilter}
            rightSlot={
              <button
                onClick={() => exportXLSX(filtered, groups, dateFrom, dateTo)}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="size-3.5" />
                Exportar
              </button>
            }
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Programado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Tiempo</TableHead>
                <TableHead>Observación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody ref={bodyRef}>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-sm">
                    Sin resultados para el filtro actual.
                  </TableCell>
                </TableRow>
              )}
              {paged.map(d => (
                <TableRow key={`${d.user.id}_${d.date}`} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{d.date}</TableCell>
                  <TableCell className="font-medium">{d.user.full_name}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {d.scheduledStart ?? '—'} – {d.scheduledEnd ?? '—'}
                  </TableCell>
                  <TableCell>{d.firstActivity ?? '—'}</TableCell>
                  <TableCell>
                    {d.lastActivity ?? '—'}
                    {d.inProgress && d.lastActivity && <Badge variant="outline" className="ml-2">en curso</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtSpan(d.spanSeconds)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{observation(d)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Paginator page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
