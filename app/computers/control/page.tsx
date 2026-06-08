import { getMachines } from '../actions'
import ComputersControlTabs from '@/components/ComputerManager/ComputersControlTabs'

export default async function Page() {
  const machines = await getMachines()
  return <ComputersControlTabs machines={machines} />
}
