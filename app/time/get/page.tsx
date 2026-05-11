'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { UserSelect } from '@/components/UserSelect'
import { Card, CardContent } from '@/app/_components/_ui/card'
import { findAsignedMachines } from '@/app/computers/actions'
import { getappuser } from '@/app/app/actions'
import { getGroups } from '@/app/app/groups/actions'
import { getScheduleByappuserId, getProgramationById, getStateLog, getAppUsageLogs } from '@/app/time/actions'
import { getCategorizationApps } from '@/app/supervisors/categorization-actions'
import { Timeline } from '@/components/TimeReporting/Timeline'
import AppUsageList from '@/components/TimeReporting/AppUsageList'
import { Machine, machineLabel } from '@/types/Machine'
import { AppUser, FlatAppUsageLog, Group } from '@/types/AppUser'
import { StateLog } from '@/types/StateLog'
import { Programation } from '@/types/Schedules'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export default function Page() {
  const { data: session }               = useSession()
  const [appuser, setAppuser]           = useState<AppUser[]>([])
  const [groups, setGroups]             = useState<Group[]>([])
  const [computers, setComputers]       = useState<Machine[]>([])
  const [date, setDate]                 = useState<string>('')
  const [logs, setLogs]                 = useState<StateLog[]>([])
  const [usageLogs, setUsageLogs]       = useState<FlatAppUsageLog[]>([])

  const [selectedAppUser, setSelected]  = useState<AppUser | undefined>()
  const [selectedComputer, setComputer] = useState<Machine | undefined>()
  const [programation, setProgramation] = useState<Programation | null>(null)
  const [ignoredApps, setIgnoredApps]   = useState<Set<string>>(new Set())

  const currentUserId   = Number(session?.appUser?.id)
  const currentGroup    = groups.find(g => g.id === session?.appUser?.group_id)
  const blockOwn        = currentGroup?.block_own_reports === true
  const selectableUsers = blockOwn
    ? appuser.filter(u => Number(u.id) !== currentUserId)
    : appuser

  const filteredLogs = useMemo(
    () => date ? logs.filter(log => log.timestamp.startsWith(date)) : [],
    [logs, date]
  )

  useEffect(() => {
    getappuser().then(setAppuser)
    getGroups().then(setGroups)
    getCategorizationApps().then(apps => {
      setIgnoredApps(new Set(apps.filter(a => a.category === 'ignore').map(a => a.name.toLowerCase())))
    })
  }, [])

  useEffect(() => {
    if (!selectedAppUser) return
    setComputer(undefined)
    findAsignedMachines(selectedAppUser.id!).then(machines => {
      setComputers(machines)
      if (machines.length === 1) setComputer(machines[0])
    })
  }, [selectedAppUser])

  useEffect(() => {
    if (!selectedAppUser || !selectedComputer) return
    getStateLog(selectedAppUser.id!, selectedComputer.id!).then(setLogs)
  }, [selectedAppUser, selectedComputer])

  useEffect(() => {
    if (!date || !selectedComputer?.id) { setUsageLogs([]); return }
    getAppUsageLogs(date, selectedComputer.id).then(setUsageLogs)
  }, [date, selectedComputer])

  useEffect(() => {
    if (!selectedAppUser || !date) { setProgramation(null); return }
    const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]
    getScheduleByappuserId(selectedAppUser.id!).then(schedules => {
      const schedule = schedules.find(s => s.day_of_week === dayKey)
      if (!schedule) { setProgramation(null); return }
      getProgramationById(schedule.programation_id).then(setProgramation)
    })
  }, [selectedAppUser, date])

  const showData = selectedComputer && date

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="grid gap-2 w-full sm:min-w-48">
            <Label>Usuario</Label>
            <UserSelect
              users={selectableUsers}
              groups={groups}
              value={selectedAppUser?.id?.toString()}
              onValueChange={val => setSelected(appuser.find(e => e.id === Number(val)))}
              placeholder="Seleccione usuario"
            />
          </div>

          <div className="grid gap-2 w-full sm:min-w-48">
            <Label>Computador</Label>
            <Select
              disabled={!selectedAppUser}
              onValueChange={val => setComputer(computers.find(e => e.id === Number(val)))}
              value={selectedComputer?.id?.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedAppUser ? 'Seleccione equipo' : 'Primero seleccione usuario'} />
              </SelectTrigger>
              <SelectContent>
                {computers.map(computer => (
                  <SelectItem key={computer.id} value={`${computer.id}`}>
                    {machineLabel(computer)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2 w-full sm:w-44">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {showData && (
        <Timeline
          logs={filteredLogs.map(log => ({
            state:     log.state.toString(),
            category:  log.category.toString(),
            timestamp: new Date(log.timestamp).toISOString(),
          }))}
          scheduleStart={programation?.start_day}
          scheduleEnd={programation?.end_day}
        />
      )}

      {showData && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="font-semibold text-sm">Uso de aplicaciones</p>
            <AppUsageList logs={usageLogs} ignoredApps={ignoredApps} />
          </CardContent>
        </Card>
      )}

      {!showData && (
        <p className="text-center text-sm text-muted-foreground py-12">
          Selecciona un usuario, equipo y fecha para ver la actividad.
        </p>
      )}
    </div>
  )
}
