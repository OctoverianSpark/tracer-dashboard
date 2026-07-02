'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { saveRotationCycle, deleteRotationCycle } from '@/app/time/actions'
import { Programation, RotationData, RotationSlot } from '@/types/Schedules'
import { AppUser, Group } from '@/types/AppUser'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Button } from '@/app/_components/_ui/button'
import { Label } from '@/app/_components/_ui/label'
import { Input } from '@/app/_components/_ui/input'
import { UserSelect } from '@/components/UserSelect'
import { DayAssignments, DayProgramationPicker } from './shared'
import { RefreshCw } from 'lucide-react'

interface Props {
  appuser: AppUser[]
  programations: Programation[]
  rotations: RotationData[]
  groups: Group[]
}

interface Errors {
  appuser?: string
  startDate?: string
}

const MIN_WEEKS = 2
const MAX_WEEKS = 6

function slotsToWeeks(slots: RotationSlot[], weeks: number): DayAssignments[] {
  const result: DayAssignments[] = Array.from({ length: weeks }, () => ({}))
  for (const s of slots) {
    if (s.week_index < weeks) result[s.week_index][s.day_of_week] = s.programation_id
  }
  return result
}

export default function RotationAssigner({ appuser, programations, rotations, groups }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedappuser, setSelectedappuser] = useState<number | null>(null)
  const [existingCycleId, setExistingCycleId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [weeks, setWeeks] = useState(MIN_WEEKS)
  const [weekAssignments, setWeekAssignments] = useState<DayAssignments[]>([{}, {}])
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  function reset() {
    setSelectedappuser(null)
    setExistingCycleId(null)
    setName('')
    setStartDate('')
    setWeeks(MIN_WEEKS)
    setWeekAssignments([{}, {}])
    setErrors({})
  }

  function handleSelectappuser(id: number) {
    setSelectedappuser(id)
    setErrors(prev => ({ ...prev, appuser: undefined }))

    const existing = rotations.find(r => r.cycle.appuser_id === id)
    if (existing) {
      setExistingCycleId(existing.cycle.id!)
      setName(existing.cycle.name)
      setStartDate(existing.cycle.start_date)
      setWeeks(existing.cycle.weeks)
      setWeekAssignments(slotsToWeeks(existing.slots, existing.cycle.weeks))
    } else {
      setExistingCycleId(null)
      setName('')
      setStartDate('')
      setWeeks(MIN_WEEKS)
      setWeekAssignments([{}, {}])
    }
  }

  function handleWeeksChange(value: number) {
    const next = Math.min(Math.max(value || MIN_WEEKS, MIN_WEEKS), MAX_WEEKS)
    setWeeks(next)
    setWeekAssignments(prev => {
      const copy = prev.slice(0, next)
      while (copy.length < next) copy.push({})
      return copy
    })
  }

  function validate(): boolean {
    const next: Errors = {}
    if (!selectedappuser) next.appuser = 'Selecciona un empleado'
    if (!startDate)       next.startDate = 'Selecciona la fecha de inicio del ciclo'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      const slots = weekAssignments.flatMap((days, week_index) =>
        Object.entries(days).map(([day_of_week, programation_id]) => ({
          week_index,
          day_of_week,
          programation_id,
        }))
      )
      await saveRotationCycle(
        {
          appuser_id: selectedappuser!,
          name: name || 'Rotación de turnos',
          start_date: startDate,
          weeks,
        },
        slots
      )
      toast.success('Rotación guardada')
      reset()
      setOpen(false)
    } catch {
      toast.error('Error al guardar la rotación')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!existingCycleId) return
    setLoading(true)
    try {
      await deleteRotationCycle(existingCycleId)
      toast.success('Rotación eliminada, el empleado vuelve a su horario fijo')
      reset()
      setOpen(false)
    } catch {
      toast.error('Error al eliminar la rotación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <RefreshCw className="size-4" />
          Rotación de turnos
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogTitle>Rotación de turnos</DialogTitle>

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

        <div className="flex flex-wrap gap-3">
          <div className="grid gap-1 flex-1 min-w-40">
            <Label>Nombre del ciclo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Rotación mañana/tarde" />
          </div>
          <div className="grid gap-1">
            <Label>Inicio del ciclo</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value)
                setErrors(prev => ({ ...prev, startDate: undefined }))
              }}
              className={errors.startDate ? 'border-destructive' : ''}
            />
            {errors.startDate && <span className="text-xs text-destructive">{errors.startDate}</span>}
          </div>
          <div className="grid gap-1 w-24">
            <Label>Semanas</Label>
            <Input
              type="number"
              min={MIN_WEEKS}
              max={MAX_WEEKS}
              value={weeks}
              onChange={e => handleWeeksChange(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-3">
          {weekAssignments.map((days, i) => (
            <div key={i} className="grid gap-1">
              <Label>Semana {i + 1}</Label>
              <DayProgramationPicker
                programations={programations}
                value={days}
                onChange={next => setWeekAssignments(prev => prev.map((d, idx) => idx === i ? next : d))}
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          El ciclo se repite indefinidamente desde la fecha de inicio: al terminar la Semana {weeks} vuelve a la Semana 1.
          Un día sin horario marcado en su semana queda libre.
        </p>

        <div className="flex gap-2">
          {existingCycleId && (
            <Button variant="destructive" onClick={handleDelete} disabled={loading} className="flex-1">
              Quitar rotación
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? 'Guardando...' : 'Guardar rotación'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
