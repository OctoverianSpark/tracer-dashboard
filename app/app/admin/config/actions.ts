'use server'
import { revalidatePath } from 'next/cache'
import { ProductivitySettings } from '@/types/ProductivitySettings'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const DEFAULT_SETTINGS: ProductivitySettings = { uncategorized_credit: 0.7, productive_credit: 1.5 }

export const getProductivitySettings = async (): Promise<ProductivitySettings> => {
  try {
    const res = await fetch(`${API_URL}/productivity-settings`, { cache: 'no-store' })
    if (!res.ok) return DEFAULT_SETTINGS
    return res.json()
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const saveProductivitySettings = async (data: ProductivitySettings): Promise<ProductivitySettings> => {
  const res = await fetch(`${API_URL}/productivity-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Error al guardar la configuración: ${res.status}`)
  revalidatePath('/app/admin/config')
  return res.json()
}
