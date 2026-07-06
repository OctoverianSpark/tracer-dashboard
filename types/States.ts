export interface StateCategory {
  id?: number
  key: string        // 'active' | 'neutral' | 'inactive' — debe calzar con el `category` que manda el agente en cada log
  name: string
  color?: string      // hex, ej '#10b981'. Si no se define, el Timeline usa un color de respaldo.
  sort_order: number
}

export interface WorkState {
  id?: number
  code: number        // 0-6, el mismo código que el agente envía por POST /tracer/states — no se crea ni se borra desde aquí
  name: string
  category_id: number
  sort_order: number
}
