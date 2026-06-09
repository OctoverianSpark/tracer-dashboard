import { getappuser } from "../app/actions"
import { getMachines } from "../computers/actions"
import { getSchedules, getProgramations } from "../time/actions"

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

export const getUserSchedule = async (userId: number) => {
  const [schedules, programations] = await Promise.all([getSchedules(), getProgramations()])
  return {
    schedules: schedules.filter(s => Number(s.appuser_id) === userId),
    programations,
  }
}