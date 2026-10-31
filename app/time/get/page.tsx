'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { UserSelect } from '@/components/UserSelect'
import { Card, CardContent } from '@/app/_components/_ui/card'
import { findAsignedMachines } from '@/app/computers/actions'
import { getappuser } from '@/app/app/actions'
import { getGroups, getGroupVisibility } from '@/app/app/groups/actions'
import { getScheduleByappuserId, getProgramationById, getStateLog, getAppUsageLogs } from '@/app/time/actions'
import { getCategorizationApps } from '@/app/supervisors/categorization-actions'
import { getStates, getStateCategories } from '@/app/states/actions'
import { Timeline } from '@/components/TimeReporting/Timeline'
import AppUsageList from '@/components/TimeReporting/AppUsageList'
import { Machine, machineDisplayName } from '@/types/Machine'
import { AppUser, FlatAppUsageLog, Group } from '@/types/AppUser'
import { StateLog } from '@/types/StateLog'
import { Programation } from '@/types/Schedules'
import { StateCategory, WorkState } from '@/types/States'
import { bogotaDateOf, BOGOTA_OFFSET_MINUTES } from '@/lib/bogotaTime'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export default function Page() {
  const { data: session }               = useSession()
  const [appuser, setAppuser]           = useState<AppUser[]>([])
  const [groups, setGroups]             = useState<Group[]>([])
  const [computers, setComputers]       = useState<Machine[]>([])
  const [date, setDate]                 = useState<string>('')
  // Logs de TODOS los equipos del usuario, cada uno con su equipo — la malla los empalma.
  const [logs, setLogs]                 = useState<Array<{ log: StateLog; machine: Machine }>>([])
  const [usageLogs, setUsageLogs]       = useState<FlatAppUsageLog[]>([])
  const [states, setStates]             = useState<WorkState[]>([])
  const [categories, setCategories]     = useState<StateCategory[]>([])

  const [selectedAppUser, setSelected]  = useState<AppUser | undefined>()
  const [programation, setProgramation] = useState<Programation | null>(null)
  const [ignoredApps, setIgnoredApps]   = useState<Set<string>>(new Set())

  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>([])

  const currentUserId   = Number(session?.appUser?.id)
  const currentGroup    = groups.find(g => g.id === session?.appUser?.group_id)
  const blockOwn        = currentGroup?.block_own_reports === true

  // "Grupos visibles" es una lista de grupos ADICIONALES al propio, no un reemplazo — si no
  // se incluye explícitamente el propio group_id, uno termina sin poder verse ni a sí mismo.
  const ownGroupId = session?.appUser?.group_id != null ? Number(session.appUser.group_id) : null
  const visibilityFiltered = visibleGroupIds.length > 0
    ? appuser.filter(u => u.group_id != null && (visibleGroupIds.includes(Number(u.group_id)) || Number(u.group_id) === ownGroupId))
    : appuser
  const selectableUsers = blockOwn
    ? visibilityFiltered.filter(u => Number(u.id) !== currentUserId)
    : visibilityFiltered

  // Fecha calendario LOCAL del equipo, no el prefijo UTC crudo del timestamp (que corría al día
  // siguiente cualquier log desde las 19:00 hora Colombia).
  const filteredLogs = useMemo(
    () => date
      ? logs.filter(({ log, machine }) => bogotaDateOf(log.timestamp, machine.timezone_offset_minutes ?? BOGOTA_OFFSET_MINUTES) === date)
      : [],
    [logs, date]
  )

  useEffect(() => {
    getappuser().then(setAppuser)
    getGroups().then(setGroups)
    getCategorizationApps().then(apps => {
      setIgnoredApps(new Set(apps.filter(a => a.category === 'ignore').map(a => a.name.toLowerCase())))
    })
    // Catálogo único y global de estados/categorías — no depende del usuario ni grupo mostrado.
    getStates().then(setStates)
    getStateCategories().then(setCategories)
  }, [])

  useEffect(() => {
    const groupId = session?.appUser?.group_id
    if (groupId != null) {
      getGroupVisibility(Number(groupId)).then(setVisibleGroupIds)
    }
  }, [session?.appUser?.group_id])

  useEffect(() => {
    if (!selectedAppUser) return
    findAsignedMachines(selectedAppUser.id!).then(setComputers)
  }, [selectedAppUser])

  // Solo el día pedido (±1 por zona horaria, se recorta arriba con filteredLogs) en vez del
  // historial completo de cada equipo.
  useEffect(() => {
    if (!selectedAppUser || !date || computers.length === 0) return
    let cancelled = false
    const shift = (d: string, days: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)
    Promise.all(computers.filter(m => m.id != null).map(machine =>
      getStateLog(selectedAppUser.id!, Number(machine.id), shift(date, -1), shift(date, 1))
        .then(raw => (Array.isArray(raw) ? raw as StateLog[] : []).map(log => ({ log, machine })))
        .catch(() => [])
    )).then(perMachine => { if (!cancelled) setLogs(perMachine.flat()) })
    return () => { cancelled = true }
  }, [selectedAppUser, computers, date])

  useEffect(() => {
    if (!date || computers.length === 0) return
    let cancelled = false
    Promise.all(computers.filter(m => m.id != null).map(m => getAppUsageLogs(date, Number(m.id)).catch(() => [])))
      .then(perMachine => { if (!cancelled) setUsageLogs(perMachine.flat()) })
    return () => { cancelled = true }
  }, [date, computers])

  useEffect(() => {
    if (!selectedAppUser || !date) { setProgramation(null); return }
    const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]
    getScheduleByappuserId(selectedAppUser.id!).then(schedules => {
      const schedule = schedules.find(s => s.day_of_week === dayKey)
      if (!schedule) { setProgramation(null); return }
      getProgramationById(schedule.programation_id).then(setProgramation)
    })
  }, [selectedAppUser, date])

  const showData = selectedAppUser && date && computers.length > 0

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
              onValueChange={val => {
                setSelected(appuser.find(e => e.id === Number(val)))
                setComputers([])
                setLogs([])
                setUsageLogs([])
              }}
              placeholder="Seleccione usuario"
            />
          </div>
        </div>

        <div className="grid gap-2 w-full sm:w-44">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setLogs([]); setUsageLogs([]) }}
          />
        </div>
      </div>

      {showData && (
        <Timeline
          logs={filteredLogs.map(({ log, machine }) => ({
            state:     String(log.code),
            category:  log.category?.key ?? '',
            timestamp: new Date(log.timestamp).toISOString(),
            machine:   machineDisplayName(machine),
          }))}
          scheduleStart={programation?.start_day}
          scheduleEnd={programation?.end_day}
          states={states}
          categories={categories}
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
          {selectedAppUser && computers.length === 0
            ? 'Este usuario no tiene equipos asignados.'
            : 'Selecciona un usuario y una fecha para ver la actividad.'}
        </p>
      )}
    </div>
  )
}
