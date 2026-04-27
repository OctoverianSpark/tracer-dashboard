'use client'
import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { findAsignedMachines } from '@/app/computers/actions'
import { getappuser } from '@/app/app/actions'
import { getScheduleByappuserId, getProgramationById, getStateLog } from '@/app/time/actions'
import { Timeline } from '@/components/TimeReporting/Timeline'
import { Machine } from '@/types/Machine'
import { AppUser } from '@/types/AppUser'
import { StateLog } from '@/types/StateLog'
import { Programation } from '@/types/Schedules'

// Mapea getDay() → clave de día (L M X J V S D)
const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export default function Page() {
  const [appuser, setAppuser]               = useState<AppUser[]>([])
  const [computers, setComputers]           = useState<Machine[]>([])
  const [date, setDate]                     = useState<string>('')
  const [logs, setLogs]                     = useState<StateLog[]>([])
  const [selectedAppUser, setSelected]      = useState<AppUser | undefined>()
  const [selectedComputer, setComputer]     = useState<Machine | undefined>()
  const [programation, setProgramation]     = useState<Programation | null>(null)

  const filteredLogs = useMemo(
    () => date ? logs.filter(log => log.timestamp.startsWith(date)) : [],
    [logs, date]
  )

  // Carga inicial de usuarios
  useEffect(() => {
    getappuser().then(setAppuser)
  }, [])

  // Al cambiar usuario: resetea computador y carga sus máquinas
  useEffect(() => {
    if (!selectedAppUser) return
    setComputer(undefined)
    findAsignedMachines(selectedAppUser.id!).then(setComputers)
  }, [selectedAppUser])

  // Al cambiar usuario+computador: carga logs
  useEffect(() => {
    if (!selectedAppUser || !selectedComputer) return
    getStateLog(selectedAppUser.id!, selectedComputer.id!).then(setLogs)
  }, [selectedAppUser, selectedComputer])

  // Al cambiar usuario+fecha: busca la malla del día para marcar en la línea de tiempo
  useEffect(() => {
    if (!selectedAppUser || !date) { setProgramation(null); return }

    // Agrega T12:00:00 para evitar desfase de zona horaria al parsear la fecha
    const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]

    getScheduleByappuserId(selectedAppUser.id!).then(schedules => {
      const schedule = schedules.find(s => s.day_of_week === dayKey)
      if (!schedule) { setProgramation(null); return }
      getProgramationById(schedule.programation_id).then(setProgramation)
    })
  }, [selectedAppUser, date])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-4">
          <div className="grid gap-2 min-w-48">
            <Label>Usuario</Label>
            <Select
              onValueChange={val => setSelected(appuser.find(e => e.id === Number(val)))}
              value={selectedAppUser?.id?.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione usuario" />
              </SelectTrigger>
              <SelectContent>
                {appuser.map(employee => (
                  <SelectItem key={employee.id} value={`${employee.id}`}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 min-w-48">
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
                {computers.map((computer, i) => (
                  <SelectItem key={computer.id} value={`${computer.id}`}>
                    {computer.hostname ?? `Computador ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2 w-44">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {selectedComputer && date && (
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

      {!selectedComputer && (
        <p className="text-center text-sm text-muted-foreground py-12">
          Selecciona un usuario, equipo y fecha para ver la actividad.
        </p>
      )}
    </div>
  )
}
