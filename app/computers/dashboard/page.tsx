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

  console.log('[Dashboard] appUserMap sample:', appUserMap.slice(0, 3))
  console.log('[Dashboard] appuserIdBySerial size:', appuserIdBySerial.size)
  console.log('[Dashboard] enriched sample:', enrichedMachines.slice(0, 3).map(m => ({ hostname: m.hostname, serial: m.serial_number, appuser_id: m.appuser_id })))
  console.log('[Dashboard] appusers sample:', appusers.slice(0, 3).map(u => ({ id: u.id, name: u.full_name })))

  return <ComputersDashboard machines={enrichedMachines} appusers={appusers} />
}
