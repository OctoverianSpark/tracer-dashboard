import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

export const PERMISSION_GROUPS = [
  {
    id: 'users_group',
    label: 'Gestión de usuarios',
    permissions: [
      { id: 'manage_users', label: 'Puede gestionar usuarios', default: false },
      { id: 'manage_groups', label: 'Puede gestionar grupos', default: false },
      { id: 'manage_roles', label: 'Puede gestionar roles', default: false },
    ]
  },
  {
    id: 'computers_group',
    label: 'Gestión de equipos',
    permissions: [
      { id: 'manage_computers', label: 'Puede gestionar equipos', default: false },
      { id: 'assign_computers', label: 'Puede asignar equipos', default: false },
    ]
  },
  {
    id: 'schedules_group',
    label: 'Gestión de horarios',
    permissions: [
      { id: 'manage_schedules', label: 'Puede gestionar horarios', default: false },
      { id: 'view_schedules', label: 'Puede ver horarios', default: false },
      { id: 'view_screenshots', label: 'Puede ver capturas', default: false }
    ]
  },
  {
    id: 'application_group',
    label: 'Aplicacion',
    permissions: [
      { id: 'use_app', label: 'Puede usar la aplicación', default: true },
      { id: 'create_tickets', label: 'Puede crear tickets', default: true },
    ]
  },
  {
    id: 'supervisors_group',
    label: 'Panel de Supervisores',
    permissions: [
      { id: 'view_supervisors', label: 'Puede acceder al panel de supervisores', default: false }
    ]
  },
  {
    id: 'th_group',
    label: 'Talento Humano',
    permissions: [
      { id: 'view_th', label: 'Puede acceder al panel de Talento Humano', default: false }
    ]
  },
  {
    id: 'releases_group',
    label: 'Actualizaciones',
    permissions: [
      { id: 'manage_releases', label: 'Puede gestionar versiones del agente', default: false }
    ]
  },
  {
    id: 'states_group',
    label: 'Estados de Trabajo',
    permissions: [
      { id: 'manage_states', label: 'Puede gestionar estados y categorías de la malla', default: false }
    ]
  },
  {
    id: 'productivity_group',
    label: 'Productividad',
    permissions: [
      { id: 'view_productivity_dashboard', label: 'Puede acceder al dashboard de productividad', default: false }
    ]
  },
  {
    id: 'admin_group',
    label: 'Administración',
    permissions: [
      { id: 'manage_sessions', label: 'Puede cerrar sesiones de usuarios', default: false }
    ]
  }
]