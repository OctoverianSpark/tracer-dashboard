'use client'
import { Button } from '@/app/_components/_ui/button'
import { Checkbox } from '@/app/_components/_ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/_ui/dialog'
import { Input } from '@/app/_components/_ui/input'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/_components/_ui/tooltip'
import { hideStateForGroup, saveState, unhideStateForGroup } from '@/app/states/actions'
import { Group } from '@/types/AppUser'
import { GroupStateVisibility, STATE_CODES, StateCategory, WorkState } from '@/types/States'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  state?: WorkState
  categories: StateCategory[]
  usedCodes: number[]              // códigos ya presentes en el catálogo, para no duplicarlos al crear
  groups: Group[]
  visibility: GroupStateVisibility[] // todas las filas de ocultamiento, de todos los grupos
  onChanged: () => void
}

export default function WorkStateForm({ state, categories, usedCodes, groups, visibility, onChanged }: Props) {
  const isEdit = !!state?.id
  const availableCodes = STATE_CODES.filter(c => !usedCodes.includes(c) || c === state?.code)

  const emptyState: WorkState = {
    code: availableCodes[0] ?? 0,
    name: '',
    category_id: categories[0]?.id ?? 0,
    sort_order: 0,
  }

  // Grupos que SÍ ven este estado: todos, salvo los que tengan una fila de ocultamiento para su código.
  const visibleGroupIdsFor = (code: number) =>
    groups.filter(g => !visibility.some(v => v.group_id === g.id && v.code === code)).map(g => g.id!)

  const [values, setValues] = useState<WorkState>(state ?? emptyState)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>(visibleGroupIdsFor(state?.code ?? emptyState.code))
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  function reset() {
    const s = state ?? emptyState
    setValues(s)
    setSelectedGroupIds(visibleGroupIdsFor(s.code))
    setError(undefined)
  }

  function toggleGroup(groupId: number) {
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    )
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
      await saveState(values)

      // Diff entre lo que había oculto para este código y lo que quedó seleccionado ahora.
      const currentlyHidden = visibility.filter(v => v.code === values.code)
      const toHide = groups.filter(g => !selectedGroupIds.includes(g.id!) && !currentlyHidden.some(v => v.group_id === g.id))
      const toShow = currentlyHidden.filter(v => selectedGroupIds.includes(v.group_id))

      await Promise.all([
        ...toHide.map(g => hideStateForGroup(g.id!, values.code)),
        ...toShow.map(v => unhideStateForGroup(v.id!)),
      ])

      toast.success(isEdit ? 'Estado actualizado!' : 'Estado agregado!')
      reset()
      setOpen(false)
      onChanged()
    } catch {
      toast.error('Ocurrió un error al guardar el estado')
    } finally {
      setLoading(false)
    }
  }

  const disabledCreate = !isEdit && availableCodes.length === 0
  const allSelected = selectedGroupIds.length === groups.length

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
          {disabledCreate ? 'Ya están los 7 códigos definidos' : isEdit ? 'Editar estado' : 'Agregar estado'}
        </TooltipContent>
      </Tooltip>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar estado (código ${state.code})` : 'Agregar estado'}</DialogTitle>
        </DialogHeader>

        {!isEdit && (
          <div className="grid gap-2">
            <Label>Código</Label>
            <Select
              value={values.code.toString()}
              onValueChange={v => {
                const code = Number(v)
                setValues(prev => ({ ...prev, code }))
                setSelectedGroupIds(visibleGroupIdsFor(code))
              }}
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
            <p className="text-xs text-amber-500">Crea primero una categoría.</p>
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

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Grupos que lo ven en el menú del agente</Label>
            <button
              type="button"
              onClick={() => setSelectedGroupIds(allSelected ? [] : groups.map(g => g.id!))}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              {allSelected ? 'Ninguno' : 'Todos'}
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay grupos registrados.</p>
          ) : (
            <div className="rounded-md border divide-y divide-border max-h-40 overflow-y-auto">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                  <Checkbox
                    checked={selectedGroupIds.includes(g.id!)}
                    onCheckedChange={() => toggleGroup(g.id!)}
                  />
                  <span className="text-sm">{g.name}</span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Un grupo sin marcar no ve este estado como opción en su menú del tray — sigue existiendo
            en el catálogo y puede activarse por otra vía (automática o API).
          </p>
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
