import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Login gate. LAS is an internal agency tool with no public sign-up — the only
 * way in is the single operator account. Any request to /dashboard without an
 * access-token cookie is bounced to /login; an already-signed-in visitor
 * hitting /login is sent straight to the dashboard.
 *
 * This is a UX redirect only — the API is the real authority and enforces auth
 * on every route via requireAuth.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get('access_token')?.value)
  const { pathname } = request.nextUrl

  if (pathname === '/' || pathname.startsWith('/dashboard')) {
    if (!hasSession) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  if (pathname === '/login' && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard', '/dashboard/:path*', '/login'],
}
