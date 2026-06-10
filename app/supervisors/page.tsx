'use client'
import { useEffect, useState } from 'react'
import { getUserConnectionStatuses, UserConnectionStatus } from './actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import { Badge } from '@/app/_components/_ui/badge'
import { Button } from '@/app/_components/_ui/button'
import ConnectedUsersTable from '@/components/Supervisors/ConnectedUsersTable'
import ProductivityReport from '@/components/Supervisors/ProductivityReport'
import { RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react'
import InfinitySpinner from '@/components/InfinitySpinner'

export default function SupervisorsPage() {
  const [statuses, setStatuses] = useState<UserConnectionStatus[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getUserConnectionStatuses()
      setStatuses(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const connected    = statuses.filter(s => s.isConnected).length
  const disconnected = statuses.filter(s => s.shouldBeConnected && !s.isConnected).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Panel de Supervisores</h1>
          <p className="text-muted-foreground text-sm">Monitoreo en tiempo real del equipo</p>
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
