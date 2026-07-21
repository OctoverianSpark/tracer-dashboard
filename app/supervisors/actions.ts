'use server'
import { getappuser } from '../app/actions'
import { getMachines, findAsignedMachines } from '../computers/actions'
import { getSchedules, getProgramations, getRawAppUsageLogs, getAllRotations } from '../time/actions'
import { resolveEffectiveProgramation } from '@/lib/scheduleResolver'
import { computeProductivityRange, type UserProductivity } from '@/lib/productivity'
import { AppUser } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation } from '@/types/Schedules'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export interface UserConnectionStatus {
  user: AppUser
  wsConnected: boolean      // WebSocket activo ahora mismo
  isConnected: boolean      // wsConnected O tiene tiempo registrado hoy
  shouldBeConnected: boolean
  machine?: Machine
  programation?: Programation
  startTime?: string
  endTime?: string
  todaySeconds: number      // segundos de uso de apps contados hoy
}

export const getUserConnectionStatuses = async (): Promise<UserConnectionStatus[]> => {
  // All time logic uses Bogotá (UTC-5) — the server may run in a different timezone
  const bogota   = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  const todayStr = bogota.toLocaleDateString('sv')   // YYYY-MM-DD
  const nowMs    = bogota.getTime()

  const [users, machines, schedules, programations, rawLogs, rotations] = await Promise.all([
    getappuser(),
    getMachines(),
    getSchedules(),
    getProgramations(),
    getRawAppUsageLogs(todayStr),
    getAllRotations(),
  ])

  // Segundos de uso por machine_id para hoy: se suma `active_seconds` de cada intervalo, no su
  // duración total (interval_end - interval_start). El agente sigue registrando intervalos de
  // forma continua aunque el usuario esté inactivo (active_seconds=0, idle_seconds=60), así que
  // contar la duración del intervalo infla el total con horas de inactividad. Se descartan
  // además intervalos con interval_start posterior al momento actual (reloj desincronizado en
  // el equipo monitoreado).
  const secondsByMachine = new Map<number, number>()
  for (const log of rawLogs) {
    const startMs = new Date(log.interval_start).getTime()
    if (startMs > nowMs) continue
    const cid  = Number(log.computer_id)
    const secs = log.active_seconds ?? 0
    secondsByMachine.set(cid, (secondsByMachine.get(cid) ?? 0) + secs)
  }

  // Máquinas por usuario
  const machinesPerUser = await Promise.all(
    users.map(u =>
      findAsignedMachines(Number(u.id))
        .then(ms => ({ userId: Number(u.id), machines: ms }))
        .catch(() => ({
          userId: Number(u.id),
          machines: machines.filter(m => Number(m.appuser_id) === Number(u.id)),
        }))
    )
  )
  const machinesByUser = new Map(machinesPerUser.map(r => [r.userId, r.machines]))

  // getMachines() (/machines/list) devuelve isAlive/alive correctamente.
  // findAsignedMachines() (/machines?appuser_id=...) puede no incluirlos.
  // Construimos un mapa de alive status por id y por serial para enriquecer.
  const aliveById     = new Map<number, boolean>()
  const aliveBySerial = new Map<string, boolean>()
  for (const m of machines) {
    const live = !!(m.isAlive || m.alive)
    if (m.id != null) aliveById.set(Number(m.id), live)
    aliveBySerial.set(m.serial_number, live)
  }

  const todayKey    = DAY_KEYS[bogota.getDay()]
  const currentTime = `${bogota.getHours().toString().padStart(2, '0')}:${bogota.getMinutes().toString().padStart(2, '0')}`

  return users.map(user => {
    const programation = resolveEffectiveProgramation(
      schedules, rotations, programations, Number(user.id), todayKey, todayStr
    )

    let shouldBeConnected = false
    let startTime: string | undefined
    let endTime: string | undefined

    if (programation) {
      startTime = programation.start_day
      endTime   = programation.end_day
      shouldBeConnected =
        !user.on_vacation &&
        currentTime >= programation.start_day &&
        (!programation.end_day || currentTime <= programation.end_day)
    }

    const userMachines = machinesByUser.get(Number(user.id)) ?? []
    // Enriquecer con alive status del endpoint autoritativo (/machines/list)
    const enriched = userMachines.map(m => {
      const live = aliveById.get(Number(m.id)) ?? aliveBySerial.get(m.serial_number) ?? !!(m.isAlive || m.alive)
      return { ...m, isAlive: live, alive: live }
    })

    const machine      = enriched.find(m => m.isAlive || m.alive) ?? enriched[0]
    const wsConnected  = !!(machine && (machine.isAlive || machine.alive))
    const todaySeconds = enriched.reduce((sum, m) => sum + (secondsByMachine.get(Number(m.id)) ?? 0), 0)
    const isConnected  = wsConnected || todaySeconds > 0

    return { user, wsConnected, isConnected, shouldBeConnected, machine, programation, startTime, endTime, todaySeconds }
  })
}


// Rango de un solo día (dateFrom === dateTo) reproduce exactamente el reporte histórico de un
// día; un rango más amplio suma los totales de cada día en vez de promediar porcentajes (ver
// computeProductivityRange en lib/productivity.ts). appuserId acota el cálculo a un solo
// usuario — además de filtrar el resultado, evita el fan-out de máquinas/state-logs del resto.
export const getProductivityReport = async (
  dateFrom: string,
  dateTo: string,
  appuserId?: number,
): Promise<UserProductivity[]> => {
  const allUsers = await getappuser()
  const users = appuserId != null ? allUsers.filter(u => Number(u.id) === appuserId) : allUsers
  return computeProductivityRange(users, dateFrom, dateTo)
}