'use client'
import { useEffect, useState } from 'react'
import { getGroups } from '@/app/app/groups/actions'
import { getAllGroupStateVisibility, getStateCategories, getStates } from '../actions'
import { Group } from '@/types/AppUser'
import { GroupStateVisibility, StateCategory, WorkState } from '@/types/States'
import StateCategoryForm from '@/components/States/StateCategoryForm'
import StateCategoryTable from '@/components/States/StateCategoryTable'
import WorkStateForm from '@/components/States/WorkStateForm'
import WorkStateTable from '@/components/States/WorkStateTable'

export default function Page() {
  const [groups, setGroups]         = useState<Group[]>([])
  const [states, setStates]         = useState<WorkState[]>([])
  const [categories, setCategories] = useState<StateCategory[]>([])
  const [visibility, setVisibility] = useState<GroupStateVisibility[]>([])

  useEffect(() => { getGroups().then(setGroups) }, [])

  function reload() {
    Promise.all([getStates(), getStateCategories(), getAllGroupStateVisibility()])
      .then(([s, c, v]) => { setStates(s); setCategories(c); setVisibility(v) })
  }

  useEffect(reload, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Estados de Trabajo</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo único: nombre, categoría, color y orden se definen aquí una sola vez para
          todos los grupos. El código que envía el agente (0-6) no cambia. Al crear o editar un
          estado eliges qué grupos lo ven en su menú del tray.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Categorías</h2>
          <StateCategoryForm onChanged={reload} />
        </div>
        <StateCategoryTable categories={categories} onChanged={reload} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Estados</h2>
          <WorkStateForm
            categories={categories}
            usedCodes={states.map(s => s.code)}
            groups={groups}
            visibility={visibility}
            onChanged={reload}
          />
        </div>
        <WorkStateTable
          states={states}
          categories={categories}
          groups={groups}
          visibility={visibility}
          onChanged={reload}
        />
      </div>
    </div>
  )
}
