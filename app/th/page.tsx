'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getUserSchedules, UserScheduleRow } from './actions'
import { getGroups, getGroupVisibility } from '@/app/app/groups/actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import THScheduleView from '@/components/TH/THScheduleView'
import THProductivityReport from '@/components/TH/THProductivityReport'
import LateArrivalsLog from '@/components/TH/LateArrivalsLog'
import InfinitySpinner from '@/components/InfinitySpinner'
import { Group } from '@/types/AppUser'

export default function THPage() {
  const { data: session }                   = useSession()
  const [rows, setRows]                     = useState<UserScheduleRow[]>([])
  const [groups, setGroups]                 = useState<Group[]>([])
  const [loading, setLoading]               = useState(true)
  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>([])

  const currentUserId = Number(session?.appUser?.id)
  const currentGroup  = groups.find(g => g.id === session?.appUser?.group_id)
  const blockOwn      = currentGroup?.block_own_reports === true

  useEffect(() => {
    getUserSchedules()
      .then(({ rows }) => setRows(rows))
      .finally(() => setLoading(false))
    getGroups().then(setGroups)
  }, [])

  useEffect(() => {
    const groupId = session?.appUser?.group_id
    if (groupId != null) {
      getGroupVisibility(Number(groupId)).then(setVisibleGroupIds)
    }
  }, [session?.appUser?.group_id])

  // "Grupos visibles" es una lista de grupos ADICIONALES al propio, no un reemplazo — si no
  // se incluye explícitamente el propio group_id, uno termina sin poder verse ni a sí mismo.
  const ownGroupId = session?.appUser?.group_id != null ? Number(session.appUser.group_id) : null
  const visibilityFiltered = visibleGroupIds.length > 0
    ? rows.filter(r => r.user.group_id != null && (visibleGroupIds.includes(Number(r.user.group_id)) || Number(r.user.group_id) === ownGroupId))
    : rows
  const visibleRows = blockOwn
    ? visibilityFiltered.filter(r => Number(r.user.id) !== currentUserId)
    : visibilityFiltered

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
