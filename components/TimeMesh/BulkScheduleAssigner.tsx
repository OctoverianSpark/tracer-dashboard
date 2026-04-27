'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { saveSchedule } from '@/app/time/actions'
import { AppUser } from '@/types/AppUser'
import { Programation, Schedule } from '@/types/Schedules'
import { Button } from '@/app/_components/_ui/button'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { WeekPicker } from './Weekpicker'
import { DIAS } from './shared'
import { Users } from 'lucide-react'

interface Props {
  appuser: AppUser[]
  programations: Programation[]
}

interface Errors {
  programation?: string
  days?: string
  users?: string
}

export default function BulkScheduleAssigner({ appuser, programations }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedProgramation, setSelectedProgramation] = useState<number | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  function toggleUser(id: number) {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    )
    setErrors(prev => ({ ...prev, users: undefined }))
  }

  function toggleAll() {
    setSelectedUsers(prev =>
      prev.length === appuser.length ? [] : appuser.map(u => u.id!)
    )
  }

  function reset() {
    setSelectedProgramation(null)
    setSelectedDays([])
    setSelectedUsers([])
    setErrors({})
  }

  function validate(): boolean {
    const next: Errors = {}
    if (!selectedProgramation)     next.programation = 'Selecciona un horario'
    if (selectedDays.length === 0) next.days         = 'Selecciona al menos un día'
    if (selectedUsers.length === 0) next.users       = 'Selecciona al menos un empleado'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    const payload: Schedule[] = selectedUsers.flatMap(userId =>
      selectedDays.map(day => ({
        appuser_id:      userId,
        programation_id: selectedProgramation!,
        day_of_week:     day,
      }))
    )
    try {
      await saveSchedule(payload)
      toast.success(`Horario asignado a ${selectedUsers.length} empleado${selectedUsers.length > 1 ? 's' : ''}`)
      reset()
      setOpen(false)
    } catch {
      toast.error('Error al guardar los horarios')
    } finally {
      setLoading(false)
    }
  }

  const allSelected = selectedUsers.length === appuser.length
  const someSelected = selectedUsers.length > 0 && !allSelected

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Users className="size-4" />
          Asignar en bloque
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogTitle>Asignación en bloque</DialogTitle>

        {/* Horario y días */}
        <div className="flex gap-3">
          <div className="grid gap-1 flex-1">
            <Label>Horario</Label>
            <Select
              onValueChange={val => {
                setSelectedProgramation(Number(val))
                setErrors(prev => ({ ...prev, programation: undefined }))
              }}
              value={selectedProgramation?.toString() ?? ''}
            >
              <SelectTrigger className={errors.programation ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecciona un horario" />
              </SelectTrigger>
              <SelectContent>
                {programations.map(p => (
                  <SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.programation && (
              <span className="text-xs text-destructive">{errors.programation}</span>
            )}
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

        {/* Lista de empleados */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Empleados</Label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          <div className={`rounded-lg border ${errors.users ? 'border-destructive' : 'border-border'} divide-y divide-border max-h-52 overflow-y-auto`}>
            {appuser.map(user => (
              <label
                key={user.id}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id!)}
                  onCheckedChange={() => toggleUser(user.id!)}
                />
                <span className="text-sm">{user.full_name}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between">
            {errors.users
              ? <span className="text-xs text-destructive">{errors.users}</span>
              : <span className="text-xs text-muted-foreground">
                  {selectedUsers.length} de {appuser.length} seleccionado{selectedUsers.length !== 1 ? 's' : ''}
                </span>
            }
            <span className="text-xs text-muted-foreground">
              {selectedDays.length > 0 && selectedUsers.length > 0
                ? `${selectedUsers.length * selectedDays.length} asignaciones`
                : ''}
            </span>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Guardando...' : 'Guardar asignaciones'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
