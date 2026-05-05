'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getMachineReport, findAsignedMachines } from '../computers/actions'
import { getappuser } from '../app/actions'
import { getGroups } from '../app/groups/actions'
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
  const [screenshots, setScreenshots]     = useState<string[]>([])
  const [actualMonitor, setActualMonitor] = useState<number | null>(null)
  const [loading, setLoading]             = useState(false)

  const currentUserId    = Number(session?.appUser?.id)
  const currentGroup     = groups.find(g => g.id === session?.appUser?.group_id)
  const blockOwn         = currentGroup?.block_own_reports === true
  const selectableUsers  = blockOwn
    ? appusers.filter(u => Number(u.id) !== currentUserId)
    : appusers

  useEffect(() => {
    getappuser().then(setAppusers)
    getGroups().then(setGroups)
  }, [])

  useEffect(() => {
    if (!selectedUser) return
    setMachine(undefined)
    setScreenshots([])
    setActualMonitor(null)
    findAsignedMachines(selectedUser.id!).then(setMachines)
  }, [selectedUser])

  useEffect(() => {
    if (!machine) return
    setLoading(true)
    getMachineReport(machine.hostname, date)
      .then(data => setScreenshots(data.files ?? []))
      .finally(() => setLoading(false))
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
      <div className="flex gap-3 flex-wrap">
        <div className="grid gap-1 min-w-48">
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

        <div className="grid gap-1 min-w-48">
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
            <ReportScreenshotsList machineName={machine.hostname} screenshots={filteredScreenshots} />
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
