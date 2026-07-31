'use server'
import { Machine, MachineActionResult, MachineSyncResult } from "@/types/Machine"
import { Notification } from "@/types/Notification"
import { revalidatePath } from "next/cache"

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Con un solo equipo, si la acción falla el backend responde con un status de error y
// { error: "..." } (ej. 409 "Maquina apagada o fuera de linea") — hay que leer ese mensaje
// en vez de tirar un genérico "HTTP 409", que no le dice nada útil al usuario.
async function parseActionResponse<T>(res: Response, label: string): Promise<T> {
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status} — ${label}`)
  return data
}

export const getMachines = async (): Promise<Machine[]> => {
  const data = await (await fetch(`${API_URL}/machines/list`, { cache: 'no-store' })).json()
  return data.machines
}

// Devuelve todas las máquinas del endpoint base, que sí incluye appuser_id
export const getMachinesWithAppUser = async (): Promise<Pick<Machine, 'serial_number' | 'appuser_id'>[]> => {
  const data = await (await fetch(`${API_URL}/machines`, { cache: 'no-store' })).json()
  const list: Machine[] = Array.isArray(data) ? data : (data.machines ?? data.data ?? [])
  return list.map(m => ({ serial_number: m.serial_number, appuser_id: m.appuser_id }))
}

export const findAsignedMachines = async (appuser_id: number): Promise<Machine[]> => {
  const data = await (await fetch(`${API_URL}/machines?appuser_id=${appuser_id}`)).json()
  const all: Machine[] = Array.isArray(data) ? data : (data.machines ?? data.data ?? [])
  return all.filter(m => Number(m.appuser_id) === appuser_id)
}

export const deleteComputer = async (serial_number: string) => {
  const res = await fetch(`${API_URL}/machines/delete/${serial_number}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Error al eliminar computadora: ${res.status}`)
  revalidatePath('/computers/dashboard')
}

export const getMachineReport = async (computerName: string, date: string) => {
  const data = await (await fetch(`${API_URL}/machines/get-report?computername=${computerName}&date=${date}`)).json()
  return data
}

// `machineId` acepta un serial concreto, o el targeting en bloque que resuelve el backend:
// '*' (todas las máquinas) o 'group:<id>' (todas las de ese grupo).
export const lockMachine = async (machineId: string): Promise<MachineActionResult> => {
  const res = await fetch(`${API_URL}/machines/${machineId}/lock`, { method: 'POST' })
  return parseActionResponse(res, 'lock')
}

export const shutdownMachine = async (machineId: string): Promise<MachineActionResult> => {
  const res = await fetch(`${API_URL}/machines/${machineId}/shutdown`, { method: 'POST' })
  return parseActionResponse(res, 'shutdown')
}

export const restartMachine = async (machineId: string): Promise<MachineActionResult> => {
  const res = await fetch(`${API_URL}/machines/${machineId}/restart`, { method: 'POST' })
  return parseActionResponse(res, 'restart')
}

// El agente responde al sync con un SyncDataMessage que el backend traduce a un
// UserInfoMessage (group, group_id, access_level) cuando `machineId` es un serial concreto.
// Con targeting en bloque ('*' o 'group:<id>') viene el shape de batch (sent/failed/results).
export const syncMachine = async (machineId: string): Promise<MachineSyncResult> => {
  const res = await fetch(`${API_URL}/machines/${machineId}/sync`, { method: 'POST' })
  return parseActionResponse(res, 'sync')
}

export const sendFileToMachine = async (machineId: string, formData: FormData): Promise<MachineActionResult> => {
  const res = await fetch(`${API_URL}/machines/${machineId}/send-file`, {
    method: 'POST',
    body: formData,
  })
  return parseActionResponse(res, 'send-file')
}

export const getIPInfo = async (IP: string) => {
  const res = await fetch(`https://api.ipdata.co/${IP}?api-key=158f6934b48763c73b31e48f46f89c4105450c0571f66d4e305e7286`)
  return res.json()
}

export const sendNotice = async (machineId: string, notification: Notification): Promise<MachineActionResult> => {
  const res = await fetch(`${API_URL}/machines/${machineId}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification),
  })
  return parseActionResponse(res, 'notify')
}

// `target` acepta '*' (todos los equipos) o 'group:<id>' para limitar el envio a un grupo.
export const syncHelpdesk = async (target: string = '*'): Promise<{ ok: boolean; sent: number; target?: string; helpdesk?: unknown; error?: string }> => {
  const res = await fetch(`${API_URL}/machines/sync-helpdesk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target }),
  })
  return parseActionResponse(res, 'sync-helpdesk')
}

export const setTakeScreenshots = async (serial: string, enabled: boolean) => {
  const res = await fetch(`${API_URL}/machines/${serial}/take-screenshots`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  revalidatePath('/computers/dashboard')
  return data
}

export const setNickname = async (serial: string, nickname: string | null) => {
  const res = await fetch(`${API_URL}/machines/${serial}/nickname`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  revalidatePath('/computers/dashboard')
  return data
}
