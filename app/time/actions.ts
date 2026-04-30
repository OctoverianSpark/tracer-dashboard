'use server'
import { Programation, Schedule } from "@/types/Schedules"
import { StateLog } from "@/types/StateLog"
import { revalidatePath } from "next/cache"

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL

export const getStateLog = async (appuser_id: number, computer_id: number) => {
  const { data } = await (await fetch(`${NEXT_PUBLIC_API_URL}/tracer/get-state-logs?appuser_id=${appuser_id}&computer_id=${computer_id}`)).json()
  return data
}

export const getProgramations = async (): Promise<Programation[]> => {
  const data = await (await fetch(`${NEXT_PUBLIC_API_URL}/programations`)).json()
  return data
}

export const getProgramationById = async (id: number): Promise<Programation> => {
  const data = await (await fetch(`${NEXT_PUBLIC_API_URL}/programations/${id}`)).json()
  return data
}
export const deleteProgramation = async (id: number) => {
  await fetch(`${NEXT_PUBLIC_API_URL}/programations/delete/${id}`, {
    method: 'DELETE'
  })
  revalidatePath('/time/control')
}

export const saveProgramation = async (body: Programation) => {
  await fetch(`${NEXT_PUBLIC_API_URL}/programations/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  revalidatePath('/time/control')
}

export const getSchedules = async (): Promise<Schedule[]> => {
  const data = await (await fetch(`${NEXT_PUBLIC_API_URL}/schedules`)).json()
  return data
}

export const getScheduleByappuserId = async (appuser_id: number): Promise<Schedule[]> => {
  const data = await (await fetch(`${NEXT_PUBLIC_API_URL}/schedules?appuser_id=${appuser_id}`)).json()
  return data
}

export const saveSchedule = async (body: Schedule[]) => {
  await fetch(`${NEXT_PUBLIC_API_URL}/schedules/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  revalidatePath('/time/control')
}

export interface AppUsageLog {
  app: string
  seconds: number
  computer_id: number
}

export const getAppUsageLogs = async (date: string): Promise<AppUsageLog[]> => {
  const from = `${date}T00:00:00`
  const to   = `${date}T23:59:59`
  const url  = `${NEXT_PUBLIC_API_URL}/app-usage-logs/by-date?from=${from}&to=${to}`
  console.log(`[app-usage] GET ${url}`)
  const res  = await fetch(url)
  const data = await res.json()
  console.log(`[app-usage] ${Array.isArray(data) ? data.length : 0} registros para ${date}`)
  return Array.isArray(data) ? data : []
}