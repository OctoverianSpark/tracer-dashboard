'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { saveSchedule, updateSchedule, deleteSchedule } from '@/app/time/actions'
import { AppUser, Group } from '@/types/AppUser'
import { Programation, Schedule } from '@/types/Schedules'
import { Button } from '@/app/_components/_ui/button'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Input } from '@/app/_components/_ui/input'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Label } from '@/app/_components/_ui/label'
import { DayAssignments, DayProgramationPicker } from './shared'
import { Users } from 'lucide-react'

interface Props {
  appuser: AppUser[]
  programations: Programation[]
  schedules: Schedule[]
  groups: Group[]
}

interface Errors {
  days?: string
  users?: string
}

export default function BulkScheduleAssigner({ appuser, programations, schedules, groups }: Props) {
  const [open, setOpen] = useState(false)
  const [dayAssignments, setDayAssignments] = useState<DayAssignments>({})
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
    setSelectedUsers(prev =>
      prev.length === appuser.length ? [] : appuser.map(u => u.id!)
    )
  }

  function reset() {
    setDayAssignments({})
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
    if (Object.keys(dayAssignments).length === 0) next.days  = 'Selecciona al menos un día'
    if (selectedUsers.length === 0)                next.users = 'Selecciona al menos un empleado'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      const days = Object.keys(dayAssignments)
      for (const userId of selectedUsers) {
        const existing = schedules.filter(s => s.appuser_id === userId)

        // Eliminar días que ya no están seleccionados
        for (const s of existing.filter(s => !days.includes(s.day_of_week))) {
          if (s.id) await deleteSchedule(s.id)
        }

        // Actualizar existentes / crear nuevos
        const toSave: Schedule[] = []
        for (const day of days) {
          const programation_id = dayAssignments[day]
          const match = existing.find(s => s.day_of_week === day)
          if (match?.id) {
            await updateSchedule(match.id, { appuser_id: userId, programation_id, day_of_week: day })
          } else {
            toSave.push({ appuser_id: userId, programation_id, day_of_week: day })
          }
        }
        if (toSave.length > 0) await saveSchedule(toSave)
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

  const allSelected = selectedUsers.length === appuser.length

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
