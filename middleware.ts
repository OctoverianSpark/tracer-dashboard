import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { normalizeAccessLevel } from '@/lib/accessLevel'

const ROUTE_PERMISSIONS: Record<string, string> = {
  '/app/users': 'manage_users',
  '/app/groups': 'manage_groups',
  '/app/roles': 'manage_roles',
  '/app/admin': 'manage_sessions',
  '/computers': 'manage_computers',
  '/time': 'view_schedules',
  '/screenshots': 'view_screenshots',
  '/settings': 'manage_roles',
  '/app/releases': 'manage_releases',
  '/supervisors': 'view_supervisors',
  '/th': 'view_th',
  '/states': 'manage_states',
  '/productivity': 'view_productivity_dashboard',
}

const OPERATIONAL_PERMISSIONS = Object.values(ROUTE_PERMISSIONS)

const SESSION_COOKIE_NAMES = ['next-auth.session-token', '__Secure-next-auth.session-token']

function signOutRedirect(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', req.url))
  for (const name of SESSION_COOKIE_NAMES) res.cookies.delete(name)
  return res
}

// Sesiones JWT sin estado (sin adapter/tabla de sesiones) no se pueden invalidar del lado del
// servidor por sí solas — se compara el force_logout_at actual del backend contra el valor que
// quedó "congelado" en el JWT al momento del login. Falla abierto: si el backend no responde a
// tiempo, no se bloquea la navegación por eso.
async function isSessionRevoked(appUserId: number | string, tokenForceLogoutAt: string | null | undefined): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.API_URL}/appuser/${appUserId}/force-logout-status`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return false
    const { force_logout_at } = await res.json() as { force_logout_at: string | null }
    if (!force_logout_at) return false
    return force_logout_at !== (tokenForceLogoutAt ?? null)
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) return NextResponse.redirect(new URL('/', req.url))

  const path = req.nextUrl.pathname

  if (token.appUser?.id && await isSessionRevoked(token.appUser.id, token.forceLogoutAt)) {
    return signOutRedirect(req)
  }

  if (!token.role?.access_level) return NextResponse.redirect(new URL('/', req.url))

  const perms = normalizeAccessLevel(token.role.access_level)

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
    '/states/:path*',
    '/productivity/:path*',
  ]
}