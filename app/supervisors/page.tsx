'use client'
import { useEffect, useRef, useState } from 'react'
import { getUserConnectionStatuses, UserConnectionStatus } from './actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import ConnectedUsersTable from '@/components/Supervisors/ConnectedUsersTable'
import ProductivityReport from '@/components/Supervisors/ProductivityReport'
import { RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react'
import InfinitySpinner from '@/components/InfinitySpinner'

const POLL_MS = 30_000

export default function SupervisorsPage() {
  const [statuses, setStatuses]       = useState<UserConnectionStatus[]>([])
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getUserConnectionStatuses()
      setStatuses(data)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, POLL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Conectados = socket activo ahora mismo
  // No conectados = deberían estar pero no tienen socket activo
  const connected    = statuses.filter(s => s.wsConnected).length
  const disconnected = statuses.filter(s => s.shouldBeConnected && !s.wsConnected).length

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Panel de Supervisores</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            Monitoreo en tiempo real del equipo
            {updatedLabel && (
              <span className="text-xs text-muted-foreground/60">
                · actualizado {updatedLabel}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><RefreshCw className="h-4 w-4 mr-1" />Actualizar</>
          }
        </Button>
      </div>

      <Tabs defaultValue="connected">
        <TabsList>
          <TabsTrigger value="connected" className="gap-2">
            <Wifi className="h-4 w-4" />
            Conectados
            {!loading && <Badge variant="secondary">{connected}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="disconnected" className="gap-2">
            <WifiOff className="h-4 w-4" />
            No conectados
            {!loading && disconnected > 0 && (
              <Badge variant="destructive">{disconnected}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="productivity">Productividad</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="mt-4">
          {loading
            ? <div className="flex justify-center py-10"><InfinitySpinner size={56} /></div>
            : <ConnectedUsersTable statuses={statuses} mode="connected" />
          }
        </TabsContent>

        <TabsContent value="disconnected" className="mt-4">
          {loading
            ? <div className="flex justify-center py-10"><InfinitySpinner size={56} /></div>
            : <ConnectedUsersTable statuses={statuses} mode="disconnected" />
          }
        </TabsContent>

        <TabsContent value="productivity" className="mt-4">
          <ProductivityReport />
        </TabsContent>

      </Tabs>
    </div>
  )
}
