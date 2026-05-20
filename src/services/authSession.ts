/** Legacy keys — removed on startup; JWT must not live in web storage (SOC2). */
const LEGACY_AUTH_STORAGE_KEY = 'healthlynk_auth'
const LEGACY_SESSION_BEARER_KEY = 'healthlynk_bearer'

/** Flask-JWT-Extended defaults (backend sets access_token_cookie httpOnly). */
export const ACCESS_COOKIE_NAME = 'access_token_cookie'
export const CSRF_COOKIE_NAMES = ['csrf_access_token', 'healthlynk_csrf'] as const
export const CSRF_HEADER_NAME = 'X-CSRF-TOKEN'

export function clearLegacyAuthStorage(): void {
  try {
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
    sessionStorage.removeItem(LEGACY_SESSION_BEARER_KEY)
  } catch {
    /* ignore */
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** Attach double-submit CSRF header (reads non-httpOnly csrf_access_token cookie). */
export function applyCsrfHeader(headers: Headers): void {
  if (headers.has(CSRF_HEADER_NAME)) return
  for (const name of CSRF_COOKIE_NAMES) {
    const csrf = readCookie(name)
    if (csrf) {
      headers.set(CSRF_HEADER_NAME, csrf)
      return
    }
  }
}
