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

export interface WorkState {
  id?: number
  code: number        // 0-6, el mismo código que el agente envía por POST /tracer/states — el valor en sí nunca cambia
  name: string
  category_id: number
  sort_order: number  // posición relativa dentro de su categoría (se reinicia en 0 por cada category_id), no un orden global
  show_in_menu?: boolean // false = oculto del menú del agente para TODOS los grupos. Default true si no se define.
}

// Visibilidad de un estado para un grupo puntual. La presencia de una fila significa que ese
// código está OCULTO para ese grupo — la ausencia de fila significa visible (hereda el default
// global). No duplica nombre/categoría/color: eso siempre sale del catálogo único de arriba.
export interface GroupStateVisibility {
  id?: number
  group_id: number
  code: number
}
