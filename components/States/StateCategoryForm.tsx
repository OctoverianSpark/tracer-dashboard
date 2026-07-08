'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { saveStateCategory } from '@/app/states/actions'
import { StateCategory } from '@/types/States'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  category?: StateCategory
  onChanged: () => void
}

export default function StateCategoryForm({ category, onChanged }: Props) {
  const isEdit = !!category?.id
  const emptyCategory: StateCategory = { key: '', name: '', color: '#22c55e', sort_order: 0 }

  const [values, setValues] = useState<StateCategory>(category ?? emptyCategory)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof StateCategory, string>>>({})

  function reset() {
    setValues(category ?? emptyCategory)
    setErrors({})
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof StateCategory, string>> = {}
    if (!values.name) newErrors.name = 'El nombre es requerido'
    if (!values.key)  newErrors.key  = 'La clave es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit() {
    if (!validate()) {
      toast.error('Corrige los errores antes de guardar')
      return
    }
    try {
      setLoading(true)
      await saveStateCategory(values)
      toast.success('Categoría guardada!')
      reset()
      setOpen(false)
      onChanged()
    } catch {
      toast.error('Ocurrió un error al guardar la categoría')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) reset() }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button className="cursor-pointer" size={isEdit ? 'icon-sm' : 'default'} variant={isEdit ? 'ghost' : 'default'}>
              {isEdit ? <Pencil /> : <><Plus />Agregar categoría</>}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {isEdit ? 'Editar categoría' : 'Registrar nueva categoría'}
        </TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar categoría' : 'Registrar nueva categoría'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            placeholder="Ej: Productivo"
            value={values.name}
            onChange={e => { setValues(prev => ({ ...prev, name: e.target.value })); setErrors(prev => ({ ...prev, name: undefined })) }}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && <span className="text-xs text-destructive">{errors.name}</span>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="key">Clave</Label>
          <Input
            id="key"
            placeholder="Ej: active"
            value={values.key}
            onChange={e => { setValues(prev => ({ ...prev, key: e.target.value })); setErrors(prev => ({ ...prev, key: undefined })) }}
            className={errors.key ? 'border-destructive' : ''}
          />
          <p className="text-xs text-muted-foreground">Debe coincidir con la categoría que envía el agente en cada registro.</p>
          {errors.key && <span className="text-xs text-destructive">{errors.key}</span>}
        </div>

        <div className="flex gap-3">
          <div className="grid gap-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              type="color"
              value={values.color ?? '#22c55e'}
              onChange={e => setValues(prev => ({ ...prev, color: e.target.value }))}
              className="h-9 w-16 p-1"
            />
          </div>
          <div className="grid gap-2 flex-1">
            <Label htmlFor="sort_order">Orden</Label>
            <Input
              id="sort_order"
              type="number"
              value={values.sort_order}
              onChange={e => setValues(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button className="cursor-pointer" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
