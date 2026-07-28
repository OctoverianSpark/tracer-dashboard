export const STATE_CODES = [0, 1, 2, 3, 4, 5, 6] as const

// Catálogo único y global — nombre/categoría/color/orden se definen una sola vez, para todos
// los grupos. Lo que varía por grupo es solo la visibilidad (ver GroupStateVisibility).

export interface StateCategory {
  id?: number
  key: string        // 'active' | 'neutral' | 'inactive' — debe calzar con el `category` que manda el agente en cada log
  name: string
  color?: string      // hex, ej '#10b981'. Si no se define, el Timeline usa un color de respaldo.
  sort_order: number
}

// code 0-6, el mismo valor que el agente envía por POST /tracer/states — mapeo fijo (no cambia
// aunque se edite `name`/categoría desde el catálogo, ver seed en
// 20260706160000_states_per_group_catalog/migration.sql):
// 0 working · 1 overtime · 2 break · 3 wc · 4 lunch · 5 idle · 6 offline
export const WORK_STATE_CODE = {
  WORKING: 0,
  OVERTIME: 1,
  BREAK: 2,
  WC: 3,
  LUNCH: 4,
  IDLE: 5,
  OFFLINE: 6,
} as const

export interface WorkState {
  id?: number
  code: number
  name: string
  category_id: number
  sort_order: number  // posición relativa dentro de su categoría (se reinicia en 0 por cada category_id), no un orden global
}

// Visibilidad de un estado para un grupo puntual. La presencia de una fila significa que ese
// código está OCULTO para ese grupo — la ausencia de fila significa visible (hereda el default
// global). No duplica nombre/categoría/color: eso siempre sale del catálogo único de arriba.
export interface GroupStateVisibility {
  id?: number
  group_id: number
  code: number
}
