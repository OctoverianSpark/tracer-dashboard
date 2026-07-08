'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getGroups } from '@/app/app/groups/actions'
import { cloneStateCatalog, getStateCategories, getStates } from '../actions'
import { Group } from '@/types/AppUser'
import { StateCategory, WorkState } from '@/types/States'
import { Button } from '@/app/_components/_ui/button'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Copy } from 'lucide-react'
import StateCategoryForm from '@/components/States/StateCategoryForm'
import StateCategoryTable from '@/components/States/StateCategoryTable'
import WorkStateForm from '@/components/States/WorkStateForm'
import WorkStateTable from '@/components/States/WorkStateTable'

export default function Page() {
  const [groups, setGroups]         = useState<Group[]>([])
  const [groupId, setGroupId]       = useState<number | null>(null) // null = catálogo por defecto
  const [states, setStates]         = useState<WorkState[]>([])
  const [categories, setCategories] = useState<StateCategory[]>([])
  const [cloneSource, setCloneSource] = useState<string>('default')
  const [cloning, setCloning]       = useState(false)
  const [loading, setLoading]       = useState(false)

  useEffect(() => { getGroups().then(setGroups) }, [])

  function reload() {
    // Limpia antes de pedir el nuevo catálogo — si no, mientras la petición está en vuelo
    // la tabla sigue mostrando los ids del catálogo anterior bajo el groupId ya cambiado,
    // y un click de eliminar/editar en esa ventana termina actuando sobre el catálogo equivocado.
    setLoading(true)
    setStates([])
    setCategories([])
    Promise.all([getStates(groupId), getStateCategories(groupId)])
      .then(([s, c]) => { setStates(s); setCategories(c) })
      .finally(() => setLoading(false))
  }

  useEffect(reload, [groupId])

  const isEmpty = !loading && states.length === 0 && categories.length === 0
  const currentValue = groupId === null ? 'default' : groupId.toString()
  const cloneSources = [
    { value: 'default', label: 'Por defecto' },
    ...groups.map(g => ({ value: g.id!.toString(), label: g.name })),
  ].filter(s => s.value !== currentValue)

  async function handleClone() {
    const sourceGroupId = cloneSource === 'default' ? null : Number(cloneSource)
    setCloning(true)
    try {
      await cloneStateCatalog(sourceGroupId, groupId)
      reload()
      toast.success('Catálogo clonado, ya lo puedes editar')
    } catch {
      toast.error('Ocurrió un error al clonar el catálogo')
    } finally {
      setCloning(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Estados de Trabajo</h1>
        <p className="text-sm text-muted-foreground">
          Cada grupo puede tener su propio catálogo de estados y categorías, independiente del
          catálogo por defecto y del de otros grupos. El código que envía el agente (0-6) no
          cambia — aquí defines qué códigos existen para este catálogo, cómo se llaman, de qué
          color son y en qué orden se muestran en la malla.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2 w-full sm:w-64">
          <Label>Catálogo</Label>
          <Select
            value={groupId === null ? 'default' : groupId.toString()}
            onValueChange={v => setGroupId(v === 'default' ? null : Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Por defecto</SelectItem>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id!.toString()}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isEmpty && cloneSources.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="grid gap-2 w-48">
              <Label>Copiar estados desde</Label>
              <Select value={cloneSource} onValueChange={setCloneSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cloneSources.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" onClick={handleClone} disabled={cloning} className="cursor-pointer">
              <Copy className="size-4" />
              {cloning ? 'Clonando...' : 'Clonar aquí'}
            </Button>
          </div>
        )}
      </div>

      {isEmpty && (
        <p className="text-xs text-muted-foreground -mt-4">
          Este catálogo está vacío. Puedes crear categorías y estados desde cero, o clonar los de
          otro catálogo como punto de partida y luego editarlos — quedan como copias independientes,
          no como una referencia al original.
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Categorías</h2>
          <StateCategoryForm groupId={groupId} />
        </div>
        <StateCategoryTable categories={categories} groupId={groupId} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Estados</h2>
          <WorkStateForm groupId={groupId} categories={categories} usedCodes={states.map(s => s.code)} />
        </div>
        <WorkStateTable states={states} categories={categories} groupId={groupId} />
      </div>
    </div>
  )
}
