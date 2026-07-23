'use client'
import { useMemo, useRef, useState } from 'react'
import { UserConnectionStatus } from '@/app/supervisors/actions'
import { Badge } from '@/app/_components/_ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import { useStaggerChildren, STAGGER_ITEM_INITIAL_STYLE } from '@/lib/animation'
import { Wifi, WifiOff, Clock, Activity, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import ListToolbar from '@/components/shared/ListToolbar'
import Paginator from '@/components/ComputerManager/Paginator'
import { useResetPageOnChange } from '@/components/shared/usePageReset'
import { Group } from '@/types/AppUser'

interface Props {
  statuses: UserConnectionStatus[]
  mode: 'connected' | 'disconnected'
  groups: Group[]
}

const PAGE_SIZE = 15

function exportXLSX(data: UserConnectionStatus[], mode: 'connected' | 'disconnected') {
  const rows = data.map(({ user, machine, startTime, endTime, todaySeconds }) => ({
    'Usuario':     user.full_name,
    'Equipo':      machine?.hostname ?? '—',
    'Horario':     startTime ? `${startTime}${endTime ? ` – ${endTime}` : ''}` : '—',
    'Tiempo hoy':  formatSeconds(todaySeconds),
    'Estado':      mode === 'connected' ? 'Conectado' : todaySeconds > 0 ? 'Desconectado' : 'Sin actividad',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 4 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, mode === 'connected' ? 'Conectados' : 'Desconectados')
  XLSX.writeFile(wb, `usuarios_${mode}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function formatSeconds(s: number): string {
  if (s === 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function ConnectedUsersTable({ statuses, mode, groups }: Props) {
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  // Conectados = socket activo ahora mismo (wsConnected)
  // No conectados = deben estar trabajando pero no tienen socket activo
  const modeFiltered = statuses.filter(s =>
    mode === 'connected'
      ? s.wsConnected
      : s.shouldBeConnected && !s.wsConnected
  )

  const filtered = useMemo(() => modeFiltered.filter(s =>
    (groupFilter === null || s.user.group_id === groupFilter) &&
    s.user.full_name.toLowerCase().includes(search.toLowerCase())
  ), [modeFiltered, search, groupFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )
  useResetPageOnChange(`${search}|${groupFilter}`, setPage)

  const bodyRef = useRef<HTMLTableSectionElement>(null)
  useStaggerChildren(bodyRef, { deps: [paged.map(s => s.user.id).join(',')] })

  if (modeFiltered.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        {mode === 'connected'
          ? 'No hay usuarios conectados en este momento.'
          : 'Todos los usuarios que deben estar conectados lo están.'}
      </p>
    )
  }

  return (
    <div className='space-y-2'>
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder='Buscar usuario...'
        groups={groups}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        rightSlot={
          <button
            onClick={() => exportXLSX(filtered, mode)}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors cursor-pointer'
          >
            <FileDown className='size-3.5' />
            Exportar
          </button>
        }
      />
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
        <TableBody ref={bodyRef}>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className='text-center h-24 text-muted-foreground text-sm'>
                Sin resultados para el filtro actual.
              </TableCell>
            </TableRow>
          )}
          {paged.map(({ user, machine, startTime, endTime, wsConnected, todaySeconds }) => (
            <TableRow key={user.id} data-stagger-item style={STAGGER_ITEM_INITIAL_STYLE}>
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
                  <Badge variant="default" className="gap-1 bg-green-600 text-white">
                    <Wifi className="h-3 w-3" /> Conectado
                  </Badge>
                ) : todaySeconds > 0 ? (
                  // Estuvo activo hoy pero actualmente sin socket
                  <Badge variant="outline" className="gap-1 border-amber-400 text-amber-500">
                    <Activity className="h-3 w-3" /> Desconectado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="h-3 w-3" /> Sin actividad
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <Paginator page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  )
}
