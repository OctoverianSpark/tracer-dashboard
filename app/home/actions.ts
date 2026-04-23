// app/home/actions.ts

import { getappuser } from "../app/actions"
import { getMachines } from "../computers/actions"
import { getSchedules } from "../time/actions"

export const getStats = async () => {
  const computers = await getMachines()
  const users = await getappuser()
  const schedules = await getSchedules()
  return {
    active_users: users.length,
    computers: computers.length,
    hours_today: schedules.length,
    productivity: `${Math.round((schedules.length / users.length) * 100)}%`
  }
}