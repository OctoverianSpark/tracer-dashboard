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
import AgentPreferencesPanel from '@/components/AgentPreferences/AgentPreferencesPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/_ui/tabs'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Configuración del Agente</h1>
        <p className="text-sm text-muted-foreground">
          Administra el catálogo de estados de trabajo y las preferencias generales que usa la
          aplicación de escritorio, por grupo.
        </p>
      </div>

      <Tabs defaultValue="states">
        <TabsList>
          <TabsTrigger value="states">Estados de Trabajo</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias del Agente</TabsTrigger>
        </TabsList>

        <TabsContent value="states" className="space-y-8">
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
        </TabsContent>

        <TabsContent value="preferences" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            La aplicación de escritorio recibe estas preferencias al conectarse por socket,
            junto con la información del usuario asignado.
          </p>
          <AgentPreferencesPanel groups={groups} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
