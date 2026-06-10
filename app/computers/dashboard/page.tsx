import ComputersDashboard from '@/components/ComputerManager/MachineDashboard'
import { getMachines } from '../actions'
import { getappuser } from '@/app/app/actions'

export default async function Page() {
  const [machines, appusers] = await Promise.all([getMachines(), getappuser()])
  return <ComputersDashboard machines={machines} appusers={appusers} />
}
