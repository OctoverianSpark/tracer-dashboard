// app/computers/dashboard/page.tsx
import ComputersDashboard from '@/components/ComputerManager/MachineDashboard'
import { getMachines } from '../actions'

export default async function Page() {
  const machines = await getMachines()
  return <ComputersDashboard machines={machines} />
}