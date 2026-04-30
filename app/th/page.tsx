'use client'
import { useEffect, useState } from 'react'
import { getUserSchedules, UserScheduleRow } from './actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import THScheduleView from '@/components/TH/THScheduleView'
import THProductivityReport from '@/components/TH/THProductivityReport'
import LateArrivalsLog from '@/components/TH/LateArrivalsLog'
import { Loader2 } from 'lucide-react'

export default function THPage() {
  const [rows, setRows] = useState<UserScheduleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserSchedules()
      .then(({ rows }) => setRows(rows))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel de Talento Humano</h1>
        <p className="text-muted-foreground text-sm">Mallas horarias, productividad y control de asistencia</p>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Malla Horaria</TabsTrigger>
          <TabsTrigger value="productivity">Productividad</TabsTrigger>
          <TabsTrigger value="late">Llegadas tarde</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          {loading
            ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            : <THScheduleView rows={rows} />
          }
        </TabsContent>

        <TabsContent value="productivity" className="mt-4">
          <THProductivityReport />
        </TabsContent>

        <TabsContent value="late" className="mt-4">
          <LateArrivalsLog />
        </TabsContent>
      </Tabs>
    </div>
  )
}
