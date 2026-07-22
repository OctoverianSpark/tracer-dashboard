import ProductivityDashboard from '@/components/Productivity/ProductivityDashboard'
import { getappuser } from '../app/actions'
import { getGroups } from '../app/groups/actions'

export default async function Page() {
  const [users, groups] = await Promise.all([getappuser(), getGroups()])

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Productividad por usuario</h1>
        <p className="text-sm text-muted-foreground">
          Top 3 del rango seleccionado y la curva diaria global, por grupo o de un usuario puntual.
        </p>
      </div>
      <ProductivityDashboard users={users} groups={groups} />
    </div>
  )
}
