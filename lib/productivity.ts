import { findAsignedMachines } from '@/app/computers/actions'
import { getRawAppUsageLogsRange, getSchedules, getProgramations, getStateLog, getAllRotations } from '@/app/time/actions'
import { getCategorizationApps } from '@/app/supervisors/categorization-actions'
import { getLunchSkips } from '@/app/th/actions'
import { resolveEffectiveProgramation } from '@/lib/scheduleResolver'
import { AppUser, AppUsageLog } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation, Schedule, RotationData } from '@/types/Schedules'
import { StateLog } from '@/types/StateLog'
import { WORK_STATE_CODE } from '@/types/States'
import { bogotaToMs, bogotaDateOf } from '@/lib/bogotaTime'

const DAY_KEYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export interface UserAppUsage {
  app: string
  seconds: number
  category: 'productive' | 'unproductive' | 'uncategorized'
}

export interface UserProductivity {
  user: AppUser
  machine?: Machine
  programation?: Programation
  scheduledMinutes: number
  // Malla horaria (state_logs): tiempo en 'Trabajando'/'Tiempo extra'.
  productiveSeconds: number
  // Malla horaria (state_logs): tiempo en 'Inactivo'/'Desconectado'. Descanso/Baño/Almuerzo NO
  // cuentan acá (son pausas legítimas, igual que el almuerzo ya se excluye de scheduledMinutes).
  unproductiveSeconds: number
  // Malla horaria (state_logs): tiempo en 'Descanso'/'Baño'/'Almuerzo' — informativo, no suma a
  // totalSeconds ni a ningún % (ni Cumplimiento ni Productividad).
  neutralSeconds: number
  // = productiveSeconds + unproductiveSeconds, por definición (neutralSeconds queda fuera).
  totalSeconds: number
  workCompliancePercent: number
  // = productiveSeconds / (scheduledMinutes×60) — qué tanto de la jornada programada fue tiempo
  // realmente productivo (Trabajando/Tiempo extra), sin depender de apps.
  overallProductivityPercent: number
  topApps: UserAppUsage[]
}

// Vista TH: mismos datos que UserProductivity sin machine/topApps (definida acá, no en
// app/th/actions.ts, porque los archivos 'use server' solo deben exportar funciones async —
// exportar un tipo desde ahí rompe en runtime bajo Turbopack: "X is not defined").
export type THProductivity = Omit<UserProductivity, 'machine' | 'topApps'>

export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Jornada aplicada cuando el usuario no tiene horario fijo NI rotación asignada (~90% de la
// planta en producción hoy). Antes esto caía a scheduledMinutes=0 → EMPTY_DAY_STATS, mostrando
// 0% indistinguible de "cumplió cero" para gente que sí está trabajando. Mismo horario que
// "Turno Normal" (08:00-18:00, almuerzo 12:00-13:00) = 8h, a falta de una asignación real.
const DEFAULT_PROGRAMATION: Programation = {
  name: 'Jornada general (sin horario asignado)',
  start_day: '08:00',
  start_lunch: '12:00',
  end_lunch: '13:00',
  end_day: '18:00',
}

// skipLunch: excepción puntual de un usuario+fecha (ver lunch_skips / THScheduleView "Quitar
// almuerzo") — ese día no se resta el bloque de almuerzo de la jornada programada.
export const scheduledWorkMinutes = (prog: Programation, skipLunch = false): number => {
  if (!prog.start_day || !prog.end_day) return 0
  let total = timeToMinutes(prog.end_day) - timeToMinutes(prog.start_day)
  if (!skipLunch && prog.start_lunch && prog.end_lunch) {
    total -= timeToMinutes(prog.end_lunch) - timeToMinutes(prog.start_lunch)
  }
  return Math.max(0, total)
}

// Construye ventanas de tiempo para un día dado, donde el estado (code) estaba en `codes`.
// Cada StateLog marca el inicio de un nuevo estado; el siguiente log marca su fin.
function buildStateWindows(stateLogs: StateLog[], codes: readonly number[]): Array<{ start: number; end: number }> {
  const sorted = [...stateLogs].sort((a, b) => {
    const byTime = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    return byTime !== 0 ? byTime : Number(a.id ?? 0) - Number(b.id ?? 0)
  })

  // Algunos agentes mandan lecturas contradictorias en el mismo timestamp exacto (ej.
  // 'Trabajando' e 'Inactivo' al mismo segundo — visto en un caso real: ~8500 timestamps
  // duplicados de ~11700 logs en un solo día para una máquina). Sin deduplicar, cada par así crea
  // una ventana de 0 segundos de duración, diluyendo el cálculo. Se conserva solo la ÚLTIMA
  // lectura de cada timestamp (mayor id = insertada después = más "afinada" para ese instante).
  const deduped: StateLog[] = []
  for (const log of sorted) {
    const prev = deduped[deduped.length - 1]
    if (prev && prev.timestamp === log.timestamp) deduped[deduped.length - 1] = log
    else deduped.push(log)
  }

  const windows: Array<{ start: number; end: number }> = []
  for (let i = 0; i < deduped.length; i++) {
    const code = deduped[i].state?.code
    if (code == null || !codes.includes(code)) continue
    const start = new Date(deduped[i].timestamp).getTime()
    const end = i + 1 < deduped.length
      ? new Date(deduped[i + 1].timestamp).getTime()
      : Infinity
    windows.push({ start, end })
  }
  return windows
}

// Ventanas "Productivo" de la malla horaria: 'Trabajando' + 'Tiempo extra'.
export const buildActiveWindows = (stateLogs: StateLog[]): Array<{ start: number; end: number }> =>
  buildStateWindows(stateLogs, [WORK_STATE_CODE.WORKING, WORK_STATE_CODE.OVERTIME])

// 'Inactivo' y 'Desconectado' se construyen por separado (no combinados) porque 'Inactivo' que
// cae dentro del rango de almuerzo del horario se reclasifica a Neutral más abajo — alguien
// idle mientras almuerza no es "improductivo", es que está almorzando sin haber marcado el
// estado explícito 'Almuerzo'. 'Desconectado' nunca se reclasifica así.
export const buildIdleWindows = (stateLogs: StateLog[]): Array<{ start: number; end: number }> =>
  buildStateWindows(stateLogs, [WORK_STATE_CODE.IDLE])

export const buildOfflineWindows = (stateLogs: StateLog[]): Array<{ start: number; end: number }> =>
  buildStateWindows(stateLogs, [WORK_STATE_CODE.OFFLINE])

// Ventanas "Neutral" de la malla horaria: 'Descanso' + 'Baño' + 'Almuerzo' — pausas legítimas,
// ni productivas ni improductivas, informativas.
export const buildNeutralWindows = (stateLogs: StateLog[]): Array<{ start: number; end: number }> =>
  buildStateWindows(stateLogs, [WORK_STATE_CODE.BREAK, WORK_STATE_CODE.WC, WORK_STATE_CODE.LUNCH])

// Buffer para una ventana que quedó abierta sin ningún log/intervalo posterior ese día (agente
// que se quedó pegado en un estado, PC apagado sin log de cierre, etc.) y tampoco hay evidencia
// real de telemetría después de su inicio — se le da este empujón corto en vez de 0, asumiendo un
// solo ciclo de reporte del agente, no horas.
const STALE_WINDOW_BUFFER_MS = 5 * 60 * 1000

// Cierra ventanas "abiertas" (end=Infinity de buildStateWindows, sin log de cierre ese día)
// usando la última evidencia real de telemetría (state_logs o app_usage_logs posteriores al
// inicio de la ventana) como tope, en vez de extenderlas hasta el fin del día/turno — un estado
// sin nada después no prueba que la persona siguió en ese estado hasta medianoche (ver caso real:
// 19h "Productivo" reportadas contra una jornada de 8h por una ventana mal cerrada).
function closeTrailingWindows(
  windows: Array<{ start: number; end: number }>,
  lastEvidenceMs: number,
  hardCapMs: number,
): Array<{ start: number; end: number }> {
  return windows.map(w => w.end === Infinity
    ? { start: w.start, end: Math.min(hardCapMs, Math.max(lastEvidenceMs, w.start + STALE_WINDOW_BUFFER_MS)) }
    : w
  )
}

// Devuelve true si el punto medio del intervalo de app cae dentro de una ventana activa.
export const isIntervalActive = (log: AppUsageLog, windows: Array<{ start: number; end: number }>): boolean => {
  if (windows.length === 0) return true // sin datos de estado → contar todo
  const mid = (new Date(log.interval_start).getTime() + new Date(log.interval_end).getTime()) / 2
  return windows.some(w => mid >= w.start && mid < w.end)
}

// Segundos de solapamiento entre ventanas [start,end) (ej. de buildStateWindows) y el rango
// [winStart, winEnd) de la jornada — recorta cada ventana al rango antes de sumar.
function sumWindowSecondsInRange(
  windows: Array<{ start: number; end: number }>,
  winStart: number,
  winEnd: number,
): number {
  let secs = 0
  for (const w of windows) {
    const start = Math.max(w.start, winStart)
    const end = Math.min(w.end, winEnd)
    if (end > start) secs += Math.round((end - start) / 1000)
  }
  return secs
}

// Máquinas asignadas + historial COMPLETO de state logs por máquina (sin filtrar por fecha — el
// backend no soporta rango de fechas para state logs, así que se trae todo una sola vez y cada
// llamador filtra los días que le interesan a partir de este mismo resultado).
export const loadMachinesAndStateLogs = async (
  users: AppUser[]
): Promise<{
  machinesByUser: Map<number, Machine[]>
  stateByMachine: Map<number, StateLog[]>
}> => {
  const machinesPerUser = await Promise.all(
    users.map(u =>
      findAsignedMachines(Number(u.id))
        .then(ms => ({ userId: Number(u.id), machines: ms }))
        .catch(() => ({ userId: Number(u.id), machines: [] as Machine[] }))
    )
  )
  const machinesByUser = new Map(machinesPerUser.map(r => [r.userId, r.machines]))

  const pairs: Array<{ userId: number; machine: Machine }> = []
  for (const [userId, machines] of machinesByUser) {
    for (const m of machines) {
      if (m.id != null) pairs.push({ userId, machine: m })
    }
  }

  const stateLogResults = await Promise.all(
    pairs.map(async ({ userId, machine }) => {
      try {
        const raw = await getStateLog(userId, Number(machine.id))
        return { machineId: Number(machine.id), logs: Array.isArray(raw) ? raw as StateLog[] : [] }
      } catch {
        return { machineId: Number(machine.id), logs: [] as StateLog[] }
      }
    })
  )
  const stateByMachine = new Map(stateLogResults.map(r => [r.machineId, r.logs]))

  return { machinesByUser, stateByMachine }
}

const dateRange = (dateFrom: string, dateTo: string): string[] => {
  const dates: string[] = []
  let cursor = new Date(`${dateFrom}T12:00:00`)
  const end = new Date(`${dateTo}T12:00:00`)
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toLocaleDateString('sv'))
    cursor = new Date(cursor.getTime() + 86400000)
  }
  return dates
}

interface DayContext {
  schedules: Schedule[]
  rotations: RotationData[]
  programations: Programation[]
  categoryMap: Map<string, string>
  todayStr: string
  nowMs: number
  // Claves `${appuser_id}_${date}` con excepción "sin almuerzo" ese día (ver lunch_skips).
  lunchSkipDates: Set<string>
}

interface UserDayStats {
  programation?: Programation
  scheduledMinutes: number
  productive: number   // malla horaria: Trabajando + Tiempo extra
  unproductive: number // malla horaria: Inactivo + Desconectado
  neutral: number       // malla horaria: Descanso + Baño + Almuerzo — informativo, no suma a total
  total: number         // = productive + unproductive (neutral queda fuera)
  // Desglose por app dentro de la malla — solo para "Ver apps" (informativo), no alimenta
  // Productivo/No productivo/Productividad, que son 100% de state_logs.
  appUsage: Map<string, UserAppUsage>
}

const EMPTY_DAY_STATS: UserDayStats = {
  scheduledMinutes: 0, productive: 0, unproductive: 0, neutral: 0, total: 0,
  appUsage: new Map(),
}

// Un día puntual para un usuario. Productivo/No productivo/Productividad salen enteramente de los
// ESTADOS de la malla horaria (state_logs) — Apps (app_usage_logs) solo alimenta el desglose por
// app de "Ver apps" (`appUsage`), informativo. No decide si el día "cuenta" —
// computeProductivityRange lo salta cuando scheduledMinutes=0; computeProductivityDaily lo
// devuelve igual (en cero) para que la curva tenga el eje de fechas continuo.
function computeUserDayStats(
  userId: number,
  userMachines: Machine[],
  date: string,
  ctx: DayContext,
  dayLogsByMachine: Map<number, AppUsageLog[]>,
  dayStateByMachine: Map<number, StateLog[]>,
): UserDayStats {
  const dayKey = DAY_KEYS[new Date(`${date}T12:00:00`).getDay()]
  const resolved = resolveEffectiveProgramation(ctx.schedules, ctx.rotations, ctx.programations, userId, dayKey, date)
  const programation = resolved?.programation ?? DEFAULT_PROGRAMATION
  const skipLunch = ctx.lunchSkipDates.has(`${userId}_${date}`) || (resolved?.skipLunch ?? false)
  const scheduledMinutes = scheduledWorkMinutes(programation, skipLunch)

  if (scheduledMinutes === 0 || !userMachines.length) return { ...EMPTY_DAY_STATS, programation }

  const dayIntervals: AppUsageLog[] = []
  const dayActiveWindows: Array<{ start: number; end: number }> = []
  const dayIdleWindows: Array<{ start: number; end: number }> = []
  const dayOfflineWindows: Array<{ start: number; end: number }> = []
  const dayNeutralWindows: Array<{ start: number; end: number }> = []
  const dayStateLogsFlat: StateLog[] = []
  for (const m of userMachines) {
    const mid = Number(m.id)
    dayIntervals.push(...(dayLogsByMachine.get(mid) ?? []))
    const logs = dayStateByMachine.get(mid) ?? []
    dayStateLogsFlat.push(...logs)
    dayActiveWindows.push(...buildActiveWindows(logs))
    dayIdleWindows.push(...buildIdleWindows(logs))
    dayOfflineWindows.push(...buildOfflineWindows(logs))
    dayNeutralWindows.push(...buildNeutralWindows(logs))
  }
  // Ya NO se corta acá por falta de app_usage_logs — state_logs es un canal de telemetría aparte
  // y puede tener datos (Productivo/No productivo/Productividad, todo de malla) aunque ese día no
  // haya intervalos de uso de apps (solo se pierde el desglose informativo de "Ver apps").
  if (!dayIntervals.length && !dayActiveWindows.length && !dayIdleWindows.length && !dayOfflineWindows.length && !dayNeutralWindows.length) {
    return { ...EMPTY_DAY_STATS, programation, scheduledMinutes }
  }

  // Conversión real Bogotá→UTC (ver lib/bogotaTime.ts) — los timestamps que devuelve la API son
  // UTC real y correcto, verificado contra el header `Date` de la propia API y los `last_seen` de
  // las máquinas (tratarlos como "dígitos de Bogotá sin convertir" ponía actividad reciente horas
  // en el futuro). Sin esta conversión la ventana queda desfasada 5h contra la actividad real,
  // descartando la mayoría de las horas trabajadas silenciosamente.
  //
  // La ventana es la MALLA HORARIA asignada (programation.start_day–end_day) — si son 8h, Productivo
  // + No productivo se reparten dentro de esas 8h exactas, ni más ni menos. Solo se amplía al día
  // completo cuando hay 'Tiempo extra' (code=1, ver WORK_STATE_CODE) marcado explícitamente ese
  // día: sin esa marca no hay forma de distinguir "de verdad se quedó trabajando" de datos
  // ruidosos (ventanas mal cerradas, relojes desincronizados, etc.), así que cualquier estado
  // fuera de la malla simplemente no se cuenta.
  const hasRealSchedule = resolved != null
  const hasOvertimeLog = dayStateLogsFlat.some(sl => sl.state?.code === WORK_STATE_CODE.OVERTIME)
  const useFullDay = hasRealSchedule && hasOvertimeLog
  const dayNowMs = date === ctx.todayStr ? ctx.nowMs : Infinity
  const dayWinStart = useFullDay
    ? bogotaToMs(date, '00:00:00')
    : bogotaToMs(date, programation.start_day)
  const dayWinEnd = Math.min(
    useFullDay
      ? bogotaToMs(date, '23:59:59')
      : bogotaToMs(date, programation.end_day || '23:00'),
    dayNowMs,
  )

  // Última evidencia real de telemetría ese día (cualquier machine del usuario) — tope para
  // cerrar ventanas abiertas, ver closeTrailingWindows.
  const lastEvidenceMs = Math.max(
    dayWinStart,
    ...dayIntervals.map(iv => new Date(iv.interval_end).getTime()),
    ...dayStateLogsFlat.map(sl => new Date(sl.timestamp).getTime()),
  )
  const closedActiveWindows = closeTrailingWindows(dayActiveWindows, lastEvidenceMs, dayWinEnd)
  const closedIdleWindows = closeTrailingWindows(dayIdleWindows, lastEvidenceMs, dayWinEnd)
  const closedOfflineWindows = closeTrailingWindows(dayOfflineWindows, lastEvidenceMs, dayWinEnd)
  const closedNeutralWindows = closeTrailingWindows(dayNeutralWindows, lastEvidenceMs, dayWinEnd)

  // Rango de almuerzo del horario (programation.start_lunch–end_lunch), recortado a la ventana
  // del día — TODO ese tramo cuenta como Neutral sin importar qué estado haya (o no haya)
  // registrado ahí: si la persona quedó marcada 'Trabajando' durante su almuerzo, ese tramo
  // igual es almuerzo, no tiempo productivo; si no hay NINGÚN log ese rango (hueco de
  // telemetría), también cuenta como almuerzo en vez de quedar invisible. Si el día tiene la
  // excepción "sin almuerzo" (skipLunch), no hay rango que recortar — todo se cuenta normal.
  let lunchOverlapSecs = 0
  let lunchClipStart = 0, lunchClipEnd = 0
  if (!skipLunch && programation.start_lunch && programation.end_lunch) {
    const lunchStart = bogotaToMs(date, programation.start_lunch)
    const lunchEnd = bogotaToMs(date, programation.end_lunch)
    lunchClipStart = Math.max(dayWinStart, lunchStart)
    lunchClipEnd = Math.min(dayWinEnd, lunchEnd)
    lunchOverlapSecs = Math.max(0, Math.round((lunchClipEnd - lunchClipStart) / 1000))
  }

  // Suma una serie de ventanas dentro de la malla, EXCLUYENDO lo que caiga en el rango de
  // almuerzo (ese tramo se cuenta aparte, una sola vez, como `lunchOverlapSecs` en Neutral).
  const sumExcludingLunch = (windows: Array<{ start: number; end: number }>): number => {
    const full = sumWindowSecondsInRange(windows, dayWinStart, dayWinEnd)
    if (lunchOverlapSecs === 0) return full
    return full - sumWindowSecondsInRange(windows, lunchClipStart, lunchClipEnd)
  }

  const productive = sumExcludingLunch(closedActiveWindows)
  const unproductive = sumExcludingLunch(closedOfflineWindows) + sumExcludingLunch(closedIdleWindows)
  const neutral = sumExcludingLunch(closedNeutralWindows) + lunchOverlapSecs
  const total = productive + unproductive

  // Apps: solo alimenta el desglose por app (`appUsage`, usado en "Ver apps") — informativo, ya
  // no decide Productivo/No productivo ni el % de Productividad.
  const appUsage = new Map<string, UserAppUsage>()

  for (const interval of dayIntervals) {
    const startMs = new Date(interval.interval_start).getTime()
    const endMs = new Date(interval.interval_end).getTime()
    if (startMs < dayWinStart || startMs >= dayWinEnd) continue
    if (!isIntervalActive(interval, dayActiveWindows)) continue

    const intervalSecs = endMs > startMs ? Math.round((endMs - startMs) / 1000) : 300

    for (const a of interval.apps ?? []) {
      const cat = ctx.categoryMap.get(a.app.toLowerCase())
      if (cat === 'ignore') continue

      const secs = Math.min(a.seconds, intervalSecs)
      const resolvedCategory: UserAppUsage['category'] = cat === 'productive' ? 'productive'
        : cat === 'unproductive' ? 'unproductive'
          : 'uncategorized'

      const existing = appUsage.get(a.app)
      if (existing) existing.seconds += secs
      else appUsage.set(a.app, { app: a.app, seconds: secs, category: resolvedCategory })
    }
  }

  return { programation, scheduledMinutes, productive, unproductive, neutral, total, appUsage }
}

// Prepara todo lo que no depende de un usuario puntual (catálogos, logs de app-usage y de
// estado agrupados por fecha) — compartido entre computeProductivityRange y
// computeProductivityDaily para no duplicar los mismos fetches.
async function loadRangeContext(users: AppUser[], dateFrom: string, dateTo: string) {
  const dates = dateRange(dateFrom, dateTo)

  // Los timestamps que devuelve la API son UTC real (ver lib/bogotaTime.ts) — así que "ahora" es
  // directo, sin ningún truco de reinterpretación de dígitos:
  // - todayStr: fecha de Bogotá, para saber qué día del rango es "hoy" en la zona horaria real
  //   del negocio, no la del proceso que corre esto.
  // - nowMs: el instante real, tal cual — comparable 1:1 contra interval_start/interval_end y
  //   state_logs.timestamp porque todos viven en el mismo espacio (UTC real).
  const now = new Date()
  const todayStr = now.toLocaleDateString('sv', { timeZone: 'America/Bogota' })
  const nowMs = now.getTime()

  const [schedules, programations, rawLogs, categorizationApps, rotations, { machinesByUser, stateByMachine }, lunchSkips] =
    await Promise.all([
      getSchedules(),
      getProgramations(),
      getRawAppUsageLogsRange(dateFrom, dateTo),
      getCategorizationApps(),
      getAllRotations(),
      loadMachinesAndStateLogs(users),
      getLunchSkips(dateFrom, dateTo),
    ])

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))
  const lunchSkipDates = new Set(lunchSkips.map(ls => `${ls.appuser_id}_${ls.date.slice(0, 10)}`))

  // Agrupar por la fecha CALENDARIO DE BOGOTÁ del timestamp real (bogotaDateOf), no por el
  // prefijo crudo del string (que es fecha UTC) — un log de las 20:30 Bogotá (01:30 UTC del día
  // siguiente) debe caer en el día de Bogotá, no en el de UTC, o se pierde/desplaza un día entero.
  const logsByMachineByDate = new Map<string, Map<number, AppUsageLog[]>>()
  for (const date of dates) logsByMachineByDate.set(date, new Map())
  for (const log of rawLogs) {
    const date = bogotaDateOf(log.interval_start)
    const byMachine = logsByMachineByDate.get(date)
    if (!byMachine) continue // fuera del rango pedido, no debería pasar
    const cid = Number(log.computer_id)
    if (!byMachine.has(cid)) byMachine.set(cid, [])
    byMachine.get(cid)!.push(log)
  }

  const stateByMachineByDate = new Map<string, Map<number, StateLog[]>>()
  for (const date of dates) stateByMachineByDate.set(date, new Map())
  for (const [machineId, logs] of stateByMachine) {
    for (const log of logs) {
      const date = bogotaDateOf(log.timestamp)
      const byMachine = stateByMachineByDate.get(date)
      if (!byMachine) continue // fuera del rango pedido
      if (!byMachine.has(machineId)) byMachine.set(machineId, [])
      byMachine.get(machineId)!.push(log)
    }
  }

  const ctx: DayContext = { schedules, rotations, programations, categoryMap, todayStr, nowMs, lunchSkipDates }
  return { dates, ctx, machinesByUser, logsByMachineByDate, stateByMachineByDate }
}

/**
 * Calcula productividad por usuario acumulada sobre [dateFrom, dateTo] (inclusive; un solo día
 * si dateFrom === dateTo). Suma los totales de cada día en vez de promediar porcentajes. Un día
 * sin `programation` para el usuario no aporta a la suma (mismo criterio que ya aplicaba por
 * día), para que un rango con días libres no infle el porcentaje final.
 */
export async function computeProductivityRange(
  users: AppUser[],
  dateFrom: string,
  dateTo: string,
): Promise<UserProductivity[]> {
  const { dates, ctx, machinesByUser, logsByMachineByDate, stateByMachineByDate } =
    await loadRangeContext(users, dateFrom, dateTo)

  return users.map(user => {
    const userId = Number(user.id)
    const userMachines = machinesByUser.get(userId) ?? []
    const primaryMachine = userMachines[0]

    let productive = 0, unproductive = 0, neutral = 0, scheduledMinutes = 0
    let lastProgramation: Programation | undefined
    const appMap = new Map<string, UserAppUsage>()

    for (const date of dates) {
      const day = computeUserDayStats(
        userId, userMachines, date, ctx,
        logsByMachineByDate.get(date)!, stateByMachineByDate.get(date)!,
      )
      if (day.scheduledMinutes === 0) continue
      if (day.programation) lastProgramation = day.programation

      scheduledMinutes += day.scheduledMinutes
      productive += day.productive
      unproductive += day.unproductive
      neutral += day.neutral
      for (const [app, usage] of day.appUsage) {
        const existing = appMap.get(app)
        if (existing) existing.seconds += usage.seconds
        else appMap.set(app, { ...usage })
      }
    }

    const total = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60
    const workCompliancePercent = scheduledSecs > 0 ? Math.min(100, Math.round((total / scheduledSecs) * 100)) : 0
    // Productividad = Productivo (Trabajando + Tiempo extra) ÷ jornada programada — sin apps.
    const overallProductivityPercent = scheduledSecs > 0 ? Math.min(100, Math.round((productive / scheduledSecs) * 100)) : 0

    return {
      user, machine: primaryMachine, programation: lastProgramation, scheduledMinutes,
      productiveSeconds: Math.round(productive),
      unproductiveSeconds: Math.round(unproductive),
      neutralSeconds: Math.round(neutral),
      totalSeconds: Math.round(total),
      workCompliancePercent,
      overallProductivityPercent,
      topApps: [...appMap.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 8),
    }
  })
}

export interface DailyProductivity {
  date: string
  productiveSeconds: number
  unproductiveSeconds: number
  neutralSeconds: number
  totalSeconds: number
  scheduledMinutes: number
  // = productiveSeconds / (scheduledMinutes×60) — sin apps, ver computeUserDayStats.
  overallProductivityPercent: number
}

/**
 * Desglose día por día (para la curva de productividad) de uno o varios usuarios sobre
 * [dateFrom, dateTo] — varios usuarios se combinan en una sola curva (uso: "global"/"por grupo").
 * A diferencia de computeProductivityRange, nunca salta un día — uno sin horario/actividad
 * aporta cero, para que el gráfico tenga el eje de fechas continuo.
 *
 * Los segundos y el % son PROMEDIOS — suma del día ÷ cantidad de usuarios con turno ese día, no
 * la suma cruda del grupo — así un día con menos gente programada no muestra menos horas solo por
 * tener menos gente, y un usuario muy productivo con poca jornada no pesa más que uno con jornada
 * larga.
 */
export async function computeProductivityDaily(
  users: AppUser[],
  dateFrom: string,
  dateTo: string,
  // Si se pasa, solo se cuenta esa máquina (ej. un usuario con dos equipos, viendo la curva de
  // uno puntual) en vez de agregar todas las asignadas al usuario.
  machineId?: number,
): Promise<DailyProductivity[]> {
  const { dates, ctx, machinesByUser, logsByMachineByDate, stateByMachineByDate } =
    await loadRangeContext(users, dateFrom, dateTo)

  return dates.map(date => {
    let productive = 0, unproductive = 0, neutral = 0, scheduledMinutes = 0
    let percentSum = 0, scheduledUserCount = 0

    for (const user of users) {
      const userId = Number(user.id)
      const allUserMachines = machinesByUser.get(userId) ?? []
      const userMachines = machineId != null
        ? allUserMachines.filter(m => Number(m.id) === machineId)
        : allUserMachines
      const day = computeUserDayStats(
        userId, userMachines, date, ctx,
        logsByMachineByDate.get(date)!, stateByMachineByDate.get(date)!,
      )
      productive += day.productive
      unproductive += day.unproductive
      neutral += day.neutral
      scheduledMinutes += day.scheduledMinutes

      if (day.scheduledMinutes > 0) {
        const userScheduledSecs = day.scheduledMinutes * 60
        const userPercent = Math.min(100, (day.productive / userScheduledSecs) * 100)
        percentSum += userPercent
        scheduledUserCount++
      }
    }

    const productiveSeconds = scheduledUserCount > 0 ? Math.round(productive / scheduledUserCount) : 0
    const unproductiveSeconds = scheduledUserCount > 0 ? Math.round(unproductive / scheduledUserCount) : 0

    return {
      date,
      productiveSeconds,
      unproductiveSeconds,
      neutralSeconds: scheduledUserCount > 0 ? Math.round(neutral / scheduledUserCount) : 0,
      totalSeconds: productiveSeconds + unproductiveSeconds, // por definición, sin drift de redondeo
      scheduledMinutes: scheduledUserCount > 0 ? Math.round(scheduledMinutes / scheduledUserCount) : 0,
      overallProductivityPercent: scheduledUserCount > 0 ? Math.round(percentSum / scheduledUserCount) : 0,
    }
  })
}
