'use server'
import { revalidatePath } from 'next/cache'
import { getRawAppUsageLogs } from '../time/actions'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export type AppCategory = 'productive' | 'unproductive' | 'ignore'

export interface CategorizationApp {
  id?: number
  name: string
  category: AppCategory
}

export const getCategorizationApps = async (): Promise<CategorizationApp[]> => {
  const res = await fetch(`${API_URL}/categorization-apps/`)
  return res.json()
}

export const createCategorizationApp = async (body: Omit<CategorizationApp, 'id'>): Promise<void> => {
  await fetch(`${API_URL}/categorization-apps/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  revalidatePath('/supervisors')
}

export const updateCategorizationApp = async (body: CategorizationApp & { id: number }): Promise<void> => {
  await fetch(`${API_URL}/categorization-apps/update/${body.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: body.name, category: body.category }),
  })
  revalidatePath('/supervisors')
}

export const deleteCategorizationApp = async (id: number): Promise<void> => {
  await fetch(`${API_URL}/categorization-apps/delete/${id}`, { method: 'DELETE' })
  revalidatePath('/supervisors')
}

export const getUncategorizedApps = async (date: string): Promise<string[]> => {
  const [logs, categorized] = await Promise.all([
    getRawAppUsageLogs(date),
    getCategorizationApps(),
  ])
  const categorizedNames = new Set(categorized.map(a => a.name.toLowerCase()))
  const seen = new Set<string>()
  for (const log of logs) {
    for (const a of log.apps ?? []) {
      if (!categorizedNames.has(a.app.toLowerCase())) {
        seen.add(a.app)
      }
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}
