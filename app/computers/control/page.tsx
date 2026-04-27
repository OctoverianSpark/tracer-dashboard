import { getMachines } from '../actions'
import MachineList from '@/components/ComputerManager/MachineList'

export default async function Page() {
  const machines = await getMachines()
  return <MachineList machines={machines} />
}
