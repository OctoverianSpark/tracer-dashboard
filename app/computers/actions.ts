import { Machine } from "@/types/Machine";
import { Notification } from "@/types/Notification"


const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL


export const getMachines = async (): Promise<Machine[]> => {
  const computers = await (await fetch(`${NEXT_PUBLIC_API_URL}/machines/list`)).json()

  console.log(computers);

  return computers.machines as Machine[]



}

export const getMachineReport = async (computerName: string, date: string) => {
  const screenshots = await (await fetch(`${NEXT_PUBLIC_API_URL}/machines/get-report?computername=${computerName}&date=${date}`)).json()

  return screenshots

}

export const lockMachine = async (machineId: string) => {
  const computer = await (await fetch(`${NEXT_PUBLIC_API_URL}/machines/${machineId}/lock`, { method: `POST` })).json()




}

export const sendFileToMachine = async (machineId: string, formData: FormData) => {

  const response = await fetch(
    `${NEXT_PUBLIC_API_URL}/machines/${machineId}/send-file`,
    {
      method: 'POST',
      body: formData
    }
  )

  const result = await response.json()
  console.log(result)
}


export const getIPInfo = async (IP: string) => {
  const localization = await fetch(`https://api.ipdata.co/${IP}?api-key=158f6934b48763c73b31e48f46f89c4105450c0571f66d4e305e7286`)

  return localization.json()

}

export const sendNotice = async (machineId: string, notification: Notification) => {
  const computer = await (await fetch(`${NEXT_PUBLIC_API_URL}/machines/${machineId}/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notification) })).json()
}
