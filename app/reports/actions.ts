'use server'
import { ReportType, ReportTypeAssignment } from '@/types/Reports'
import { revalidatePath } from 'next/cache'

const API = process.env.NEXT_PUBLIC_API_URL

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

// Los endpoints /report-types* y /report-type-assignments* aún no existen en el backend.
// Quedan como scaffold (mismo patrón que rotation-cycles en app/time/actions.ts) hasta que
// se implementen del lado del API. La app de escritorio debe consultar /report-types en
// cada apertura del formulario de reporte, en vez de cachear la lista localmente, para que
// los tipos creados aquí aparezcan sin necesidad de actualizar el agente.

export const getReportTypes = async (): Promise<ReportType[]> =>
  fetcher(`${API}/report-types`)

export const saveReportType = async (body: ReportType) => {
  await fetch(`${API}/report-types/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  revalidatePath('/reports/control')
}

export const deleteReportType = async (id: number) => {
  await fetch(`${API}/report-types/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/reports/control')
}

export const getReportTypeAssignments = async (): Promise<ReportTypeAssignment[]> =>
  fetcher(`${API}/report-type-assignments`)

export const assignReportTypeToGroup = async (report_type_id: number, group_id: number) => {
  await fetch(`${API}/report-type-assignments/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report_type_id, group_id }),
  })
  revalidatePath('/reports/control')
}

export const unassignReportTypeFromGroup = async (id: number) => {
  await fetch(`${API}/report-type-assignments/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/reports/control')
}
