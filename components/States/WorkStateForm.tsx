'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { saveState } from '@/app/states/actions'
import { STATE_CODES, StateCategory, WorkState } from '@/types/States'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  state?: WorkState
  groupId: number | null   // catálogo al que pertenece: null = por defecto
  categories: StateCategory[]
  usedCodes: number[]      // códigos ya presentes en este catálogo, para no duplicarlos al crear
}

export default function WorkStateForm({ state, groupId, categories, usedCodes }: Props) {
  const isEdit = !!state?.id
  const availableCodes = STATE_CODES.filter(c => !usedCodes.includes(c) || c === state?.code)

  const emptyState: WorkState = {
    code: availableCodes[0] ?? 0,
    name: '',
    category_id: categories[0]?.id ?? 0,
    sort_order: 0,
    group_id: groupId,
  }

  const [values, setValues] = useState<WorkState>(state ?? emptyState)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  function reset() {
    setValues(state ?? emptyState)
    setError(undefined)
  }

  async function handleSubmit() {
    if (!values.name) {
      setError('El nombre es requerido')
      return
    }
    if (!values.category_id) {
      setError('Selecciona una categoría')
      return
    }
    try {
      setLoading(true)
      await saveState({ ...values, group_id: groupId })
      toast.success(isEdit ? 'Estado actualizado!' : 'Estado agregado!')
      reset()
      setOpen(false)
    } catch {
      toast.error('Ocurrió un error al guardar el estado')
    } finally {
      setLoading(false)
    }
  }

  const disabledCreate = !isEdit && availableCodes.length === 0

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) reset() }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button className="cursor-pointer" size={isEdit ? 'icon-sm' : 'default'} variant={isEdit ? 'ghost' : 'default'} disabled={disabledCreate}>
              {isEdit ? <Pencil /> : <><Plus />Agregar estado</>}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {disabledCreate ? 'Ya están los 7 códigos en este catálogo' : isEdit ? 'Editar estado' : 'Agregar estado a este catálogo'}
        </TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar estado (código ${state.code})` : 'Agregar estado'}</DialogTitle>
        </DialogHeader>

        {!isEdit && (
          <div className="grid gap-2">
            <Label>Código</Label>
            <Select
              value={values.code.toString()}
              onValueChange={v => setValues(prev => ({ ...prev, code: Number(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCodes.map(c => (
                  <SelectItem key={c} value={c.toString()}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">El código con el que el agente envía este estado. No cambia luego de creado.</p>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={values.name}
            onChange={e => { setValues(prev => ({ ...prev, name: e.target.value })); setError(undefined) }}
            className={error ? 'border-destructive' : ''}
          />
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>

        <div className="grid gap-2">
          <Label>Categoría</Label>
          <Select
            value={values.category_id ? values.category_id.toString() : ''}
            onValueChange={v => setValues(prev => ({ ...prev, category_id: Number(v) }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categories.length === 0 && (
            <p className="text-xs text-amber-500">Crea primero una categoría en este catálogo.</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sort_order">Orden dentro de la categoría</Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Posición relativa a los demás estados de la misma categoría, no un orden global.
          </p>
          <Input
            id="sort_order"
            type="number"
            value={values.sort_order}
            onChange={e => setValues(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
          />
        </div>

        <DialogFooter>
          <Button className="cursor-pointer" onClick={handleSubmit} disabled={loading || categories.length === 0}>
            {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
