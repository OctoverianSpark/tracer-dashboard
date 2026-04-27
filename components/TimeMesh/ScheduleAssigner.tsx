'use client'
import { saveSchedule } from '@/app/time/actions'
import { Programation, Schedule } from '@/types/Schedules'
import { AppUser } from '@/types/AppUser'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Button } from '@/app/_components/_ui/button'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { WeekPicker } from './Weekpicker'
import { DIAS } from './shared'

interface Props {
  appuser: AppUser[]
  programations: Programation[]
  schedules: Schedule[]
}

interface AssignerErrors {
  appuser?: string
  programation?: string
  days?: string
}

export default function ScheduleAssigner({ appuser, programations, schedules }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedappuser, setSelectedappuser] = useState<number | null>(null)
  const [selectedProgramation, setSelectedProgramation] = useState<number | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [errors, setErrors] = useState<AssignerErrors>({})

  // Al seleccionar empleado, autocompleta programacion y dias
  useEffect(() => {
    if (selectedappuser) {
      const schedulesOfappuser = schedules.filter(s => s.appuser_id === selectedappuser)
      if (schedulesOfappuser.length > 0) {
        const programationId = schedulesOfappuser[0].programation_id!
        setSelectedProgramation(programationId)
        setSelectedDays(
          schedulesOfappuser
            .filter(s => s.programation_id === programationId)
            .map(s => s.day_of_week)
        )
      } else {
        setSelectedProgramation(null)
        setSelectedDays([])
      }
    }
  }, [selectedappuser])

  // Al cambiar la programacion, actualiza los dias
  useEffect(() => {
    if (selectedappuser && selectedProgramation) {
      const days = schedules
        .filter(s => s.appuser_id === selectedappuser && s.programation_id === selectedProgramation)
        .map(s => s.day_of_week)
      setSelectedDays(days)
    }
  }, [selectedProgramation])

  function validate(): boolean {
    const newErrors: AssignerErrors = {}
    if (!selectedappuser)         newErrors.appuser      = 'Selecciona un empleado'
    if (!selectedProgramation)    newErrors.programation = 'Selecciona un horario'
    if (selectedDays.length === 0) newErrors.days         = 'Selecciona al menos un día'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function asignSchedule() {
    if (!validate()) return
    const payload: Schedule[] = selectedDays.map(day => ({
      appuser_id: selectedappuser!,
      programation_id: selectedProgramation!,
      day_of_week: day
    }))
    await saveSchedule(payload)
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

        <div className="flex gap-2">
          <div className="grid gap-1 flex-1">
            <Label>Empleado</Label>
            <Select
              onValueChange={val => {
                setSelectedappuser(Number(val))
                setErrors(prev => ({ ...prev, appuser: undefined }))
              }}
              value={selectedappuser?.toString() ?? ''}
            >
              <SelectTrigger className={errors.appuser ? 'border-destructive' : ''}>
                <SelectValue placeholder='Seleccionar empleado' />
              </SelectTrigger>
              <SelectContent>
                {appuser.map(employee => (
                  <SelectItem key={employee.id} value={employee.id!.toString()}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.appuser && <span className="text-xs text-destructive">{errors.appuser}</span>}
          </div>

          <div className="grid gap-1 flex-1">
            <Label>Tipo de Horario</Label>
            <Select
              onValueChange={val => {
                setSelectedProgramation(Number(val))
                setErrors(prev => ({ ...prev, programation: undefined }))
              }}
              value={selectedProgramation?.toString() ?? ''}
            >
              <SelectTrigger className={errors.programation ? 'border-destructive' : ''}>
                <SelectValue placeholder='Selecciona un horario' />
              </SelectTrigger>
              <SelectContent>
                {programations?.map(p => (
                  <SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.programation && <span className="text-xs text-destructive">{errors.programation}</span>}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Días</Label>
          <WeekPicker
            selected={selectedDays}
            onChange={days => {
              setSelectedDays(days)
              setErrors(prev => ({ ...prev, days: undefined }))
            }}
            values={DIAS}
          />
          {errors.days && <span className="text-xs text-destructive">{errors.days}</span>}
        </div>

        <Button onClick={asignSchedule}>Asignar</Button>
      </DialogContent>
    </Dialog>
  )
}