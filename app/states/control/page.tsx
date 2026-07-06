import { getStateCategories, getStates } from '../actions'
import StateCategoryForm from '@/components/States/StateCategoryForm'
import StateCategoryTable from '@/components/States/StateCategoryTable'
import WorkStateTable from '@/components/States/WorkStateTable'

export default async function Page() {
  const [states, categories] = await Promise.all([
    getStates(),
    getStateCategories(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Estados de Trabajo</h1>
        <p className="text-sm text-muted-foreground">
          Configura los nombres, colores y orden con los que se pintan los estados en la malla horaria.
          Los códigos 0–6 que envía el agente no cambian: solo se edita cómo se muestran.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Categorías</h2>
          <StateCategoryForm />
        </div>
        <StateCategoryTable categories={categories} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Estados</h2>
        <WorkStateTable states={states} categories={categories} />
      </div>
    </div>
  )
}
