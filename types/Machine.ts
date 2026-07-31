import { AccessLevel } from './AppUser'

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
  nickname?: string | null;
  take_screenshots?: boolean;
}

export function machineLabel(m: Machine): string {
  const brand = m.machineBrand?.trim()
  const model = m.machineModel?.trim()
  if (brand && model) return `${brand} ${model}`
  if (brand) return brand
  if (model) return model
  return m.hostname
}

// Identificador con prioridad al apodo — usar donde hay que distinguir equipos a simple vista
// (selects de "elegir equipo" cuando un usuario tiene varios, tarjetas). machineLabel() se deja
// intacto porque también se usa en columnas que específicamente muestran marca/modelo.
export function machineDisplayName(m: Machine): string {
  return m.nickname?.trim() || machineLabel(m)
}

// Respuesta de las acciones sobre /machines/:serial/*. Con un serial concreto viene solo `ok`;
// con `*` o `group:<id>` (targeting en bloque) además trae sent/failed/results por equipo.
export interface MachineActionResult {
  ok: boolean
  sent?: number
  failed?: number
  results?: { serial: string; ok: boolean; error?: string }[]
}

// Respuesta de POST /machines/:serial/sync para un serial concreto: el agente contesta con un
// SyncDataMessage que el backend traduce a este UserInfoMessage.
export interface MachineSyncResult extends MachineActionResult {
  group?: string
  group_id?: number
  access_level?: AccessLevel
}
