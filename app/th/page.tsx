'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getUserSchedules, UserScheduleRow } from './actions'
import { getGroupVisibility } from '@/app/app/groups/actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import THScheduleView from '@/components/TH/THScheduleView'
import THProductivityReport from '@/components/TH/THProductivityReport'
import LateArrivalsLog from '@/components/TH/LateArrivalsLog'
import InfinitySpinner from '@/components/InfinitySpinner'

export default function THPage() {
  const { data: session }                   = useSession()
  const [rows, setRows]                     = useState<UserScheduleRow[]>([])
  const [loading, setLoading]               = useState(true)
  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>([])

  useEffect(() => {
    getUserSchedules()
      .then(({ rows }) => setRows(rows))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const groupId = session?.appUser?.group_id
    if (groupId != null) {
      getGroupVisibility(Number(groupId)).then(setVisibleGroupIds)
    }
  }, [session?.appUser?.group_id])

  const visibleRows = visibleGroupIds.length > 0
    ? rows.filter(r => r.user.group_id != null && visibleGroupIds.includes(Number(r.user.group_id)))
    : rows

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
            ? <div className="flex justify-center py-10"><InfinitySpinner size={56} /></div>
            : <THScheduleView rows={visibleRows} />
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
