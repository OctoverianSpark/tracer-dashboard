import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ machine: string, filename: string }> }
) {
  const { filename, machine } = await params

  const response = await fetch(`https://actimetrics.asistentevirtualsas.com/machines/screenshot/${machine}/${filename}`)
  console.log(response, machine, filename);

  const buffer = await response.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'image/jpeg',
    },
  })
}