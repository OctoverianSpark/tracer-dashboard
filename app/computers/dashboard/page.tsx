import ComputersDashboard from '@/components/ComputerManager/MachineDashboard'
import { getMachines, getMachinesWithAppUser } from '../actions'
import { getappuser } from '@/app/app/actions'

export default async function Page() {
  const [machines, appusers, appUserMap] = await Promise.all([
    getMachines(),
    getappuser(),
    getMachinesWithAppUser(),
  ])

  // Mapa serial_number → appuser_id para enriquecer los datos de WebSocket
  const appuserIdBySerial = new Map(
    appUserMap
      .filter(m => m.appuser_id)
      .map(m => [m.serial_number, m.appuser_id])
  )

  const enrichedMachines = machines.map(m => ({
    ...m,
    appuser_id: m.appuser_id ?? appuserIdBySerial.get(m.serial_number),
  }))

  return <ComputersDashboard machines={enrichedMachines} appusers={appusers} />
}
