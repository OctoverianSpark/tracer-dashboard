'use server'
import { computeProductivityDaily } from '@/lib/productivity'
import { getappuser } from '../app/actions'

export const getDailyProductivity = async (appuserId: number, dateFrom: string, dateTo: string) => {
  const users = await getappuser()
  const user = users.find(u => Number(u.id) === appuserId)
  if (!user) return []
  return computeProductivityDaily(user, dateFrom, dateTo)
}
