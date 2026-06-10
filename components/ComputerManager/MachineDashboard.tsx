'use client'
import { Machine, machineLabel } from '@/types/Machine'
import { AppUser } from '@/types/AppUser'
import { Monitor, Wifi, WifiOff, User, Clock, Search, LayoutGrid, List, FileDown, TreePalm } from 'lucide-react'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { getMachines } from '@/app/computers/actions'
import { Card, CardContent, CardHeader } from '@/app/_components/_ui/card'
import { Input } from '@/app/_components/_ui/input'
import { Badge } from '@/app/_components/_ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import Paginator from './Paginator'
import * as XLSX from 'xlsx'

interface Props {
  machines: Machine[]
  appusers: AppUser[]
}

const PAGE_SIZE_GRID  = 12
const PAGE_SIZE_TABLE = 15

function formatDate(raw: string | undefined) {
  if (!raw) return '—'
  return new Date(raw).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

const StatCard = ({ label, value, sub }: { label: string; value: number; sub: string }) => (
  <Card>
    <CardContent className='pt-5'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='text-3xl font-semibold tracking-tight'>{value}</p>
      <p className='text-xs text-muted-foreground mt-1'>{sub}</p>
    </CardContent>
  </Card>
)

function MachineCard({ machine, appuser }: { machine: Machine; appuser?: AppUser }) {
  const online = machine.alive || machine.isAlive
  const isVacation = appuser?.on_vacation ?? false

  return (
    <Card className={`transition-all border-2 ${isVacation ? 'border-sky-400/60' : online ? 'border-green-500/50' : 'border-border'}`}>
      <CardHeader className='pb-2 flex flex-row items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Monitor className='size-4 text-muted-foreground' />
          <div>
            <span className='font-medium text-sm'>{machine.hostname}</span>
            <p className='text-[11px] text-muted-foreground leading-none mt-0.5'>{machineLabel(machine)}</p>
          </div>
        </div>
        {isVacation ? (
          <Badge className='text-xs bg-sky-500 hover:bg-sky-500 text-white gap-1'>
            <TreePalm className='size-3' />Vacaciones
          </Badge>
        ) : (
          <Badge variant={online ? 'default' : 'secondary'} className={`text-xs ${online ? 'bg-green-500 hover:bg-green-500' : ''}`}>
            {online ? <><Wifi className='size-3 mr-1' />Online</> : <><WifiOff className='size-3 mr-1' />Offline</>}
          </Badge>
        )}
      </CardHeader>
      <CardContent className='space-y-2 text-xs text-muted-foreground'>
        <div className='flex items-center gap-2'>
          <User className='size-3' />
          <span>{machine.username || '—'}</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]'>{machine.ip_address || '—'}</span>
          <span className='text-[11px] opacity-60'>{machine.serial_number}</span>
        </div>
        <div className='flex items-center gap-2'>
          <Clock className='size-3' />
          <span>{formatDate(machine.last_seen)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function exportXLSX(machines: Machine[]) {
  const rows = machines.map(m => ({
    'Hostname':        m.hostname,
    'Marca/Modelo':    machineLabel(m),
    'Estado':          (m.alive || m.isAlive) ? 'Online' : 'Offline',
    'Usuario':         m.username || '',
    'Nombre completo': m.displayName || '',
    'IP':              m.ip_address || '',
    'Número de serie': m.serial_number,
    'Último visto':    formatDate(m.last_seen),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: 7 } }) }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos')
  XLSX.writeFile(wb, `equipos_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

const POLL_INTERVAL = 30_000

export default function ComputersDashboard({ machines: initial, appusers: initialUsers }: Props) {
  const [machines, setMachines] = useState<Machine[]>(initial)
  const [users] = useState<AppUser[]>(initialUsers)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [polling, setPolling] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [view, setView]     = useState<'grid' | 'table'>('grid')
  const [page, setPage]     = useState(1)

  const refresh = useCallback(async () => {
    setPolling(true)
    try {
      const fresh = await getMachines()
      if (fresh?.length) { setMachines(fresh); setLastUpdated(new Date()) }
    } finally {
      setPolling(false)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  const getAppUser = (machine: Machine) =>
    users.find(u => String(u.id) === String(machine.appuser_id))

  const online  = useMemo(() => machines.filter(m => m.alive || m.isAlive), [machines])
  const offline = useMemo(() => machines.filter(m => !m.alive && !m.isAlive), [machines])

  const filtered = useMemo(() => machines
    .filter(m => filter === 'all' ? true : filter === 'online' ? (m.alive || m.isAlive) : (!m.alive && !m.isAlive))
    .filter(m =>
      m.hostname.toLowerCase().includes(search.toLowerCase()) ||
      machineLabel(m).toLowerCase().includes(search.toLowerCase()) ||
      m.username?.toLowerCase().includes(search.toLowerCase()) ||
      m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      m.ip_address?.toLowerCase().includes(search.toLowerCase())
    ), [machines, filter, search])

  const pageSize   = view === 'grid' ? PAGE_SIZE_GRID : PAGE_SIZE_TABLE
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  useEffect(() => { setPage(1) }, [search, filter, view])

  return (
    <div className='space-y-6'>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
        <StatCard label='Total equipos'  value={machines.length} sub='registrados' />
        <StatCard label='En línea'        value={online.length}   sub={`${Math.round(online.length / machines.length * 100) || 0}% del total`} />
        <StatCard label='Fuera de línea'  value={offline.length}  sub='sin conexión activa' />
      </div>

      {/* Barra de herramientas */}
      <div className='flex gap-2 items-center flex-wrap'>
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <span className={`size-2 rounded-full ${polling ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
          {polling ? 'Actualizando...' : `Actualizado ${lastUpdated.toLocaleTimeString('es-CO', { timeStyle: 'short' })}`}
        </div>
        <div className='relative flex-1 min-w-0 w-full sm:w-auto'>
          <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
          <Input
            placeholder='Buscar hostname, marca, usuario, IP...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='pl-8'
          />
        </div>

        <div className='flex gap-1'>
          {(['all', 'online', 'offline'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer
                ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
            >
              {f === 'all' ? 'Todos' : f === 'online' ? 'En línea' : 'Fuera de línea'}
            </button>
          ))}
        </div>

        <div className='flex gap-1 border rounded-md p-0.5'>
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded cursor-pointer transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            title='Vista de tarjetas'
          >
            <LayoutGrid className='size-4' />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded cursor-pointer transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            title='Vista de tabla'
          >
            <List className='size-4' />
          </button>
        </div>

        {filtered.length > 0 && (
          <button
            onClick={() => exportXLSX(filtered)}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors cursor-pointer'
          >
            <FileDown className='size-4' />
            Exportar Excel
          </button>
        )}
      </div>

      {/* Contenido */}
      {filtered.length === 0 ? (
        <div className='text-center py-12 text-muted-foreground text-sm'>
          No se encontraron equipos
        </div>
      ) : view === 'grid' ? (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {paged.map(m => (
              <MachineCard
                key={m.serial_number}
                machine={m}
                appuser={getAppUser(m)}
              />
            ))}
          </div>
          <Paginator page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
        </>
      ) : (
        <>
          <div className='rounded-md border overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Último visto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(m => {
                  const isOnline = m.alive || m.isAlive
                  const appuser  = getAppUser(m)
                  const isVacation = appuser?.on_vacation ?? false
                  return (
                    <TableRow key={m.serial_number}>
                      <TableCell className='font-medium'>{m.hostname}</TableCell>
                      <TableCell className='text-muted-foreground text-sm'>{machineLabel(m) || '—'}</TableCell>
                      <TableCell>
                        {isVacation ? (
                          <Badge className='text-xs bg-sky-500 hover:bg-sky-500 gap-1'><TreePalm className='size-3' />Vacaciones</Badge>
                        ) : (
                          <Badge variant={isOnline ? 'default' : 'secondary'} className={`text-xs ${isOnline ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                            {isOnline ? <><Wifi className='size-3 mr-1' />Online</> : <><WifiOff className='size-3 mr-1' />Offline</>}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className='text-sm'>{m.username || '—'}</TableCell>
                      <TableCell className='font-mono text-xs'>{m.ip_address || '—'}</TableCell>
                      <TableCell className='text-sm text-muted-foreground'>{formatDate(m.last_seen)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <Paginator page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
