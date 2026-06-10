
export interface AppUser {
  id?: number
  full_name: string
  email?: string
  role_id?: number
  group_id?: number
  on_vacation?: boolean
}

export interface Group {
  id?: number
  name: string
  block_own_reports?: boolean
  visible_group_ids?: number[]
}

export interface Role {
  id?: number,
  name: string,
  access_level: string,
}

// types/AppUser.ts - agrega esto
export interface AppUsageLog {
  id: number
  computer_id: number
  interval_start: string
  interval_end: string
  apps: { app: string; seconds: number }[]
  mouse_clicks?: number
  keystrokes?: number
  active_seconds?: number
  idle_seconds?: number
}

export interface FlatAppUsageLog {
  app: string
  seconds: number
  computer_id: number
}