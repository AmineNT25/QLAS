import Cookies from 'js-cookie'

/**
 * The active client (tenant) the dashboard is currently scoped to.
 *
 * Stored in a cookie so it survives reloads and can also be read
 * server-side; the value is mirrored into the `X-Client-Id` header on
 * every API request by the axios client in `lib/api.ts`, which is what
 * the backend `requireClientScope` middleware actually enforces.
 */
export const ACTIVE_CLIENT_COOKIE = 'qlas_active_client'

export function getActiveClientId(): string | null {
  if (typeof window === 'undefined') return null
  return Cookies.get(ACTIVE_CLIENT_COOKIE) ?? null
}

export function setActiveClientId(clientId: string) {
  Cookies.set(ACTIVE_CLIENT_COOKIE, clientId, {
    expires: 30,
    sameSite: 'Lax',
    path: '/',
  })
}

export function clearActiveClientId() {
  Cookies.remove(ACTIVE_CLIENT_COOKIE, { path: '/' })
}
