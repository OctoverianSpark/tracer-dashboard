'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getUserScreenshots, findAsignedMachines } from '../computers/actions'
import { getappuser } from '../app/actions'
import { getGroups, getGroupVisibility } from '../app/groups/actions'
import { getRawAppUsageLogs } from '../time/actions'
import ReportScreenshotsList, { type IntervalPct } from '@/components/UserReporting/ReportScreenshots'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../_components/_ui/select'
import { Machine } from '@/types/Machine'
import { AppUser, Group } from '@/types/AppUser'
import { Input } from '../_components/_ui/input'
import { UserSelect } from '@/components/UserSelect'
import InfinitySpinner from '@/components/InfinitySpinner'

export default function Page() {
  const { data: session }                 = useSession()
  const [appusers, setAppusers]           = useState<AppUser[]>([])
  const [groups, setGroups]               = useState<Group[]>([])
  const [machines, setMachines]           = useState<Machine[]>([])
  const [selectedUser, setSelectedUser]   = useState<AppUser | undefined>()
  const [date, setDate]                   = useState(() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-') })
  const [screenshots, setScreenshots]             = useState<string[]>([])
  const [actualMonitor, setActualMonitor]         = useState<number | null>(null)
  const [loading, setLoading]                     = useState(false)
  const [productivityIntervals, setProductivityIntervals] = useState<IntervalPct[] | undefined>(undefined)

  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>([])

  const currentUserId   = Number(session?.appUser?.id)
  const currentGroup    = groups.find(g => g.id === session?.appUser?.group_id)
  const blockOwn        = currentGroup?.block_own_reports === true

  // "Grupos visibles" es una lista de grupos ADICIONALES al propio, no un reemplazo — si no
  // se incluye explícitamente el propio group_id, uno termina sin poder verse ni a sí mismo.
  const ownGroupId = session?.appUser?.group_id != null ? Number(session.appUser.group_id) : null
  const visibilityFiltered = visibleGroupIds.length > 0
    ? appusers.filter(u => u.group_id != null && (visibleGroupIds.includes(Number(u.group_id)) || Number(u.group_id) === ownGroupId))
    : appusers
  const selectableUsers = blockOwn
    ? visibilityFiltered.filter(u => Number(u.id) !== currentUserId)
    : visibilityFiltered

  useEffect(() => {
    getappuser().then(setAppusers)
    getGroups().then(setGroups)
  }, [])

  useEffect(() => {
    const groupId = session?.appUser?.group_id
    if (groupId != null) {
      getGroupVisibility(Number(groupId)).then(setVisibleGroupIds)
    }
  }, [session?.appUser?.group_id])

  // Equipos del usuario: solo para la productividad por intervalo (las capturas ya vienen por usuario).
  useEffect(() => {
    if (!selectedUser) return
    findAsignedMachines(selectedUser.id!).then(setMachines)
  }, [selectedUser])

  // Carga de capturas (crítica) — todas las del usuario, de cualquiera de sus equipos
  useEffect(() => {
    if (!selectedUser) return
    setLoading(true)
    getUserScreenshots(selectedUser.id!, date)
      .then(data => setScreenshots(data.files ?? []))
      .finally(() => setLoading(false))
  }, [selectedUser, date])

  // Carga de productividad por intervalo (independiente, best-effort). Cada intervalo lleva el
  // hostname de su equipo para cruzarlo solo con las capturas de ese mismo equipo.
  useEffect(() => {
    if (machines.length === 0) return
    Promise.all(machines.map(async machine => {
      const rawLogs = await getRawAppUsageLogs(date, machine.id)
      // Filtro defensivo: descartamos logs de otras máquinas
      const logs = machine.id != null ? rawLogs.filter(l => l.computer_id === machine.id) : rawLogs

      const intervals: IntervalPct[] = []
      for (const log of logs) {
        const startMs = new Date(log.interval_start).getTime()
        const endMs   = new Date(log.interval_end).getTime()
        if (!startMs || !endMs || endMs <= startMs) continue

        // Umbrales calibrados para intervalos de 1 min:
        //   clicks  → promedio real ~60  → 60 clicks  = 100 %
        //   keys    → rango real 20-80   → 80 teclas  = 100 %
        // → usuario promedio (60 clicks, 50 keys) ≈ 81 %
        const TARGET_CLICKS = 10
        const TARGET_KEYS   = 15

        const clicksPct = Math.min(100, Math.round(((log.mouse_clicks ?? 0) / TARGET_CLICKS) * 100))
        const keysPct   = Math.min(100, Math.round(((log.keystrokes   ?? 0) / TARGET_KEYS)   * 100))
        intervals.push({ start: startMs, end: endMs, pct: Math.round((clicksPct + keysPct) / 2), machine: machine.hostname })
      }
      return intervals
    }))
      .then(perMachine => setProductivityIntervals(perMachine.flat()))
      .catch(err => console.error('[Prod] Error:', err))
  }, [machines, date])

  const monitorCount = useMemo(() => {
    return screenshots.reduce((max, filename) => {
      const match = filename.match(/_Monitor(\d+)\.jpg$/)
      return match ? Math.max(max, parseInt(match[1])) : max
    }, 0) || 1
  }, [screenshots])

  const filteredScreenshots = useMemo(() => {
    if (actualMonitor === null) return screenshots
    return screenshots.filter(f => f.endsWith(`_Monitor${actualMonitor}.jpg`))
  }, [screenshots, actualMonitor])

  return (
    <div className="space-y-4">

      {/* Barra de filtros compacta */}
      <div className="flex items-center gap-2 flex-wrap rounded-xl border bg-card backdrop-blur-sm px-4 py-3">
        <UserSelect
          users={selectableUsers}
          groups={groups}
          value={selectedUser?.id?.toString()}
          onValueChange={val => {
            setSelectedUser(appusers.find(u => u.id === Number(val)))
            setMachines([])
            setScreenshots([])
            setActualMonitor(null)
            setProductivityIntervals(undefined)
          }}
          placeholder="Usuario"
          triggerClassName="h-8 text-sm flex-1 min-w-36"
        />

        <Input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); setProductivityIntervals(undefined) }}
          className="h-8 text-sm w-auto"
        />

        {selectedUser && (
          <Select
            value={actualMonitor === null ? 'all' : `${actualMonitor}`}
            onValueChange={val => setActualMonitor(val === 'all' ? null : parseInt(val))}
          >
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los monitores</SelectItem>
              {Array.from({ length: monitorCount }, (_, i) => (
                <SelectItem key={i + 1} value={`${i + 1}`}>Monitor {i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedUser && date && (
        <div className="space-y-4">

          {loading ? (
            <div className="flex justify-center py-12">
              <InfinitySpinner size={64} />
            </div>
          ) : (
            <ReportScreenshotsList
              folder={String(selectedUser.id)}
              label={selectedUser.full_name.replace(/\s+/g, '_')}
              screenshots={filteredScreenshots}
              productivityIntervals={productivityIntervals}
            />
          )}
        </div>
      )}

      {!selectedUser && (
        <p className="text-center text-sm text-muted-foreground py-12">
          Selecciona un usuario para ver las capturas.
        </p>
      )}
    </div>
  )
}
