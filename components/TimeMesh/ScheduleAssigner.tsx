'use client'
import { saveSchedule, saveRotationCycle, deleteRotationCycle } from '@/app/time/actions'
import { splitDayAssignments, buildRotationSlots, loadDayAssignments } from '@/lib/dayAssignments'
import { DayAssignments, Programation, RotationData, Schedule } from '@/types/Schedules'
import { AppUser, Group } from '@/types/AppUser'
import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Button } from '@/app/_components/_ui/button'
import { Label } from '@/app/_components/_ui/label'
import { Input } from '@/app/_components/_ui/input'
import { UserSelect } from '@/components/UserSelect'
import { DayProgramationPicker } from './shared'

interface Props {
  appuser: AppUser[]
  programations: Programation[]
  schedules: Schedule[]
  rotations: RotationData[]
  groups: Group[]
}

interface AssignerErrors {
  appuser?: string
  days?: string
  rotationStartDate?: string
}

export default function ScheduleAssigner({ appuser, programations, schedules, rotations, groups }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedappuser, setSelectedappuser] = useState<number | null>(null)
  const [dayAssignments, setDayAssignments] = useState<DayAssignments>({})
  const [rotationCycleId, setRotationCycleId] = useState<number | null>(null)
  const [rotationStartDate, setRotationStartDate] = useState('')
  const [errors, setErrors] = useState<AssignerErrors>({})

  // Al seleccionar empleado, autocompleta lo ya asignado: días fijos desde Schedule,
  // días rotativos (con su secuencia y cadencia) desde el RotationCycle activo si tiene uno.
  function handleSelectappuser(id: number) {
    setSelectedappuser(id)
    setErrors(prev => ({ ...prev, appuser: undefined }))

    const loaded = loadDayAssignments(id, schedules, rotations)
    setDayAssignments(loaded.assignments)
    setRotationCycleId(loaded.rotationCycleId)
    setRotationStartDate(loaded.rotationStartDate)
  }

  function validate(): boolean {
    const newErrors: AssignerErrors = {}
    const { rotating } = splitDayAssignments(dayAssignments)
    if (!selectedappuser)                          newErrors.appuser = 'Selecciona un empleado'
    if (Object.keys(dayAssignments).length === 0)  newErrors.days    = 'Selecciona al menos un día'
    if (rotating.some(([, c]) => c.sequence.length < 2)) newErrors.days = 'Cada día rotativo necesita al menos 2 horarios en su secuencia'
    if (rotating.length > 0 && !rotationStartDate) newErrors.rotationStartDate = 'Selecciona la fecha de inicio de la rotación'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function asignSchedule() {
    if (!validate()) return

    const { fixed, rotating } = splitDayAssignments(dayAssignments)

    // El backend hace upsert por (appuser_id, day_of_week):
    // si el día ya existe lo actualiza, si no lo crea.
    // Los días no incluidos en este envío quedan intactos.
    if (fixed.length > 0) {
      await saveSchedule(
        fixed.map(([day, c]) => ({
          appuser_id: selectedappuser!,
          programation_id: c.programation_id,
          day_of_week: day,
        }))
      )
    }

    if (rotating.length > 0) {
      await saveRotationCycle(
        {
          appuser_id: selectedappuser!,
          name: 'Rotación de turnos',
          start_date: rotationStartDate,
          weeks: Math.max(...rotating.map(([, c]) => c.sequence.length)),
        },
        buildRotationSlots(rotating)
      )
    } else if (rotationCycleId) {
      await deleteRotationCycle(rotationCycleId)
    }

    setOpen(false)
    toast.success('Horario asignado a empleado')
  }

  const hasRotatingDay = Object.values(dayAssignments).some(c => c.mode === 'rotating')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Asignar Horarios</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

        {hasRotatingDay && (
          <div className="grid gap-1">
            <Label>Inicio de la rotación</Label>
            <Input
              type="date"
              value={rotationStartDate}
              onChange={e => {
                setRotationStartDate(e.target.value)
                setErrors(prev => ({ ...prev, rotationStartDate: undefined }))
              }}
              className={errors.rotationStartDate ? 'border-destructive' : ''}
            />
            {errors.rotationStartDate && <span className="text-xs text-destructive">{errors.rotationStartDate}</span>}
          </div>
        )}

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
