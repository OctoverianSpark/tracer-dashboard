'use client'
import { Button } from '@/app/_components/_ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { saveappuser } from '@/app/app/actions'
import { FormActions } from '@/types/Global'
import { AppUser, Group } from '@/types/AppUser'
import { Pencil } from 'lucide-react'
import React, { ChangeEventHandler, JSX, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { getRoles } from '@/app/app/roles/actions'
import { getGroups } from '@/app/app/groups/actions'
import { getProgramations, saveSchedule } from '@/app/time/actions'
import { Programation } from '@/types/Schedules'

interface AppUserFormProps {
  action: FormActions
  appUser?: AppUser
}

// Días hábiles a los que se aplica el horario elegido al crear la persona — cubre el caso
// común (un solo turno de lunes a viernes); turnos con fin de semana o rotativos se siguen
// ajustando después desde ScheduleAssigner, que ya soporta eso.
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V']

export default function UserForm({ appUser, action }: AppUserFormProps): JSX.Element {
  const [values, setValues] = useState<AppUser>(
    appUser ?? { full_name: '' }
  )
  const [groups,setGroups] = useState<Group[]>([])
  const [roles,setRoles] = useState<Group[]>([])
  const [programations, setProgramations] = useState<Programation[]>([])
  const [programationId, setProgramationId] = useState<number | undefined>()
  const [errors, setErrors] = useState<Partial<Record<keyof AppUser, string>>>({})
  const [open, setOpen] = useState(false)

  const onInputChange: ChangeEventHandler<HTMLInputElement> = e => {
    setValues(prev => ({ ...prev, [e.target.id]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.id]: undefined }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AppUser, string>> = {}
    if (!values.full_name)         newErrors.full_name         = 'El nombre es requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Corrige los errores antes de enviar el formulario")
    } else {
      const saved = await saveappuser(values)

      // Solo al crear: si se eligió un horario, se asigna de una vez en vez de dejarlo para un
      // segundo paso aparte en ScheduleAssigner.
      const newAppuserId = saved?.id
      if (action === FormActions.SAVE && programationId && newAppuserId) {
        await saveSchedule(
          WEEKDAYS.map(day_of_week => ({
            appuser_id: newAppuserId,
            programation_id: programationId,
            day_of_week,
          }))
        )
      }

      toast.success('Formulario enviado con éxito')
      setErrors({})
      setOpen(false)
    }
  }

  useEffect(()=>{
    const getData = async () => {
        getRoles().then(setRoles)
        getGroups().then(setGroups)
        getProgramations().then(setProgramations)


    }
    getData()
  },[])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {action === FormActions.SAVE ? (
        <DialogTrigger className='cursor-pointer'>
          <span>Registrar usuario</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant='ghost' className='cursor-pointer'>
            <Pencil />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === FormActions.SAVE ? 'Registro' : 'Edición'} de empleado
          </DialogTitle>
        </DialogHeader>
        <div className='grid gap-7'>

          <div className='grid gap-3'>
            <Label htmlFor='full_name'>Nombre Completo</Label>
            <Input
              id='full_name'
              onChange={onInputChange}
              value={values.full_name}
              className={errors.full_name ? 'border-red-500' : ''}
            />
            {errors.full_name && <span className='text-xs text-red-500'>{errors.full_name}</span>}
          </div>

          <div className='grid gap-3'>
            <Label htmlFor='email'>Correo</Label>
            <Input
              type='email'
              id='email'
              onChange={onInputChange}
              value={values.email}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <span className='text-xs text-red-500'>{errors.email}</span>}
          </div>
          <div className="flex gap-3">
            
          <div className="grid gap-3">
            <Label>Grupo</Label>
            <Select onValueChange={(val)=>setValues((prev)=>{
              return {
                ...prev,
                'group_id':Number(val)
              }
            })}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Seleccione' />
              </SelectTrigger>
               <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={`${group.id}`}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label>Rol</Label>
            <Select onValueChange={(val)=>setValues((prev)=>{
              return {
                ...prev,
                'role_id':Number(val)
              }
            })}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Seleccione'/>
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.id} value={`${role.id}`}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>

          {action === FormActions.SAVE && (
            <div className="grid gap-3">
              <Label>Horario (opcional)</Label>
              <Select onValueChange={val => setProgramationId(Number(val))}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Sin asignar por ahora' />
                </SelectTrigger>
                <SelectContent>
                  {programations.map(p => (
                    <SelectItem key={p.id} value={`${p.id}`}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Se asigna de lunes a viernes. Para fines de semana o turnos rotativos, ajústalo
                después desde Horarios.
              </p>
            </div>
          )}

        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className='cursor-pointer'>
            {action === FormActions.SAVE ? 'Registrar' : 'Actualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
