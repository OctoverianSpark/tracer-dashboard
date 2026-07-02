import {
  DayAssignments,
  DayFixedConfig,
  DayRotatingConfig,
  RotationData,
  RotationSlot,
  Schedule,
} from '@/types/Schedules'

export function splitDayAssignments(assignments: DayAssignments) {
  const fixed: [string, DayFixedConfig][] = []
  const rotating: [string, DayRotatingConfig][] = []
  for (const [day, config] of Object.entries(assignments)) {
    if (config.mode === 'fixed') fixed.push([day, config])
    else rotating.push([day, config])
  }
  return { fixed, rotating }
}

// Cada día rotativo aporta su propia secuencia; week_index es la posición dentro de
// ESA secuencia (0..N-1), no una semana calendario compartida entre días.
export function buildRotationSlots(
  rotating: [string, DayRotatingConfig][]
): Omit<RotationSlot, 'id' | 'rotation_cycle_id'>[] {
  return rotating.flatMap(([day, c]) =>
    c.sequence.map((programation_id, week_index) => ({
      week_index,
      day_of_week: day,
      programation_id,
      cadence: c.cadence,
    }))
  )
}

export interface LoadedDayAssignments {
  assignments: DayAssignments
  rotationCycleId: number | null
  rotationStartDate: string
}

// Reconstruye el estado del picker a partir de lo ya guardado: días fijos desde
// Schedule, días rotativos desde el RotationCycle activo del empleado (si tiene uno).
export function loadDayAssignments(
  appuser_id: number,
  schedules: Schedule[],
  rotations: RotationData[]
): LoadedDayAssignments {
  const assignments: DayAssignments = {}

  for (const s of schedules.filter(s => Number(s.appuser_id) === appuser_id)) {
    assignments[s.day_of_week] = { mode: 'fixed', programation_id: s.programation_id }
  }

  const existing = rotations.find(r => Number(r.cycle.appuser_id) === appuser_id)
  if (!existing) {
    return { assignments, rotationCycleId: null, rotationStartDate: '' }
  }

  const byDay = new Map<string, RotationSlot[]>()
  for (const slot of existing.slots) {
    if (!byDay.has(slot.day_of_week)) byDay.set(slot.day_of_week, [])
    byDay.get(slot.day_of_week)!.push(slot)
  }
  for (const [day, slots] of byDay) {
    const sorted = [...slots].sort((a, b) => a.week_index - b.week_index)
    assignments[day] = {
      mode: 'rotating',
      sequence: sorted.map(s => s.programation_id),
      cadence: sorted[0].cadence ?? 'week',
    }
  }

  return {
    assignments,
    rotationCycleId: existing.cycle.id ?? null,
    rotationStartDate: existing.cycle.start_date,
  }
}
