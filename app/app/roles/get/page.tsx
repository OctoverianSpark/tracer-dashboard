import RoleForm from '@/components/RolesManager/RoleForm'
import RolesList from '@/components/RolesManager/RolesList'
import { getRoles } from '../actions'

export default async function Page() {
  const roles = await getRoles()

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <RoleForm />
      </div>
      <RolesList roles={roles} />
    </div>
  )
}
