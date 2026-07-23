export interface Programation {

  id?: number
  name: string
  start_day: string
  start_lunch: string
  end_lunch?: string
  end_day?: string

}


// Presencia de fila = ese usuario no tiene almuerzo en esa fecha. No toca la Programation base.
export interface LunchSkip {
  id?: number
  appuser_id: number
  date: string
}

export interface Schedule {
  id?: number
  appuser_id: number
  programation_id: number
  day_of_week: string
  // Excepción recurrente: este día de la semana no tiene almuerzo (a diferencia de LunchSkip,
  // que es de una fecha puntual, no de la asignación).
  skip_lunch?: boolean
}

export interface RotationCycle {
  id?: number
  appuser_id: number
  name: string
  start_date: string   // ISO, ancla la semana 0 del ciclo
  weeks: number          // longitud del ciclo en semanas
}

export interface RotationSlot {
  id?: number
  rotation_cycle_id: number
  // Posición dentro de la secuencia propia de `day_of_week` (0..N-1, donde N = cantidad
  // de horarios de esa secuencia). Avanza un paso por cada semana calendario transcurrida
  // desde start_date.
  week_index: number
  day_of_week: string
  programation_id: number
  skip_lunch?: boolean
}

export interface RotationData {
  cycle: RotationCycle
  slots: RotationSlot[]
}

export interface DayFixedConfig {
  mode: 'fixed'
  programation_id: number
  skip_lunch?: boolean
}

export interface DayRotatingConfig {
  mode: 'rotating'
  sequence: number[]        // programation_ids en orden de rotación (mínimo 2), rota semanalmente
  skip_lunch?: boolean      // aplica a toda la secuencia del día, no por semana individual
}

export type DayConfig = DayFixedConfig | DayRotatingConfig
export type DayAssignments = Record<string, DayConfig>