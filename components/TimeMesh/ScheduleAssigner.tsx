'use client'
import { saveSchedule } from '@/app/time/actions'
import { Programation, Schedule } from '@/types/Schedules'
import { AppUser, Group } from '@/types/AppUser'
import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Button } from '@/app/_components/_ui/button'
import { Label } from '@/app/_components/_ui/label'
import { UserSelect } from '@/components/UserSelect'
import { DayAssignments, DayProgramationPicker } from './shared'

interface Props {
  appuser: AppUser[]
  programations: Programation[]
  schedules: Schedule[]
  groups: Group[]
}

interface AssignerErrors {
  appuser?: string
  days?: string
}

export default function ScheduleAssigner({ appuser, programations, schedules, groups }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedappuser, setSelectedappuser] = useState<number | null>(null)
  const [dayAssignments, setDayAssignments] = useState<DayAssignments>({})
  const [errors, setErrors] = useState<AssignerErrors>({})

  // Al seleccionar empleado, autocompleta el horario asignado por día (puede variar por día)
  function handleSelectappuser(id: number) {
    setSelectedappuser(id)
    setErrors(prev => ({ ...prev, appuser: undefined }))

    const map: DayAssignments = {}
    for (const s of schedules.filter(s => s.appuser_id === id)) map[s.day_of_week] = s.programation_id
    setDayAssignments(map)
  }

  function validate(): boolean {
    const newErrors: AssignerErrors = {}
    if (!selectedappuser)                          newErrors.appuser = 'Selecciona un empleado'
    if (Object.keys(dayAssignments).length === 0)  newErrors.days    = 'Selecciona al menos un día'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function asignSchedule() {
    if (!validate()) return

    // El backend hace upsert por (appuser_id, day_of_week):
    // si el día ya existe lo actualiza, si no lo crea.
    // Los días no incluidos en este envío quedan intactos.
    await saveSchedule(
      Object.entries(dayAssignments).map(([day, programation_id]) => ({
        appuser_id: selectedappuser!,
        programation_id,
        day_of_week: day,
      }))
    )

    setOpen(false)
    toast.success('Horario asignado a empleado')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Asignar Horarios</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>Asignar Horarios al empleado</DialogTitle>

        <div className="grid gap-1">
          <Label>Empleado</Label>
          <UserSelect
            users={appuser}
            groups={groups}
            value={selectedappuser?.toString() ?? ''}
            onValueChange={val => handleSelectappuser(Number(val))}
            placeholder="Seleccionar empleado"
            error={!!errors.appuser}
          />
          {errors.appuser && <span className="text-xs text-destructive">{errors.appuser}</span>}
        </div>

        <div className="grid gap-2">
          <Label>Días y horario</Label>
          <DayProgramationPicker
            programations={programations}
            value={dayAssignments}
            onChange={days => {
              setDayAssignments(days)
              setErrors(prev => ({ ...prev, days: undefined }))
            }}
            error={errors.days}
          />
        </div>

        <Button onClick={asignSchedule}>Asignar</Button>
      </DialogContent>
    </Dialog>
  )
}