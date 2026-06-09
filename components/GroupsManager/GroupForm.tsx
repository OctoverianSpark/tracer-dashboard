'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Switch } from '@/app/_components/_ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { saveGroup } from '@/app/app/groups/actions'
import { Group } from '@/types/AppUser'
import { Pencil, Plus } from 'lucide-react'
import React, { ChangeEventHandler, useState } from 'react'
import { toast } from 'sonner'

interface GroupFormProps {
  group?: Group
  allGroups?: Group[]
}

const EMPTY_GROUP: Group = { name: '' }

export default function GroupForm({ group, allGroups = [] }: GroupFormProps) {

  const [values, setValues] = useState<Group>(group ?? EMPTY_GROUP)
  const [open, setOpen] = useState<boolean>(false)
  const [errors, setErrors] = useState<Partial<Record<keyof Group, string>>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const newErrors: Partial<Record<keyof Group, string>> = {}
    if (!values.name) newErrors.name = 'El nombre del grupo es necesario'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onInputChange: ChangeEventHandler<HTMLInputElement> = e => {
    setValues(prev => ({ ...prev, [e.target.id]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.id]: undefined }))
  }

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Revisa los errores y vuelve a intentarlo')
      return
    }
    try {
      setLoading(true)
      await saveGroup(values)
      toast.success(group?.id ? 'Grupo actualizado!' : 'Grupo guardado!')
      setValues(EMPTY_GROUP)
      setErrors({})
      setOpen(false)
    } catch {
      toast.error('Ocurrió un error al guardar el grupo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
              <DialogTrigger asChild>

            <Button size='icon-sm' variant={group?.id ? 'ghost' : 'default'} className='cursor-pointer'>
              {group?.id ? <Pencil /> : <Plus />}
            </Button>
      </DialogTrigger>

          </TooltipTrigger>
          
          <TooltipContent>
            {group?.id ? 'Editar grupo' : 'Registrar nuevo grupo'}
          </TooltipContent>
        </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group?.id ? 'Editar grupo' : 'Registrar nuevo grupo'}</DialogTitle>
        </DialogHeader>

        <div className='grid gap-2'>
          <Label htmlFor='name'>Nombre del grupo</Label>
          <Input
            id='name'
            onChange={onInputChange}
            value={values.name}
            className={errors?.name ? 'border-destructive outline-destructive' : ''}
          />
          {errors?.name && <span className='text-xs text-red-500'>{errors.name}</span>}
        </div>

        <div className='flex items-start gap-3 rounded-md border p-3'>
          <Switch
            id='block_own_reports'
            checked={values.block_own_reports ?? false}
            onCheckedChange={checked =>
              setValues(prev => ({ ...prev, block_own_reports: checked }))
            }
          />
          <div className='grid gap-0.5'>
            <Label htmlFor='block_own_reports' className='cursor-pointer'>
              Bloquear acceso a reportes propios
            </Label>
            <p className='text-xs text-muted-foreground'>
              Los usuarios de este grupo no podrán ver su propia actividad ni capturas de pantalla.
            </p>
          </div>
        </div>

        {allGroups.filter(g => g.id !== group?.id).length > 0 && (
          <div className='grid gap-2'>
            <Label>Grupos visibles</Label>
            <p className='text-xs text-muted-foreground'>
              Este grupo solo podrá ver la actividad de los usuarios en los grupos seleccionados. Si no se selecciona ninguno, verá todos los grupos.
            </p>
            <div className='rounded-md border p-3 flex flex-col gap-2 max-h-40 overflow-y-auto'>
              {allGroups
                .filter(g => g.id !== group?.id)
                .map(g => {
                  const checked = (values.visible_group_ids ?? []).includes(g.id!)
                  return (
                    <label key={g.id} className='flex items-center gap-2 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={e => {
                          const ids = values.visible_group_ids ?? []
                          setValues(prev => ({
                            ...prev,
                            visible_group_ids: e.target.checked
                              ? [...ids, g.id!]
                              : ids.filter(id => id !== g.id),
                          }))
                        }}
                        className='accent-primary'
                      />
                      <span className='text-sm'>{g.name}</span>
                    </label>
                  )
                })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button className='cursor-pointer' onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : group?.id ? 'Actualizar' : 'Guardar grupo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}