import { NextRequest, NextResponse } from 'next/server'

// API_URL (solo servidor) permite apuntar a la red interna; si no está, cae al mismo backend que
// usa el resto del dashboard.
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL

const SAFE_SEGMENT = /^[a-zA-Z0-9_\-][a-zA-Z0-9_\-.]*$/

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ machine: string; filename: string }> }
) {
  const { filename, machine } = await params
  if (!SAFE_SEGMENT.test(machine) || !SAFE_SEGMENT.test(filename)) {
    return new NextResponse(null, { status: 400 })
  }

  const thumb = req.nextUrl.searchParams.get('thumb') === '1'
  const response = await fetch(
    `${API_URL}/machines/screenshot/${encodeURIComponent(machine)}/${encodeURIComponent(filename)}${thumb ? '?thumb=1' : ''}`,
    { cache: 'no-store' }
  )

  if (!response.ok || !response.body) return new NextResponse(null, { status: response.status })

  // Se reenvía el stream tal cual en vez de bufferizar la imagen completa en memoria.
  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=86400, immutable',
    },
  })
}
