'use server'
import { Machine } from "@/types/Machine"
import { Notification } from "@/types/Notification"
import { revalidatePath } from "next/cache"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getMachines = async (): Promise<Machine[]> => {
  const data = await (await fetch(`${API_URL}/machines/list`, { cache: 'no-store' })).json()
  return data.machines
}

export const findAsignedMachines = async (appuser_id: number): Promise<Machine[]> => {
  const data = await (await fetch(`${API_URL}/machines?appuser_id=${appuser_id}`)).json()
  const all: Machine[] = Array.isArray(data) ? data : (data.machines ?? data.data ?? [])
  return all.filter(m => Number(m.appuser_id) === appuser_id)
}

export const deleteComputer = async (serial_number: string) => {
  const res = await fetch(`${API_URL}/machines/delete/${serial_number}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Error al eliminar computadora: ${res.status}`)
  revalidatePath('/computers')
}

export const getMachineReport = async (computerName: string, date: string) => {
  const data = await (await fetch(`${API_URL}/machines/get-report?computername=${computerName}&date=${date}`)).json()
  return data
}

export const lockMachine = async (machineId: string) => {
  await fetch(`${API_URL}/machines/${machineId}/lock`, { method: 'POST' })
}

export const sendFileToMachine = async (machineId: string, formData: FormData) => {
  await fetch(`${API_URL}/machines/${machineId}/send-file`, {
    method: 'POST',
    body: formData,
  })
}

export const getIPInfo = async (IP: string) => {
  const res = await fetch(`https://api.ipdata.co/${IP}?api-key=158f6934b48763c73b31e48f46f89c4105450c0571f66d4e305e7286`)
  return res.json()
}

export const sendNotice = async (machineId: string, notification: Notification) => {
  await fetch(`${API_URL}/machines/${machineId}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification),
  })
}
