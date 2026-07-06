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
  '/app/releases': 'manage_releases',
  '/supervisors': 'view_supervisors',
  '/th': 'view_th',
  '/reports': 'manage_report_types',
}

const OPERATIONAL_PERMISSIONS = Object.values(ROUTE_PERMISSIONS)

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) return NextResponse.redirect(new URL('/', req.url))

  const path = req.nextUrl.pathname

  if (!token.role?.access_level) return NextResponse.redirect(new URL('/', req.url))

  const perms = JSON.parse(token.role.access_level)

  const hasOperationalAccess = OPERATIONAL_PERMISSIONS.some(perm => perms[perm])
  if (!hasOperationalAccess) return NextResponse.redirect(new URL('/', req.url))

  const requiredPerm = Object.entries(ROUTE_PERMISSIONS)
    .find(([route]) => path.startsWith(route))?.[1]


  if (requiredPerm && !perms[requiredPerm]) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Dev tunnels add x-forwarded-host that mismatches the browser origin.
  // Rewrite it to match origin so Next.js Server Actions CSRF check passes.
  const origin = req.headers.get('origin')
  const xfh = req.headers.get('x-forwarded-host')
  if (origin && xfh) {
    try {
      const originHost = new URL(origin).host
      if (originHost !== xfh) {
        const headers = new Headers(req.headers)
        headers.set('x-forwarded-host', originHost)
        return NextResponse.next({ request: { headers } })
      }
    } catch {}
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
    '/app/releases',
    '/supervisors/:path*',
    '/th/:path*',
    '/reports/:path*',
  ]
}