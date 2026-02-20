import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  const response = await fetch(`http://localhost:3000/machines/screenshot/${filename}`)
  const buffer = await response.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'image/jpeg',
    },
  })
}