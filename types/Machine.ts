
export type Machine = {
  id?: number;
  hostname: string;
  serial_number: string;
  displayName: string;
  isAlive: boolean;
  alive: boolean;
  username: string;
  ip_address: string;
  last_seen: string;
  appuser_id: string;
  machineBrand?: string;
  machineModel?: string;
}

export function machineLabel(m: Machine): string {
  if (m.machineBrand && m.machineModel) return `${m.machineBrand} ${m.machineModel}`
  return m.hostname
}
