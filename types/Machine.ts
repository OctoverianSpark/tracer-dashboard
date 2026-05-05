
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
  const brand = m.machineBrand?.trim()
  const model = m.machineModel?.trim()
  if (brand && model) return `${brand} ${model}`
  if (brand) return brand
  if (model) return model
  return m.hostname
}
