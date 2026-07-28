import { findAsignedMachines } from '@/app/computers/actions'
import { getRawAppUsageLogsRange, getSchedules, getProgramations, getStateLog, getAllRotations } from '@/app/time/actions'
import { getCategorizationApps } from '@/app/supervisors/categorization-actions'
import { getLunchSkips } from '@/app/th/actions'
import { getProductivitySettings } from '@/app/app/admin/config/actions'
import { resolveEffectiveProgramation } from '@/lib/scheduleResolver'
import { AppUser, AppUsageLog } from '@/types/AppUser'
import { Machine } from '@/types/Machine'
import { Programation, Schedule, RotationData } from '@/types/Schedules'
import { StateLog } from '@/types/StateLog'
import { WORK_STATE_CODE } from '@/types/States'

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
  productiveSeconds: number
  unproductiveSeconds: number
  uncategorizedSeconds: number
  totalSeconds: number
  appProductivityPercent: number
  workCompliancePercent: number
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

/**
 * Factor 0.8x–1.2x según qué tan productiva fue la mezcla de apps DENTRO del tiempo activo —
 * multiplica al cumplimiento de malla horaria (la base real del cálculo Global, ver
 * computeUserDayStats/computeProductivityRange/computeProductivityDaily). Sin datos de apps
 * categorizadas (hueco del pipeline de app-usage-logs, ej. capturas/estado sí registran
 * presencia pero no hay `apps` en esos intervalos) devuelve 1 (neutro) — así alguien presente y
 * cumpliendo horario no cae a 0% solo porque falta el desglose de apps.
 *
 * unproductiveCredit: antes el tiempo improductivo no sumaba nada al numerador del ratio (crédito
 * implícito 0) — cada segundo improductivo diluía la mezcla al máximo. Ahora cuenta con su propio
 * peso configurable (por defecto 20%), menos agresivo: sigue penalizando pero no a cero.
 */
export function appQualityFactor(
  productiveSecs: number,
  unproductiveSecs: number,
  uncategorizedSecs: number,
  productiveCredit: number,
  uncategorizedCredit: number,
  unproductiveCredit: number,
): number {
  const appSecs = productiveSecs + unproductiveSecs + uncategorizedSecs
  const ratio = appSecs > 0
    ? Math.min(1, Math.max(0, (
        productiveSecs * productiveCredit
        + uncategorizedSecs * uncategorizedCredit
        + unproductiveSecs * unproductiveCredit
      ) / appSecs))
    : 0.5
  return 0.8 + 0.4 * ratio
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

// Construye ventanas de tiempo donde el estado era ACTIVE para un día dado.
// Cada StateLog marca el inicio de un nuevo estado; el siguiente log marca su fin.
export const buildActiveWindows = (stateLogs: StateLog[]): Array<{ start: number; end: number }> => {
  const sorted = [...stateLogs].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const windows: Array<{ start: number; end: number }> = []
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].category?.key !== 'active') continue
    const start = new Date(sorted[i].timestamp).getTime()
    const end = i + 1 < sorted.length
      ? new Date(sorted[i + 1].timestamp).getTime()
      : Infinity
    windows.push({ start, end })
  }
  return windows
}

// Buffer para una ventana activa que quedó abierta sin ningún log/intervalo posterior ese día
// (agente que se quedó pegado en 'active', PC apagado sin log de cierre, etc.) y tampoco hay
// evidencia real de telemetría después de su inicio — se le da este empujón corto en vez de 0,
// asumiendo un solo ciclo de reporte del agente, no horas.
const STALE_ACTIVE_WINDOW_BUFFER_MS = 5 * 60 * 1000

// Cierra ventanas activas "abiertas" (end=Infinity de buildActiveWindows, sin log de cierre ese
// día) usando la última evidencia real de telemetría (state_logs o app_usage_logs posteriores al
// inicio de la ventana) como tope, en vez de extenderlas hasta el fin del día/turno. Antes esa
// extensión quedaba acotada "por accidente" por la ventana del turno programado (unas pocas
// horas); al pasar a día completo (para contar horas extra, ver dayWinStart/dayWinEnd) una
// ventana abierta sin cierre podía inflarse a horas fantasma (ej. 19h reportadas contra una
// jornada de 8h) — un estado 'active' sin nada después no prueba que la persona siguió
// trabajando hasta medianoche.
function closeTrailingActiveWindows(
  windows: Array<{ start: number; end: number }>,
  lastEvidenceMs: number,
  hardCapMs: number,
): Array<{ start: number; end: number }> {
  return windows.map(w => w.end === Infinity
    ? { start: w.start, end: Math.min(hardCapMs, Math.max(lastEvidenceMs, w.start + STALE_ACTIVE_WINDOW_BUFFER_MS)) }
    : w
  )
}

// Devuelve true si el punto medio del intervalo de app cae dentro de una ventana activa.
export const isIntervalActive = (log: AppUsageLog, windows: Array<{ start: number; end: number }>): boolean => {
  if (windows.length === 0) return true // sin datos de estado → contar todo
  const mid = (new Date(log.interval_start).getTime() + new Date(log.interval_end).getTime()) / 2
  return windows.some(w => mid >= w.start && mid < w.end)
}

// Segundos de solapamiento entre ventanas [start,end) (ej. de buildActiveWindows) y el rango
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
  // Pesos configurables del cálculo Global (ver app/app/admin/config) — uncategorized_credit
  // (crédito del tiempo en apps sin categorizar), productive_credit (peso del tiempo productivo)
  // y unproductive_credit (peso del tiempo improductivo, ver appQualityFactor).
  uncategorizedCredit: number
  productiveCredit: number
  unproductiveCredit: number
}

interface UserDayStats {
  programation?: Programation
  scheduledMinutes: number
  productive: number
  unproductive: number
  uncategorized: number
  total: number
  appUsage: Map<string, UserAppUsage>
}

const EMPTY_DAY_STATS: UserDayStats = {
  scheduledMinutes: 0, productive: 0, unproductive: 0, uncategorized: 0, total: 0,
  appUsage: new Map(),
}

// Un día puntual para un usuario: ventana de jornada, filtra intervalos activos, clasifica
// productivo/improductivo/sin-categorizar. No decide si el día "cuenta" — computeProductivityRange
// lo salta cuando scheduledMinutes=0; computeProductivityDaily lo devuelve igual (en cero) para
// que la curva tenga el eje de fechas continuo.
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
  for (const m of userMachines) {
    const mid = Number(m.id)
    dayIntervals.push(...(dayLogsByMachine.get(mid) ?? []))
    dayActiveWindows.push(...buildActiveWindows(dayStateByMachine.get(mid) ?? []))
  }
  // Ya NO se corta acá por falta de app_usage_logs — state_logs (dayActiveWindows) es un canal
  // de telemetría aparte y puede tener datos de presencia (capturas, cumplimiento) aunque ese
  // día no haya intervalos de uso de apps.
  if (!dayIntervals.length && !dayActiveWindows.length) return { ...EMPTY_DAY_STATS, programation, scheduledMinutes }

  // 'Z' explícito: los timestamps de BD son horas de Bogotá "sin conversión", igual que
  // interval_start/interval_end (ver comentario en loadRangeContext) — sin el 'Z', esto se
  // parsea como hora LOCAL DEL SERVIDOR, que puede no ser UTC, desfasando la ventana contra la
  // actividad real y descartando horas de trabajo enteras silenciosamente.
  //
  // Ventana del DÍA COMPLETO, no del turno programado (programation.start_day–end_day) — pero
  // SOLO si el usuario tiene horario o rotación real asignada (`resolved`). Sin eso, "horas
  // extra" no tiene contra qué medirse (DEFAULT_PROGRAMATION es un supuesto, no un turno real), y
  // ampliar la ventana ahí produce horas infladas sin ningún horario de referencia (ej. 19h
  // "Productivo" contra una jornada asumida de 8h) — para ese caso se mantiene el tope de la
  // jornada por defecto, igual que antes de contar horas extra.
  // Con horario/rotación real: 'active' (state_categories) agrupa 'working' Y 'overtime' por
  // diseño (ver seed en 20260706140000_state_categories_and_states/migration.sql:
  // "working/overtime -> active"), así que cualquier ventana activa del día, esté o no dentro del
  // turno, es tiempo trabajado real y debe sumar a Productivo/cumplimiento — la jornada programada
  // (`scheduledMinutes`) sigue siendo el denominador del % de cumplimiento, eso no cambia.
  const hasRealSchedule = resolved != null
  // Estado 'overtime' (code=1, ver WORK_STATE_CODE) marcado explícitamente ese día — habilita
  // superar el tope de jornada+1h de abajo. Sin esta marca, cualquier exceso se recorta: no hay
  // forma de distinguir "de verdad se quedó trabajando" de datos ruidosos (ventanas activas mal
  // cerradas, relojes desincronizados, etc.) sin una señal explícita del agente/supervisor.
  const hasOvertimeLog = userMachines.some(m =>
    (dayStateByMachine.get(Number(m.id)) ?? []).some(sl => sl.state?.code === WORK_STATE_CODE.OVERTIME)
  )
  const dayNowMs = date === ctx.todayStr ? ctx.nowMs : Infinity
  const dayWinStart = hasRealSchedule
    ? new Date(`${date}T00:00:00Z`).getTime()
    : new Date(`${date}T${programation.start_day}:00Z`).getTime()
  const dayWinEnd = Math.min(
    hasRealSchedule
      ? new Date(`${date}T23:59:59Z`).getTime()
      : new Date(`${date}T${programation.end_day || '23:00'}:00Z`).getTime(),
    dayNowMs,
  )

  // Última evidencia real de telemetría ese día (cualquier machine del usuario) — tope para
  // cerrar ventanas activas abiertas, ver closeTrailingActiveWindows.
  const lastEvidenceMs = Math.max(
    dayWinStart,
    ...dayIntervals.map(iv => new Date(iv.interval_end).getTime()),
    ...userMachines.flatMap(m =>
      (dayStateByMachine.get(Number(m.id)) ?? []).map(sl => new Date(sl.timestamp).getTime())
    ),
  )
  const closedActiveWindows = closeTrailingActiveWindows(dayActiveWindows, lastEvidenceMs, dayWinEnd)

  // `total` (cumplimiento) sale de los estados ACTIVE de state_logs dentro del día — independiente
  // de que existan app_usage_logs ese día, así alguien presente (capturas, estado activo) pero sin
  // ese canal de datos puntual no cae a 0% de cumplimiento. Si no hay state_logs para el día
  // (agente viejo o hueco puntual), cae al criterio anterior: sumar duración de los intervalos de
  // app_usage_logs dentro de la ventana.
  let total = closedActiveWindows.length > 0
    ? sumWindowSecondsInRange(closedActiveWindows, dayWinStart, dayWinEnd)
    : sumWindowSecondsInRange(
        dayIntervals.map(iv => ({
          start: new Date(iv.interval_start).getTime(),
          end: new Date(iv.interval_end).getTime(),
        })),
        dayWinStart, dayWinEnd,
      )

  let productive = 0, unproductive = 0, uncategorized = 0
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
      const resolved: UserAppUsage['category'] = cat === 'productive' ? 'productive'
        : cat === 'unproductive' ? 'unproductive'
          : 'uncategorized'

      if (resolved === 'productive') productive += secs
      else if (resolved === 'unproductive') unproductive += secs
      else uncategorized += secs

      const existing = appUsage.get(a.app)
      if (existing) existing.seconds += secs
      else appUsage.set(a.app, { app: a.app, seconds: secs, category: resolved })
    }

    // Tiempo idle (mouse/teclado sin actividad dentro del intervalo, reportado aparte de
    // `apps` por el agente) cuenta como improductivo — cubre el hueco entre `active_seconds` e
    // `idle_seconds` que `apps` no reparte en ninguna app puntual.
    unproductive += Math.min(interval.idle_seconds ?? 0, intervalSecs)
  }

  // Con horario real y SIN 'Tiempo extra' marcado, el total del día no puede superar la jornada
  // programada + 1h de margen (ej. jornada de 10h → tope de 11h) — reescala productivo/
  // improductivo/sin-categorizar proporcionalmente para que sigan sumando el nuevo total en vez
  // de quedar inconsistentes contra él.
  if (hasRealSchedule && !hasOvertimeLog) {
    const capSecs = scheduledMinutes * 60 + 3600
    if (total > capSecs) {
      const scale = capSecs / total
      productive = Math.round(productive * scale)
      unproductive = Math.round(unproductive * scale)
      uncategorized = Math.round(uncategorized * scale)
      total = capSecs
    }
  }

  return { programation, scheduledMinutes, productive, unproductive, uncategorized, total, appUsage }
}

// Prepara todo lo que no depende de un usuario puntual (catálogos, logs de app-usage y de
// estado agrupados por fecha) — compartido entre computeProductivityRange y
// computeProductivityDaily para no duplicar los mismos 5 fetches.
async function loadRangeContext(users: AppUser[], dateFrom: string, dateTo: string) {
  const dates = dateRange(dateFrom, dateTo)

  // "Ahora" en dos formas, ambas independientes del timezone del proceso que corre esto:
  // - todayStr: fecha de Bogotá, calculada directo desde el instante real (`now`) con
  //   `timeZone` explícito — no depende de re-parsear un string sin offset.
  // - nowMs: OJO, no es el instante real — son los dígitos de reloj de Bogotá tratados como si
  //   fueran UTC (agregando 'Z' al re-parsear). Es el mismo criterio que usan
  //   interval_start/interval_end al llegar del backend (ver dayWinStart/dayWinEnd en
  //   computeUserDayStats) — MySQL DATETIME no tiene timezone, así que la hora de Bogotá que
  //   manda el agente queda guardada tal cual y Prisma la serializa con 'Z' sin convertirla.
  //   nowMs tiene que vivir en ese mismo espacio "dígitos de Bogotá + Z" para que
  //   `Math.min(dayWinEnd, dayNowMs)` compare cosas comparables sin importar en qué timezone
  //   corra este proceso.
  const now = new Date()
  const todayStr = now.toLocaleDateString('sv', { timeZone: 'America/Bogota' })
  const bogotaClockStr = now.toLocaleString('sv', { timeZone: 'America/Bogota' }).replace(' ', 'T')
  const nowMs = new Date(`${bogotaClockStr}Z`).getTime()

  const [schedules, programations, rawLogs, categorizationApps, rotations, { machinesByUser, stateByMachine }, lunchSkips, productivitySettings] =
    await Promise.all([
      getSchedules(),
      getProgramations(),
      getRawAppUsageLogsRange(dateFrom, dateTo),
      getCategorizationApps(),
      getAllRotations(),
      loadMachinesAndStateLogs(users),
      getLunchSkips(dateFrom, dateTo),
      getProductivitySettings(),
    ])

  const categoryMap = new Map(categorizationApps.map(a => [a.name.toLowerCase(), a.category]))
  const lunchSkipDates = new Set(lunchSkips.map(ls => `${ls.appuser_id}_${ls.date.slice(0, 10)}`))

  const logsByMachineByDate = new Map<string, Map<number, AppUsageLog[]>>()
  for (const date of dates) logsByMachineByDate.set(date, new Map())
  for (const log of rawLogs) {
    const date = log.interval_start?.slice(0, 10)
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
      const date = log.timestamp?.slice(0, 10)
      const byMachine = stateByMachineByDate.get(date)
      if (!byMachine) continue // fuera del rango pedido
      if (!byMachine.has(machineId)) byMachine.set(machineId, [])
      byMachine.get(machineId)!.push(log)
    }
  }

  const ctx: DayContext = {
    schedules, rotations, programations, categoryMap, todayStr, nowMs, lunchSkipDates,
    uncategorizedCredit: productivitySettings.uncategorized_credit,
    productiveCredit: productivitySettings.productive_credit,
    unproductiveCredit: productivitySettings.unproductive_credit,
  }
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

    let productive = 0, unproductive = 0, uncategorized = 0, total = 0, scheduledMinutes = 0
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
      uncategorized += day.uncategorized
      total += day.total
      for (const [app, usage] of day.appUsage) {
        const existing = appMap.get(app)
        if (existing) existing.seconds += usage.seconds
        else appMap.set(app, { ...usage })
      }
    }

    const categorized = productive + unproductive
    const scheduledSecs = scheduledMinutes * 60
    const workCompliancePercent = scheduledSecs > 0 ? Math.min(100, Math.round((total / scheduledSecs) * 100)) : 0

    // Global = cumplimiento de malla horaria (presencia real, `total`) como base × factor de
    // calidad de apps — no depende de que exista desglose de apps para no mostrar 0% cuando la
    // persona sí cumplió horario (ver appQualityFactor).
    const quality = appQualityFactor(productive, unproductive, uncategorized, ctx.productiveCredit, ctx.uncategorizedCredit, ctx.unproductiveCredit)
    const overallProductivityPercent = scheduledSecs > 0
      ? Math.min(100, Math.round(workCompliancePercent * quality))
      : 0

    return {
      user, machine: primaryMachine, programation: lastProgramation, scheduledMinutes,
      productiveSeconds: Math.round(productive),
      unproductiveSeconds: Math.round(unproductive),
      uncategorizedSeconds: Math.round(uncategorized),
      totalSeconds: Math.round(total),
      appProductivityPercent: categorized > 0 ? Math.round((productive / categorized) * 100) : 0,
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
  uncategorizedSeconds: number
  // total - (productive+unproductive+uncategorized): presencia real (state_logs) sin desglose de
  // apps ese intervalo (hueco del pipeline de app-usage-logs). Existe para que la curva pueda
  // mostrar esta franja en vez de dejar que el área apilada (basada solo en apps) se quede corta
  // frente a `totalSeconds`/el % de productividad (que sí usa `total`) — ver ProductivityCurveChart.
  noAppDataSeconds: number
  totalSeconds: number
  scheduledMinutes: number
  overallProductivityPercent: number
}

/**
 * Desglose día por día (para la curva de productividad) de uno o varios usuarios sobre
 * [dateFrom, dateTo] — varios usuarios se combinan en una sola curva (uso: "global"/"por grupo").
 * A diferencia de computeProductivityRange, nunca salta un día — uno sin horario/actividad
 * aporta cero, para que el gráfico tenga el eje de fechas continuo.
 *
 * `overallProductivityPercent` y los segundos (productiveSeconds, etc.) son PROMEDIOS — suma del
 * día ÷ cantidad de usuarios con turno ese día, no la suma cruda del grupo — así un día con menos
 * gente programada no muestra menos horas solo por tener menos gente, y un usuario muy productivo
 * con poca jornada no pesa más que uno con jornada larga.
 */
export async function computeProductivityDaily(
  users: AppUser[],
  dateFrom: string,
  dateTo: string,
): Promise<DailyProductivity[]> {
  const { dates, ctx, machinesByUser, logsByMachineByDate, stateByMachineByDate } =
    await loadRangeContext(users, dateFrom, dateTo)

  return dates.map(date => {
    let productive = 0, unproductive = 0, uncategorized = 0, total = 0, scheduledMinutes = 0
    let percentSum = 0, scheduledUserCount = 0

    for (const user of users) {
      const userId = Number(user.id)
      const userMachines = machinesByUser.get(userId) ?? []
      const day = computeUserDayStats(
        userId, userMachines, date, ctx,
        logsByMachineByDate.get(date)!, stateByMachineByDate.get(date)!,
      )
      productive += day.productive
      unproductive += day.unproductive
      uncategorized += day.uncategorized
      total += day.total
      scheduledMinutes += day.scheduledMinutes

      if (day.scheduledMinutes > 0) {
        const userScheduledSecs = day.scheduledMinutes * 60
        const userCompliance = Math.min(100, (day.total / userScheduledSecs) * 100)
        const userQuality = appQualityFactor(day.productive, day.unproductive, day.uncategorized, ctx.productiveCredit, ctx.uncategorizedCredit, ctx.unproductiveCredit)
        percentSum += Math.min(100, userCompliance * userQuality)
        scheduledUserCount++
      }
    }

    const productiveSeconds = scheduledUserCount > 0 ? Math.round(productive / scheduledUserCount) : 0
    const unproductiveSeconds = scheduledUserCount > 0 ? Math.round(unproductive / scheduledUserCount) : 0
    const uncategorizedSeconds = scheduledUserCount > 0 ? Math.round(uncategorized / scheduledUserCount) : 0
    const totalSeconds = scheduledUserCount > 0 ? Math.round(total / scheduledUserCount) : 0

    return {
      date,
      productiveSeconds,
      unproductiveSeconds,
      uncategorizedSeconds,
      noAppDataSeconds: Math.max(0, totalSeconds - (productiveSeconds + unproductiveSeconds + uncategorizedSeconds)),
      totalSeconds,
      scheduledMinutes: scheduledUserCount > 0 ? Math.round(scheduledMinutes / scheduledUserCount) : 0,
      overallProductivityPercent: scheduledUserCount > 0 ? Math.round(percentSum / scheduledUserCount) : 0,
    }
  })
}
