
export interface AppUser {
  id?: number
  full_name: string
  email?: string
  role_id?: number
  group_id?: number
}

export interface Group {
  id?: number
  name: string
}

export interface Role {
  id?: number,
  name: string,
  access_level: string,
}