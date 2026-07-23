'use client'
import { useMemo, useRef, useState } from 'react'
import { LateArrival, getLateArrivals } from '@/app/th/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'
import { Loader2, CheckCircle2, AlertCircle, XCircle, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import ListToolbar from '@/components/shared/ListToolbar'
import Paginator from '@/components/ComputerManager/Paginator'
import { useResetPageOnChange } from '@/components/shared/usePageReset'
import { Group } from '@/types/AppUser'

function exportXLSX(data: LateArrival[], date: string) {
  const statusLabel = (s: LateArrival['status'], min: number) =>
    s === 'on_time' ? 'A tiempo' : s === 'late' ? `Tarde (${min} min)` : 'Ausente'
  const rows = data.map(d => ({
    'Usuario':           d.user.full_name,
    'Hora programada':   d.scheduledStart,
    'Primera actividad': d.firstActivity ?? '—',
    'Estado':            statusLabel(d.status, d.minutesLate),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 3 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Llegadas')
  XLSX.writeFile(wb, `llegadas_${date}.xlsx`)
}

const today = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

const StatusBadge = ({ status, minutesLate }: { status: LateArrival['status']; minutesLate: number }) => {
  if (status === 'on_time') return (
    <Badge className="gap-1 bg-green-600 text-white">
      <CheckCircle2 className="h-3 w-3" /> A tiempo
    </Badge>
  )
  if (status === 'late') return (
    <Badge className="gap-1 bg-yellow-500 text-white">
      <AlertCircle className="h-3 w-3" /> {minutesLate} min tarde
    </Badge>
  )
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Ausente
    </Badge>
  )
}

interface Props {
  groups: Group[]
}

const PAGE_SIZE = 15

export default function LateArrivalsLog({ groups }: Props) {
  const [date, setDate] = useState(today())
  const [data, setData] = useState<LateArrival[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getLateArrivals(date)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const onTime = data?.filter(d => d.status === 'on_time').length ?? 0
  const late = data?.filter(d => d.status === 'late').length ?? 0
  const absent = data?.filter(d => d.status === 'absent').length ?? 0

  const sorted = useMemo(() => {
    if (!data) return []
    const order = { late: 0, absent: 1, on_time: 2 }
    return [...data].sort((a, b) => order[a.status] - order[b.status])
  }, [data])

  const filtered = useMemo(() => sorted.filter(d =>
    (groupFilter === null || d.user.group_id === groupFilter) &&
    d.user.full_name.toLowerCase().includes(search.toLowerCase())
  ), [sorted, search, groupFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )
  useResetPageOnChange(`${search}|${groupFilter}`, setPage)
  useResetPageOnChange(data, setPage)

  const bodyRef = useRef<HTMLTableSectionElement>(null)
  useStaggerChildren(bodyRef, { deps: [paged.map(d => d.user.id ?? d.user.full_name).join(',')] })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Consultar'}
        </Button>
      </div>

      {data === null && !loading && (
        <p className="text-center text-sm text-muted-foreground py-10">
          Selecciona una fecha para ver el registro de llegadas.
        </p>
      )}

      {data !== null && data.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          No hay usuarios programados para esta fecha.
        </p>
      )}

      {data !== null && data.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-green-600 font-medium">{onTime} a tiempo</span>
            <span className="text-yellow-600 font-medium">{late} tarde</span>
            <span className="text-red-500 font-medium">{absent} ausentes</span>
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
                onClick={() => exportXLSX(filtered, date)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
              >
                <FileDown className="size-3.5" />
                Exportar
              </button>
            }
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Hora programada</TableHead>
                <TableHead>Primera actividad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody ref={bodyRef}>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground text-sm">
                    Sin resultados para el filtro actual.
                  </TableCell>
                </TableRow>
              )}
              {paged
                .map(({ user, scheduledStart, firstActivity, status, minutesLate }) => (
                  <TableRow key={user.id ?? user.full_name} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{scheduledStart}</TableCell>
                    <TableCell className="text-muted-foreground">{firstActivity ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={status} minutesLate={minutesLate} />
                    </TableCell>
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
