import { getMachines } from '../actions'
import { getappuser } from '@/app/app/actions'
import ComputersControlTabs from '@/components/ComputerManager/ComputersControlTabs'

export default async function Page() {
  const [machines, appusers] = await Promise.all([getMachines(), getappuser()])
  return <ComputersControlTabs machines={machines} appusers={appusers} />
}
