'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { saveSchedule, updateSchedule, deleteSchedule, saveRotationCycle, deleteRotationCycle } from '@/app/time/actions'
import { splitDayAssignments, buildRotationSlots } from '@/lib/dayAssignments'
import { AppUser, Group } from '@/types/AppUser'
import { DayAssignments, Programation, RotationData, Schedule } from '@/types/Schedules'
import { Button } from '@/app/_components/_ui/button'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Input } from '@/app/_components/_ui/input'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Label } from '@/app/_components/_ui/label'
import { DayProgramationPicker } from './shared'
import { Users } from 'lucide-react'

interface Props {
  appuser: AppUser[]
  programations: Programation[]
  schedules: Schedule[]
  rotations: RotationData[]
  groups: Group[]
}

interface Errors {
  days?: string
  users?: string
  rotationStartDate?: string
}

export default function BulkScheduleAssigner({ appuser, programations, schedules, rotations, groups }: Props) {
  const [open, setOpen] = useState(false)
  const [dayAssignments, setDayAssignments] = useState<DayAssignments>({})
  const [rotationStartDate, setRotationStartDate] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<number | null>(null)

  function toggleUser(id: number) {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    )
    setErrors(prev => ({ ...prev, users: undefined }))
  }

  function toggleAll() {
    const filteredIds = filteredUsers.map(u => u.id!)
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedUsers.includes(id))
    setSelectedUsers(prev =>
      allFilteredSelected
        ? prev.filter(id => !filteredIds.includes(id))
        : [...new Set([...prev, ...filteredIds])]
    )
  }

  function reset() {
    setDayAssignments({})
    setRotationStartDate('')
    setSelectedUsers([])
    setErrors({})
    setUserSearch('')
    setGroupFilter(null)
  }

  const filteredUsers = appuser.filter(u => {
    if (groupFilter !== null && u.group_id !== groupFilter) return false
    if (userSearch.trim() && !u.full_name.toLowerCase().includes(userSearch.toLowerCase())) return false
    return true
  })

  function validate(): boolean {
    const next: Errors = {}
    const { rotating } = splitDayAssignments(dayAssignments)
    if (Object.keys(dayAssignments).length === 0) next.days  = 'Selecciona al menos un día'
    if (selectedUsers.length === 0)                next.users = 'Selecciona al menos un empleado'
    if (rotating.some(([, c]) => c.sequence.length < 2)) next.days = 'Cada día rotativo necesita al menos 2 horarios en su secuencia'
    if (rotating.length > 0 && !rotationStartDate) next.rotationStartDate = 'Selecciona la fecha de inicio de la rotación'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      const { fixed, rotating } = splitDayAssignments(dayAssignments)
      const fixedDays = fixed.map(([day]) => day)

      for (const userId of selectedUsers) {
        const existing = schedules.filter(s => s.appuser_id === userId)

        // Eliminar días fijos que ya no están seleccionados (incluye los que pasaron a rotativos)
        for (const s of existing.filter(s => !fixedDays.includes(s.day_of_week))) {
          if (s.id) await deleteSchedule(s.id)
        }

        // Actualizar existentes / crear nuevos días fijos
        const toSave: Schedule[] = []
        for (const [day, c] of fixed) {
          const match = existing.find(s => s.day_of_week === day)
          if (match?.id) {
            await updateSchedule(match.id, { appuser_id: userId, programation_id: c.programation_id, day_of_week: day })
          } else {
            toSave.push({ appuser_id: userId, programation_id: c.programation_id, day_of_week: day })
          }
        }
        if (toSave.length > 0) await saveSchedule(toSave)

        if (rotating.length > 0) {
          await saveRotationCycle(
            {
              appuser_id: userId,
              name: 'Rotación de turnos',
              start_date: rotationStartDate,
              weeks: Math.max(...rotating.map(([, c]) => c.sequence.length)),
            },
            buildRotationSlots(rotating)
          )
        } else {
          const existingCycleId = rotations.find(r => r.cycle.appuser_id === userId)?.cycle.id
          if (existingCycleId) await deleteRotationCycle(existingCycleId)
        }
      }

      toast.success(`Horario asignado a ${selectedUsers.length} empleado${selectedUsers.length > 1 ? 's' : ''}`)
      reset()
      setOpen(false)
    } catch {
      toast.error('Error al guardar los horarios')
    } finally {
      setLoading(false)
    }
  }

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUsers.includes(u.id!))
  const hasRotatingDay = Object.values(dayAssignments).some(c => c.mode === 'rotating')

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Users className="size-4" />
          Asignar en bloque
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogTitle>Asignación en bloque</DialogTitle>

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

        {/* Días y horario */}
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

          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
                onClick={() => setGroupFilter(null)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${groupFilter === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                Todos
              </button>
              {groups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
                  onClick={() => setGroupFilter(groupFilter === g.id ? null : g.id!)}
                  className={`rounded px-2 py-0.5 text-xs transition-colors ${groupFilter === g.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
          <Input
            placeholder="Buscar empleado…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="h-8 text-sm"
          />
          <div className={`rounded-lg border ${errors.users ? 'border-destructive' : 'border-border'} divide-y divide-border max-h-52 overflow-y-auto`}>
            {filteredUsers.length === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">Sin resultados</p>
            )}
            {filteredUsers.map(user => (
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
              {Object.keys(dayAssignments).length > 0 && selectedUsers.length > 0
                ? `${selectedUsers.length * Object.keys(dayAssignments).length} asignaciones`
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
