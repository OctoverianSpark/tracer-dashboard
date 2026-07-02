export interface Programation {

  id?: number
  name: string
  start_day: string
  start_lunch: string
  end_lunch?: string
  end_day?: string

}


export interface Schedule {
  id?: number
  appuser_id: number
  programation_id: number
  day_of_week: string
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
}

export interface RotationData {
  cycle: RotationCycle
  slots: RotationSlot[]
}

export interface DayFixedConfig {
  mode: 'fixed'
  programation_id: number
}

export interface DayRotatingConfig {
  mode: 'rotating'
  sequence: number[]        // programation_ids en orden de rotación (mínimo 2), rota semanalmente
}

export type DayConfig = DayFixedConfig | DayRotatingConfig
export type DayAssignments = Record<string, DayConfig>