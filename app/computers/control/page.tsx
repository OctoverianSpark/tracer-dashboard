import { getMachines } from '../actions'
import MachineList from '@/components/ComputerManager/MachineList'

export default async function Page() {
  const machines = await getMachines()

  return (
    <div className='flex min-h-screen items-center justify-center font-sans dark:bg-black'>
      <MachineList machines={machines} />
    </div>
  )
}