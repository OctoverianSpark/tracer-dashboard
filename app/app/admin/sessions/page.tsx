import SessionsPanel from '@/components/Admin/SessionsPanel'
import { getappuser } from '../../actions'

export default async function Page() {
  const users = await getappuser()

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Sesiones</h1>
        <p className="text-sm text-muted-foreground">
          Cierra la sesión de un usuario puntual o de todos. El dashboard usa sesiones sin estado:
          la persona queda deslogueada en su próxima navegación.
        </p>
      </div>
      <SessionsPanel users={users} />
    </div>
  )
}
