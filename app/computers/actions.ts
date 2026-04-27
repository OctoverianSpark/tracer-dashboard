import { Machine } from "@/types/Machine"
import { Notification } from "@/types/Notification"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getMachines = async (): Promise<Machine[]> => {
  const data = await (await fetch(`${API_URL}/machines/list`)).json()
  return data.machines
}

export const findAsignedMachines = async (appuser_id: number): Promise<Machine[]> => {
  const data = await (await fetch(`${API_URL}/machines?appuser_id=${appuser_id}`)).json()
  return data
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
