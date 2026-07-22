import ProductivityDashboard from '@/components/Productivity/ProductivityDashboard'
import { getappuser } from '../app/actions'

export default async function Page() {
  const users = await getappuser()

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Productividad por usuario</h1>
        <p className="text-sm text-muted-foreground">
          Top 3 del rango seleccionado y la curva diaria de un usuario puntual.
        </p>
      </div>
      <ProductivityDashboard users={users} />
    </div>
  )
}
