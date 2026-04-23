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

interface AppUserFormProps {
  action: FormActions
  appUser?: AppUser
}

export default function UserForm({ appUser, action }: AppUserFormProps): JSX.Element {
  const [values, setValues] = useState<AppUser>(
    appUser ?? { full_name: '' }
  )
  const [groups,setGroups] = useState<Group[]>([])
  const [roles,setRoles] = useState<Group[]>([])
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
      await saveappuser(values)
      toast.success('Formulario enviado con éxito')
      setErrors({})
      setOpen(false)
    }
  }

  useEffect(()=>{
    const getData = async () => {
        getRoles().then(setRoles)
        getGroups().then(setGroups)
      
      
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
