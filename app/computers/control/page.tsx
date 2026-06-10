import { getMachines, getMachinesWithAppUser } from '../actions'
import { getappuser } from '@/app/app/actions'
import ComputersControlTabs from '@/components/ComputerManager/ComputersControlTabs'

export default async function Page() {
  const [machines, appusers, appUserMap] = await Promise.all([
    getMachines(),
    getappuser(),
    getMachinesWithAppUser(),
  ])

  const appuserIdBySerial = new Map(
    appUserMap
      .filter(m => m.appuser_id)
      .map(m => [m.serial_number, m.appuser_id])
  )

  const enrichedMachines = machines.map(m => ({
    ...m,
    appuser_id: m.appuser_id ?? appuserIdBySerial.get(m.serial_number),
  }))

  return <ComputersControlTabs machines={enrichedMachines} appusers={appusers} />
}
