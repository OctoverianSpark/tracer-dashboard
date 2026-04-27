import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ machine: string; filename: string }> }
) {
  const { filename, machine } = await params

  const response = await fetch(
    `https://actimetrics.asistentevirtualsas.com/machines/screenshot/${machine}/${filename}`,
    { next: { revalidate: 86400 } }
  )

  if (!response.ok) return new NextResponse(null, { status: response.status })

  const buffer = await response.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
