import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/app/users': 'manage_users',
  '/app/groups': 'manage_groups',
  '/app/roles': 'manage_roles',
  '/computers': 'manage_computers',
  '/time': 'view_schedules',
  '/screenshots': 'view_screenshots',
  '/settings': 'manage_roles',
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  console.log(token);

  if (!token) return NextResponse.redirect(new URL('/', req.url))

  const path = req.nextUrl.pathname

  // si no tiene rol aun deja pasar (evita loop)
  if (!token.role?.access_level) return NextResponse.next()

  const perms = JSON.parse(token.role.access_level)

  const requiredPerm = Object.entries(ROUTE_PERMISSIONS)
    .find(([route]) => path.startsWith(route))?.[1]

  if (requiredPerm && !perms[requiredPerm]) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/home',
    '/app/:path*',
    '/computers/:path*',
    '/time/:path*',
    '/screenshots/:path*',
    '/settings/:path*',
  ]
}