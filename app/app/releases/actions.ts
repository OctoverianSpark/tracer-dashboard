'use server'

export type ReleaseInfo = {
  ok: boolean
  filename: string
  size: number
  updatedAt: string
} | null

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getReleaseInfo = async (): Promise<ReleaseInfo> => {
  try {
    const res = await fetch(`${API_URL}/tracer/updates`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
