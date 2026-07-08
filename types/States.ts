export const STATE_CODES = [0, 1, 2, 3, 4, 5, 6] as const

export interface StateCategory {
  id?: number
  group_id?: number | null  // null = catálogo por defecto. Cada grupo con catálogo propio es independiente del de otros grupos.
  key: string        // 'active' | 'neutral' | 'inactive' — debe calzar con el `category` que manda el agente en cada log
  name: string
  color?: string      // hex, ej '#10b981'. Si no se define, el Timeline usa un color de respaldo.
  sort_order: number
}

export interface WorkState {
  id?: number
  group_id?: number | null  // null = catálogo por defecto. Cada grupo con catálogo propio es independiente del de otros grupos.
  code: number        // 0-6, el mismo código que el agente envía por POST /tracer/states — el valor en sí nunca cambia
  name: string
  category_id: number
  sort_order: number  // posición relativa dentro de su categoría (se reinicia en 0 por cada category_id), no un orden global
  show_in_menu?: boolean // false = el agente no lo lista como opción elegible en el menú del tray. Sigue existiendo en el catálogo y puede activarse por otra vía (automática/API). Default true si no se define.
}
