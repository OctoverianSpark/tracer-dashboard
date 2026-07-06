'use client'
import { useEffect, useState } from 'react'
import { getGroups } from '@/app/app/groups/actions'
import { getStateCategories, getStates } from '../actions'
import { Group } from '@/types/AppUser'
import { StateCategory, WorkState } from '@/types/States'
import { Label } from '@/app/_components/_ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/_ui/select'
import StateCategoryForm from '@/components/States/StateCategoryForm'
import StateCategoryTable from '@/components/States/StateCategoryTable'
import WorkStateForm from '@/components/States/WorkStateForm'
import WorkStateTable from '@/components/States/WorkStateTable'

export default function Page() {
  const [groups, setGroups]         = useState<Group[]>([])
  const [groupId, setGroupId]       = useState<number | null>(null) // null = catálogo por defecto
  const [states, setStates]         = useState<WorkState[]>([])
  const [categories, setCategories] = useState<StateCategory[]>([])

  useEffect(() => { getGroups().then(setGroups) }, [])

  useEffect(() => {
    getStates(groupId).then(setStates)
    getStateCategories(groupId).then(setCategories)
  }, [groupId])

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
