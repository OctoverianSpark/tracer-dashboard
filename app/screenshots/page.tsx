'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getMachineReport, findAsignedMachines } from '../computers/actions'
import { getappuser } from '../app/actions'
import { getGroups, getGroupVisibility } from '../app/groups/actions'
import { getRawAppUsageLogs } from '../time/actions'
import ReportScreenshotsList from '@/components/UserReporting/ReportScreenshots'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../_components/_ui/select'
import { Machine, machineLabel } from '@/types/Machine'
import { AppUser, Group } from '@/types/AppUser'
import { Input } from '../_components/_ui/input'
import { Label } from '../_components/_ui/label'
import { UserSelect } from '@/components/UserSelect'

export default function Page() {
  const { data: session }                 = useSession()
  const [appusers, setAppusers]           = useState<AppUser[]>([])
  const [groups, setGroups]               = useState<Group[]>([])
  const [machines, setMachines]           = useState<Machine[]>([])
  const [selectedUser, setSelectedUser]   = useState<AppUser | undefined>()
  const [machine, setMachine]             = useState<Machine | undefined>()
  const [date, setDate]                   = useState(() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-') })
  const [screenshots, setScreenshots]             = useState<string[]>([])
  const [actualMonitor, setActualMonitor]         = useState<number | null>(null)
  const [loading, setLoading]                     = useState(false)
  const [productivityIntervals, setProductivityIntervals] = useState<{ start: number; end: number; pct: number }[] | undefined>(undefined)

  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>([])

  const currentUserId   = Number(session?.appUser?.id)
  const currentGroup    = groups.find(g => g.id === session?.appUser?.group_id)
  const blockOwn        = currentGroup?.block_own_reports === true

  const visibilityFiltered = visibleGroupIds.length > 0
    ? appusers.filter(u => u.group_id != null && visibleGroupIds.includes(Number(u.group_id)))
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

  useEffect(() => {
    if (!selectedUser) return
    setMachine(undefined)
    setScreenshots([])
    setActualMonitor(null)
    setProductivityIntervals(undefined)
    findAsignedMachines(selectedUser.id!).then(machines => {
      setMachines(machines)
      if (machines.length === 1) setMachine(machines[0])
    })
  }, [selectedUser])

  // Carga de capturas (crítica)
  useEffect(() => {
    if (!machine) return
    setLoading(true)
    getMachineReport(machine.hostname, date)
      .then(data => setScreenshots(data.files ?? []))
      .finally(() => setLoading(false))
  }, [machine, date])

  // Carga de productividad por intervalo (independiente, best-effort)
  useEffect(() => {
    if (!machine) return
    setProductivityIntervals(undefined)
    getRawAppUsageLogs(date, machine.id).then(rawLogs => {
      console.groupCollapsed(`[ActiMetrics] Reportes recibidos: ${rawLogs.length} intervalos — ${machine.hostname} ${date}`)
      console.log('[ActiMetrics] Raw body completo:', rawLogs)

      const intervals: { start: number; end: number; pct: number }[] = []

      for (const log of rawLogs) {
        const startMs = new Date(log.interval_start).getTime()
        const endMs   = new Date(log.interval_end).getTime()
        if (!startMs || !endMs || endMs <= startMs) continue

        // Mínimos esperados por intervalo para considerar 100% activo
        const MIN_CLICKS = 5
        const MIN_KEYS   = 15

        const clicks     = log.MouseClicks ?? 0
        const keystrokes = log.Keystrokes  ?? 0
        const clicksPct  = Math.min(100, Math.round((clicks     / MIN_CLICKS) * 100))
        const keysPct    = Math.min(100, Math.round((keystrokes / MIN_KEYS)   * 100))
        const pct        = Math.round((clicksPct + keysPct) / 2)

        console.log(
          `%c${new Date(startMs).toLocaleTimeString('es-CO')} – ${new Date(endMs).toLocaleTimeString('es-CO')}` +
          `  🖱 ${clicks}(${clicksPct}%)  ⌨ ${keystrokes}(${keysPct}%)  →  ${pct}%`,
          pct >= 70 ? 'color:#22c55e' : pct >= 40 ? 'color:#eab308' : 'color:#ef4444'
        )

        intervals.push({ start: startMs, end: endMs, pct })
      }

      const avg = intervals.length
        ? Math.round(intervals.reduce((s, iv) => s + iv.pct, 0) / intervals.length)
        : 0
      console.log(`Promedio: ${avg}%  |  Intervalos procesados: ${intervals.length}`)
      console.groupEnd()

      setProductivityIntervals(intervals)
    }).catch(err => console.error('[Prod] Error:', err))
  }, [machine, date])

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
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="grid gap-1 w-full sm:min-w-48">
          <Label>Usuario</Label>
          <UserSelect
            users={selectableUsers}
            groups={groups}
            value={selectedUser?.id?.toString()}
            onValueChange={val => {
              setSelectedUser(appusers.find(u => u.id === Number(val)))
              setActualMonitor(null)
            }}
            placeholder="Selecciona un usuario"
          />
        </div>

        <div className="grid gap-1 w-full sm:min-w-48">
          <Label>Equipo</Label>
          <Select
            disabled={!selectedUser}
            value={machine?.serial_number}
            onValueChange={val => {
              setMachine(machines.find(m => m.serial_number === val))
              setActualMonitor(null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedUser ? 'Selecciona un equipo' : 'Primero selecciona un usuario'} />
            </SelectTrigger>
            <SelectContent>
              {machines.map(m => (
                <SelectItem key={m.serial_number} value={m.serial_number}>
                  {machineLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1">
          <Label>Fecha de capturas</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {machine && date && (
        <div className="space-y-4">
          <Select
            value={actualMonitor === null ? 'all' : `${actualMonitor}`}
            onValueChange={val => setActualMonitor(val === 'all' ? null : parseInt(val))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los monitores</SelectItem>
              {Array.from({ length: monitorCount }, (_, i) => (
                <SelectItem key={i + 1} value={`${i + 1}`}>
                  Monitor {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Cargando capturas...</p>
          ) : (
            <ReportScreenshotsList
              machineName={machine.hostname}
              screenshots={filteredScreenshots}
              productivityIntervals={productivityIntervals}
            />
          )}
        </div>
      )}

      {!machine && (
        <p className="text-center text-sm text-muted-foreground py-12">
          Selecciona un usuario y equipo para ver las capturas.
        </p>
      )}
    </div>
  )
}
