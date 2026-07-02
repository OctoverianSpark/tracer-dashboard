import { Programation, RotationData, Schedule } from '@/types/Schedules'

const dayMs = (date: string) => new Date(`${date}T12:00:00`).getTime()

/**
 * Resuelve qué Programation aplica a un empleado en una fecha puntual: prioriza la
 * secuencia rotativa de ese día de la semana (si el empleado tiene una desde esa fecha)
 * y cae al Schedule fijo si el día no tiene secuencia propia.
 * Debe ser la única puerta de entrada a "horario de hoy" — todo reporte que lea
 * Schedule/day_of_week directamente queda desincronizado en cuanto un día rota.
 *
 * Cada day_of_week tiene su propia secuencia independiente (N horarios, N = cantidad de
 * slots de ese día), con su propia cadencia:
 *  - 'week': avanza un paso por cada semana calendario transcurrida desde start_date.
 *  - 'day':  avanza un paso por cada día calendario transcurrido desde start_date.
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
    const daySlots = rotation.slots.filter(s => s.day_of_week === dayKey)

    if (daySlots.length > 0) {
      const cadence  = daySlots[0].cadence ?? 'week'
      const diffDays = Math.round((dayMs(date) - dayMs(rotation.cycle.start_date)) / 86400000)
      const period   = daySlots.length
      const position = cadence === 'day'
        ? diffDays % period
        : Math.floor(diffDays / 7) % period

      const slot = daySlots.find(s => s.week_index === position)
      return slot ? programations.find(p => p.id === slot.programation_id) : undefined
    }
    // el día no tiene secuencia rotativa propia -> cae al Schedule fijo abajo
  }

  const schedule = schedules.find(s => Number(s.appuser_id) === appuser_id && s.day_of_week === dayKey)
  return schedule ? programations.find(p => p.id === schedule.programation_id) : undefined
}
