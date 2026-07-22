'use client'
import { useEffect, useState } from 'react'
import { getProductivityReport } from '@/app/supervisors/actions'
import { getDailyProductivity, getGlobalDailyProductivity, getGroupDailyProductivity } from '@/app/productivity/actions'
import { DailyProductivity, UserProductivity } from '@/lib/productivity'
import { AppUser, Group } from '@/types/AppUser'
import { Card } from '@/app/_components/_ui/card'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Button } from '@/app/_components/_ui/button'
import { UserSelect } from '@/components/UserSelect'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/_ui/table'
import ProductivityPodium from './ProductivityPodium'
import ProductivityCurveChart from './ProductivityCurveChart'
import { Loader2 } from 'lucide-react'

interface ProductivityDashboardProps {
  users: AppUser[]
  groups: Group[]
}

type ViewMode = 'global' | 'user' | 'group'

const today = () => {
  const bogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return bogota.toLocaleDateString('sv')
}

const daysAgo = (n: number) => {
  const bogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  bogota.setDate(bogota.getDate() - n)
  return bogota.toLocaleDateString('sv')
}

const fmtHM = (secs: number) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const fmtDate = (date: string) => {
  const [y, m, d] = date.split('-')
  return `${y}-${m}-${d}`
}

export default function ProductivityDashboard({ users, groups }: ProductivityDashboardProps) {
  const [dateFrom, setDateFrom] = useState(daysAgo(6))
  const [dateTo, setDateTo] = useState(today())
  const [viewMode, setViewMode] = useState<ViewMode>('global')
  const [userId, setUserId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [report, setReport] = useState<UserProductivity[] | null>(null)
  const [daily, setDaily] = useState<DailyProductivity[] | null>(null)
  const [loading, setLoading] = useState(false)

  const rangeInvalid = dateTo < dateFrom

  const loadDaily = async (mode: ViewMode, selectedUserId: string, selectedGroupId: string) => {
    if (mode === 'global') {
      setDaily(await getGlobalDailyProductivity(dateFrom, dateTo))
      return
    }
    if (mode === 'group') {
      if (selectedGroupId) setDaily(await getGroupDailyProductivity(Number(selectedGroupId), dateFrom, dateTo))
      else setDaily([])
      return
    }
    if (selectedUserId) setDaily(await getDailyProductivity(Number(selectedUserId), dateFrom, dateTo))
    else setDaily([])
  }

  const defaultTopUserId = (rep: UserProductivity[]) => {
    const topUser = [...rep]
      .filter(r => r.totalSeconds > 0)
      .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)[0]?.user.id
    return topUser ? String(topUser) : ''
  }

  const load = async () => {
    if (rangeInvalid) return
    setLoading(true)
    try {
      const rep = await getProductivityReport(dateFrom, dateTo)
      setReport(rep)

      let effectiveUserId = userId
      if (viewMode === 'user' && !effectiveUserId) {
        effectiveUserId = defaultTopUserId(rep)
        if (effectiveUserId) setUserId(effectiveUserId)
      }
      let effectiveGroupId = groupId
      if (viewMode === 'group' && !effectiveGroupId && groups[0]?.id != null) {
        effectiveGroupId = String(groups[0].id)
        setGroupId(effectiveGroupId)
      }

      await loadDaily(viewMode, effectiveUserId, effectiveGroupId)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode)
    setLoading(true)
    try {
      let effectiveUserId = userId
      if (mode === 'user' && !effectiveUserId) {
        effectiveUserId = defaultTopUserId(report ?? [])
        if (effectiveUserId) setUserId(effectiveUserId)
      }
      let effectiveGroupId = groupId
      if (mode === 'group' && !effectiveGroupId && groups[0]?.id != null) {
        effectiveGroupId = String(groups[0].id)
        setGroupId(effectiveGroupId)
      }
      await loadDaily(mode, effectiveUserId, effectiveGroupId)
    } finally {
      setLoading(false)
    }
  }

  const handleUserChange = async (value: string) => {
    setUserId(value)
    if (!value) return
    setLoading(true)
    try {
      await loadDaily('user', value, groupId)
    } finally {
      setLoading(false)
    }
  }

  const handleGroupChange = async (value: string) => {
    setGroupId(value)
    setLoading(true)
    try {
      await loadDaily('group', userId, value)
    } finally {
      setLoading(false)
    }
  }

  const top3 = (report ?? [])
    .filter(r => r.totalSeconds > 0)
    .sort((a, b) => b.overallProductivityPercent - a.overallProductivityPercent)
    .slice(0, 3)

  const selectedUser = users.find(u => String(u.id) === userId)
  const selectedGroup = groups.find(g => String(g.id) === groupId)

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5 w-full sm:w-auto">
          <Label>Desde</Label>
          <Input
            type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value) }}
            className="w-full sm:w-44"
          />
        </div>
        <div className="grid gap-1.5 w-full sm:w-auto">
          <Label>Hasta</Label>
          <Input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className={`w-full sm:w-44 ${rangeInvalid ? 'border-destructive' : ''}`}
          />
        </div>
        <Button onClick={load} disabled={loading || rangeInvalid}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</> : 'Generar'}
        </Button>
      </div>
      {rangeInvalid && (
        <p className="text-xs text-destructive">La fecha &quot;Hasta&quot; no puede ser anterior a &quot;Desde&quot;.</p>
      )}

      {/* Podio */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-lg font-medium mb-4">Podio de productividad</h2>
        {report === null ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Selecciona un rango y genera el reporte.</p>
        ) : (
          <ProductivityPodium top3={top3} />
        )}
      </Card>

      {/* Curva de productividad — global, por grupo o por usuario */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-medium">Curva de productividad</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={viewMode} onValueChange={v => handleViewModeChange(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="global" className="cursor-pointer">Global</TabsTrigger>
                <TabsTrigger value="group" className="cursor-pointer">Por grupo</TabsTrigger>
                <TabsTrigger value="user" className="cursor-pointer">Por usuario</TabsTrigger>
              </TabsList>
            </Tabs>
            {viewMode === 'user' && (
              <div className="w-56">
                <UserSelect users={users} value={userId} onValueChange={handleUserChange} placeholder="Seleccionar usuario" />
              </div>
            )}
            {viewMode === 'group' && (
              <Select value={groupId} onValueChange={handleGroupChange}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Seleccionar grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {daily === null ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Genera el reporte para ver la curva.</p>
        ) : (
          <>
            <ProductivityCurveChart data={daily} />

            <div className="rounded-md border overflow-x-auto mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Productivo</TableHead>
                    <TableHead className="text-right">No productivo</TableHead>
                    <TableHead className="text-right">Sin categorizar</TableHead>
                    <TableHead className="text-right">Duración</TableHead>
                    <TableHead className="text-right">Productividad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daily.map(d => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium">{fmtDate(d.date)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtHM(d.productiveSeconds)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtHM(d.unproductiveSeconds)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtHM(d.uncategorizedSeconds)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtHM(d.totalSeconds)}</TableCell>
                      <TableCell className="text-right font-medium">{d.overallProductivityPercent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        {viewMode === 'user' && selectedUser && (
          <p className="text-xs text-muted-foreground mt-2">Mostrando la curva de {selectedUser.full_name}.</p>
        )}
        {viewMode === 'group' && selectedGroup && (
          <p className="text-xs text-muted-foreground mt-2">Suma de los usuarios del grupo {selectedGroup.name}.</p>
        )}
        {viewMode === 'global' && daily !== null && (
          <p className="text-xs text-muted-foreground mt-2">Suma de todos los usuarios en el rango seleccionado.</p>
        )}
      </Card>
    </div>
  )
}
