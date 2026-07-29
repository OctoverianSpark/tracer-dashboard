// Los timestamps que devuelve la API (state_logs, app_usage_logs) son UTC real y correcto —
// verificado contra el header `Date` de la propia API y los `last_seen` de las máquinas: una hora
// "de Bogotá tratada como si fuera UTC sin convertir" habría puesto actividad reciente varias
// horas en el futuro, lo cual es imposible. Colombia no observa horario de verano, así que el
// offset es fijo (-05:00) todo el año, sin excepciones ni tablas de DST que mantener.
const BOGOTA_UTC_OFFSET = '-05:00'

// Hora LOCAL de Bogotá ("YYYY-MM-DD", "HH:mm" o "HH:mm:ss") al instante UTC real que representa.
export function bogotaToMs(date: string, time: string): number {
  const hhmmss = time.length === 5 ? `${time}:00` : time
  return new Date(`${date}T${hhmmss}${BOGOTA_UTC_OFFSET}`).getTime()
}

// Fecha calendario de Bogotá ("YYYY-MM-DD") a partir de un timestamp UTC real (ISO, con o sin 'Z').
export function bogotaDateOf(utcTimestamp: string): string {
  return new Date(utcTimestamp).toLocaleDateString('sv', { timeZone: 'America/Bogota' })
}
