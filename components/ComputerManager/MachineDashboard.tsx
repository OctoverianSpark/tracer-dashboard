// components/Computers/ComputersDashboard.tsx
'use client'
import { Machine, machineLabel } from '@/types/Machine'
import { Monitor, Wifi, WifiOff, User, Clock, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/app/_components/_ui/card'
import { Input } from '@/app/_components/_ui/input'
import { Badge } from '@/app/_components/_ui/badge'

interface Props {
  machines: Machine[]
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

const MachineCard = ({ machine }: { machine: Machine }) => {
  const online = machine.alive || machine.isAlive
  const lastSeen = machine.last_seen
    ? new Date(machine.last_seen).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    : '—'

  return (
    <Card className={`transition-all border ${online ? 'border-green-500/50' : ''}`}>
      <CardHeader className='pb-2 flex flex-row items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Monitor className='size-4 text-muted-foreground' />
          <div>
            <span className='font-medium text-sm'>{machineLabel(machine)}</span>
            <p className='text-[11px] text-muted-foreground font-mono leading-none mt-0.5'>{machine.hostname}</p>
          </div>
        </div>
        <Badge variant={online ? 'default' : 'secondary'} className={`text-xs ${online ? 'bg-green-500 hover:bg-green-500' : ''}`}>
          {online
            ? <><Wifi className='size-3 mr-1' />Online</>
            : <><WifiOff className='size-3 mr-1' />Offline</>
          }
        </Badge>
      </CardHeader>
      <CardContent className='space-y-2 text-xs text-muted-foreground'>
        <div className='flex items-center gap-2'>
          <User className='size-3' />
          <span>{machine.username || '—'}</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]'>
            {machine.ip_address || '—'}
          </span>
          <span className='text-[11px] opacity-60'>{machine.serial_number}</span>
        </div>
        <div className='flex items-center gap-2'>
          <Clock className='size-3' />
          <span>{lastSeen}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ComputersDashboard({ machines }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all')

  const online  = useMemo(() => machines.filter(m => m.alive || m.isAlive), [machines])
  const offline = useMemo(() => machines.filter(m => !m.alive && !m.isAlive), [machines])

  const filtered = useMemo(() => {
    return machines
      .filter(m => filter === 'all' ? true : filter === 'online' ? (m.alive || m.isAlive) : (!m.alive && !m.isAlive))
      .filter(m =>
        machineLabel(m).toLowerCase().includes(search.toLowerCase()) ||
        m.hostname.toLowerCase().includes(search.toLowerCase()) ||
        m.username?.toLowerCase().includes(search.toLowerCase()) ||
        m.ip_address?.toLowerCase().includes(search.toLowerCase())
      )
  }, [machines, filter, search])

  return (
    <div className='space-y-6'>

      {/* Stats */}
      <div className='grid grid-cols-3 gap-4'>
        <StatCard label='Total equipos'  value={machines.length} sub='registrados'         />
        <StatCard label='En línea'        value={online.length}   sub={`${Math.round(online.length / machines.length * 100) || 0}% del total`} />
        <StatCard label='Fuera de línea'  value={offline.length}  sub='sin conexión activa' />
      </div>

      {/* Filtros */}
      <div className='flex gap-3 items-center'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
          <Input
            placeholder='Buscar por marca, modelo, hostname, usuario, IP...'
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
                ${filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
                }`}
            >
              {f === 'all' ? 'Todos' : f === 'online' ? 'En línea' : 'Fuera de línea'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de máquinas */}
      {filtered.length === 0 ? (
        <div className='text-center py-12 text-muted-foreground text-sm'>
          No se encontraron equipos
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {filtered.map(m => (
            <MachineCard key={m.serial_number} machine={m} />
          ))}
        </div>
      )}
    </div>
  )
}