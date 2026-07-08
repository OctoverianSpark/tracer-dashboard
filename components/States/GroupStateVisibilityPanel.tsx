'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getGroupStateVisibility, hideStateForGroup, unhideStateForGroup } from '@/app/states/actions'
import { Group } from '@/types/AppUser'
import { GroupStateVisibility, WorkState } from '@/types/States'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import { Switch } from '@/app/_components/_ui/switch'

interface Props {
  groups: Group[]
  states: WorkState[]
}

export default function GroupStateVisibilityPanel({ groups, states }: Props) {
  const [groupId, setGroupId] = useState<number | null>(groups[0]?.id ?? null)
  const [hidden, setHidden] = useState<GroupStateVisibility[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (groupId == null) { setHidden([]); return }
    setLoading(true)
    getGroupStateVisibility(groupId).then(setHidden).finally(() => setLoading(false))
  }, [groupId])

  async function toggle(code: number, visible: boolean) {
    if (groupId == null) return
    try {
      if (visible) {
        // Estaba oculto y se vuelve a mostrar: borrar la fila que lo ocultaba.
        const row = hidden.find(h => h.code === code)
        if (row?.id) {
          await unhideStateForGroup(row.id)
          setHidden(prev => prev.filter(h => h.id !== row.id))
        }
      } else {
        const created = await hideStateForGroup(groupId, code)
        setHidden(prev => [...prev, created])
      }
    } catch {
      toast.error('Error al actualizar la visibilidad')
    }
  }

  const sortedStates = [...states].sort((a, b) => a.code - b.code)

  return (
    <div className="space-y-3">
      <div className="grid gap-2 w-full sm:w-64">
        <Label>Grupo</Label>
        <Select value={groupId != null ? groupId.toString() : ''} onValueChange={v => setGroupId(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un grupo" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id!.toString()}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground">No hay grupos registrados.</p>
        )}
      </div>

      {groupId != null && (
        <div className="rounded-md border divide-y divide-border">
          {sortedStates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hay estados en el catálogo todavía.</p>
          ) : sortedStates.map(state => {
            const isHidden = hidden.some(h => h.code === state.code)
            return (
              <label key={state.code} className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer">
                <span className="text-sm">
                  <span className="font-mono text-muted-foreground mr-2">{state.code}</span>
                  {state.name}
                </span>
                <Switch checked={!isHidden} disabled={loading} onCheckedChange={checked => toggle(state.code, checked)} />
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
