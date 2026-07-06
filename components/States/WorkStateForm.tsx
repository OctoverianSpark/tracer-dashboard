'use client'
import { Button } from '@/app/_components/_ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { updateState } from '@/app/states/actions'
import { StateCategory, WorkState } from '@/types/States'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  state: WorkState
  categories: StateCategory[]
}

export default function WorkStateForm({ state, categories }: Props) {
  const [values, setValues] = useState(state)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  async function handleSubmit() {
    if (!values.name) {
      setError('El nombre es requerido')
      return
    }
    try {
      setLoading(true)
      await updateState(state.id!, {
        name: values.name,
        category_id: values.category_id,
        sort_order: values.sort_order,
      })
      toast.success('Estado actualizado!')
      setOpen(false)
    } catch {
      toast.error('Ocurrió un error al actualizar el estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) { setValues(state); setError(undefined) } }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="icon-sm" variant="ghost" className="cursor-pointer"><Pencil /></Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Editar estado</TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar estado (código {state.code})</DialogTitle>
        </DialogHeader>

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
            value={values.category_id?.toString() ?? ''}
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
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sort_order">Orden</Label>
          <Input
            id="sort_order"
            type="number"
            value={values.sort_order}
            onChange={e => setValues(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
          />
        </div>

        <DialogFooter>
          <Button className="cursor-pointer" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Actualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
