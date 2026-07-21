// access_level debería llegar siempre como objeto (ver [[access-level-double-encoding-fix]] en
// memoria), pero si la migración de backfill de tracer-ingestor todavía no corrió contra la DB,
// algunos roles pueden seguir teniendo el string doble-codificado guardado. Tolerar ambos formas
// evita que un desfase de despliegue entre dashboard y backend rompa los permisos de golpe.
export function normalizeAccessLevel(raw: unknown): Record<string, boolean> {
  if (raw && typeof raw === 'object') return raw as Record<string, boolean>
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}
