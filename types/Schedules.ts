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