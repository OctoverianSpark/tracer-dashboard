'use client'
import { motion } from 'framer-motion'
import { Machine } from '@/types/Machine'
import { AppUser, Group } from '@/types/AppUser'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { getMachines, getMachinesWithAppUser } from '@/app/computers/actions'
import { Card, CardContent } from '@/app/_components/_ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import MachineList from './MachineList'
import GlobalMachineActions from './GlobalMachineActions'
import AppCategorization from '@/components/Supervisors/AppCategorization'
import UncategorizedApps from '@/components/Supervisors/UncategorizedApps'
import { staggerContainer, staggerItem } from '@/lib/motion'

interface Props {
  machines: Machine[]
  appusers: AppUser[]
  groups: Group[]
}

const POLL_INTERVAL = 30_000

const StatCard = ({ label, value, sub }: { label: string; value: number; sub: string }) => (
  <Card>
    <CardContent className='pt-5'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='text-3xl font-semibold tracking-tight'>{value}</p>
      <p className='text-xs text-muted-foreground mt-1'>{sub}</p>
    </CardContent>
  </Card>
)

export default function ComputersDashboard({ machines: initial, appusers, groups }: Props) {
  const [machines, setMachines]         = useState<Machine[]>(initial)
  const [lastUpdated, setLastUpdated]   = useState<Date>(new Date())
  const [polling, setPolling]           = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')

  const refresh = useCallback(async () => {
    setPolling(true)
    try {
      const [fresh, appUserMap] = await Promise.all([getMachines(), getMachinesWithAppUser()])
      if (fresh?.length) {
        const bySerial = new Map(
          appUserMap.filter(m => m.appuser_id).map(m => [m.serial_number, m.appuser_id])
        )
        const enriched = fresh.map(m => ({
          ...m,
          appuser_id: m.appuser_id ?? bySerial.get(m.serial_number),
        }))
        setMachines(enriched)
        setLastUpdated(new Date())
      }
    } finally {
      setPolling(false)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  const online  = useMemo(() => machines.filter(m => m.alive || m.isAlive), [machines])
  const offline = useMemo(() => machines.filter(m => !m.alive && !m.isAlive), [machines])

  const byStatus = useMemo(() =>
    statusFilter === 'online'  ? online :
    statusFilter === 'offline' ? offline :
    machines
  , [machines, statusFilter, online, offline])

  return (
    <div className='space-y-6'>
      <Tabs defaultValue='equipos'>
        <TabsList>
          <TabsTrigger value='equipos'>Equipos</TabsTrigger>
          <TabsTrigger value='categorization'>Categorización de apps</TabsTrigger>
          <TabsTrigger value='uncategorized'>Apps sin categorizar</TabsTrigger>
        </TabsList>

        <TabsContent value='equipos' className='mt-6 space-y-5'>

          {/* Stats */}
          <motion.div
            className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'
            variants={staggerContainer}
            initial='initial'
            animate='animate'
          >
            <motion.div variants={staggerItem}>
              <StatCard
                label='Total equipos'
                value={machines.length}
                sub='registrados'
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StatCard
                label='En línea'
                value={online.length}
                sub={`${Math.round(online.length / (machines.length || 1) * 100)}% del total`}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StatCard
                label='Fuera de línea'
                value={offline.length}
                sub='sin conexión activa'
              />
            </motion.div>
          </motion.div>

          {/* Polling indicator + status filter */}
          <div className='flex items-center gap-3 flex-wrap rounded-xl border bg-card backdrop-blur-sm px-4 py-3'>
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <span className={`size-2 rounded-full ${polling ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
              {polling
                ? 'Actualizando...'
                : `Actualizado ${lastUpdated.toLocaleTimeString('es-CO', { timeStyle: 'short' })}`}
            </div>

            <div className='flex items-center gap-3 ml-auto'>
              <GlobalMachineActions groups={groups} />

              <div className='flex gap-0.5 bg-muted/50 rounded-lg p-0.5'>
                {(['all', 'online', 'offline'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer
                      ${statusFilter === f
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
                  >
                    {f === 'all' ? 'Todos' : f === 'online' ? 'En línea' : 'Fuera de línea'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <MachineList machines={byStatus} appusers={appusers} />

        </TabsContent>

        <TabsContent value='categorization' className='mt-4'>
          <AppCategorization />
        </TabsContent>
        <TabsContent value='uncategorized' className='mt-4'>
          <UncategorizedApps />
        </TabsContent>
      </Tabs>
    </div>
  )
}
