'use client'
import { useEffect, useState } from 'react'
import { getGroups } from '@/app/app/groups/actions'
import { getStateCategories, getStates } from '../actions'
import { Group } from '@/types/AppUser'
import { StateCategory, WorkState } from '@/types/States'
import StateCategoryForm from '@/components/States/StateCategoryForm'
import StateCategoryTable from '@/components/States/StateCategoryTable'
import WorkStateForm from '@/components/States/WorkStateForm'
import WorkStateTable from '@/components/States/WorkStateTable'
import GroupStateVisibilityPanel from '@/components/States/GroupStateVisibilityPanel'

export default function Page() {
  const [groups, setGroups]         = useState<Group[]>([])
  const [states, setStates]         = useState<WorkState[]>([])
  const [categories, setCategories] = useState<StateCategory[]>([])

  useEffect(() => { getGroups().then(setGroups) }, [])

  function reload() {
    Promise.all([getStates(), getStateCategories()]).then(([s, c]) => { setStates(s); setCategories(c) })
  }

  useEffect(reload, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Estados de Trabajo</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo único: nombre, categoría, color y orden se definen aquí una sola vez para
          todos los grupos. El código que envía el agente (0-6) no cambia. Por grupo solo se
          controla qué estados están visibles en el menú del agente, más abajo.
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
          <WorkStateForm categories={categories} usedCodes={states.map(s => s.code)} onChanged={reload} />
        </div>
        <WorkStateTable states={states} categories={categories} onChanged={reload} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Visibilidad por grupo</h2>
        <p className="text-sm text-muted-foreground -mt-2">
          Qué estados aparecen en el menú del agente para cada grupo. Ocultar aquí no borra el
          estado del catálogo — solo lo quita de la lista que ve ese grupo puntual.
        </p>
        <GroupStateVisibilityPanel groups={groups} states={states} />
      </div>
    </div>
  )
}
