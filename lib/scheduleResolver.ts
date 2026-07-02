import { Programation, RotationData, Schedule } from '@/types/Schedules'

const dayMs = (date: string) => new Date(`${date}T12:00:00`).getTime()

/**
 * Resuelve qué Programation aplica a un empleado en una fecha puntual: prioriza su
 * ciclo de rotación (si tiene uno activo desde esa fecha) y cae al Schedule fijo si no.
 * Debe ser la única puerta de entrada a "horario de hoy" — todo reporte que lea
 * Schedule/day_of_week directamente queda desincronizado en cuanto un empleado rota.
 */
export function resolveEffectiveProgramation(
  schedules: Schedule[],
  rotations: RotationData[],
  programations: Programation[],
  appuser_id: number,
  dayKey: string,
  date: string
): Programation | undefined {
  const rotation = rotations.find(r => Number(r.cycle.appuser_id) === appuser_id)

  if (rotation && date >= rotation.cycle.start_date) {
    const diffDays  = Math.round((dayMs(date) - dayMs(rotation.cycle.start_date)) / 86400000)
    const weekIndex = Math.floor(diffDays / 7) % rotation.cycle.weeks
    const slot = rotation.slots.find(s => s.week_index === weekIndex && s.day_of_week === dayKey)
    return slot ? programations.find(p => p.id === slot.programation_id) : undefined
  }

  const schedule = schedules.find(s => Number(s.appuser_id) === appuser_id && s.day_of_week === dayKey)
  return schedule ? programations.find(p => p.id === schedule.programation_id) : undefined
}
