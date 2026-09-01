// Los timestamps que devuelve la API (state_logs, app_usage_logs) son UTC real y correcto —
// verificado contra el header `Date` de la propia API y los `last_seen` de las máquinas: una hora
// "de Bogotá tratada como si fuera UTC sin convertir" habría puesto actividad reciente varias
// horas en el futuro, lo cual es imposible.
//
// El offset ya NO es fijo — cada equipo tiene su propia zona horaria (computers.timezone_offset_minutes,
// derivada server-side de su IP pública, ver geoTimezone.service.ts en tracer-ingestor), porque no
// todos los equipos están en Colombia. Bogotá (-300 min, sin horario de verano) sigue siendo el
// valor por defecto cuando un equipo aún no tiene timezone resuelta (recién agregado) o cuando el
// llamador no tiene un equipo específico en contexto (agrupaciones globales).
//
// Convención de signo: offsetMinutes es el offset UTC estándar (negativo = oeste de UTC, ej.
// Bogotá = -300, Brisbane = +600) — local = UTC + offsetMinutes. Mismo signo que devuelve
// geoTimezone.service.ts (a su vez, el mismo que ip-api.com).
export const BOGOTA_OFFSET_MINUTES = -300

// Hora LOCAL del equipo ("YYYY-MM-DD", "HH:mm" o "HH:mm:ss") al instante UTC real que representa.
export function bogotaToMs(date: string, time: string, offsetMinutes: number = BOGOTA_OFFSET_MINUTES): number {
  const hhmmss = time.length === 5 ? `${time}:00` : time
  const sign = offsetMinutes <= 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return new Date(`${date}T${hhmmss}${sign}${hh}:${mm}`).getTime()
}

// Fecha calendario LOCAL del equipo ("YYYY-MM-DD") a partir de un timestamp UTC real (ISO, con o
// sin 'Z'). Aritmética simple (offset fijo por llamada, sin DST) en vez de Intl/toLocaleDateString
// — esto se llama por cada log al agrupar por fecha en loadRangeContext (potencialmente miles en
// la vista Global), y Intl es notablemente más lento por llamada.
export function bogotaDateOf(utcTimestamp: string, offsetMinutes: number = BOGOTA_OFFSET_MINUTES): string {
  const d = new Date(new Date(utcTimestamp).getTime() + offsetMinutes * 60_000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
