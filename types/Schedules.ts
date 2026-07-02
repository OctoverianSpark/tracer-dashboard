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
  week_index: number     // 0..weeks-1
  day_of_week: string
  programation_id: number
}