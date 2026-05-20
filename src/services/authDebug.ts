import { env } from '../config/env'
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAMES,
  CSRF_HEADER_NAME,
} from './authSession'

/** Dev: always on. Production: localStorage.setItem('DEBUG_API_AUTH','1') then refresh. */
export function isApiAuthDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (import.meta.env.DEV) return true
  try {
    return localStorage.getItem('DEBUG_API_AUTH') === '1'
  } catch {
    return false
  }
}

export type AuthCookieDebugReport = {
  timestamp: string
  endpoint: string
  method: string
  fullUrl: string
  pageOrigin: string
  apiHost: string
  crossOrigin: boolean
  fetchCredentials: 'include'
  requestHeaders: {
    Authorization: string | null
    'X-CSRF-TOKEN': 'sent (redacted)' | 'missing'
  }
  /** Only non-httpOnly cookies — JWT access_token_cookie never appears here. */
  cookiesReadableByJavaScript: Record<string, string>
  access_token_cookie: {
    cookieName: string
    visibleInJavaScript: false
    expectedOnWire: string
    howToSeeActualValue: string
  }
  responseStatus?: number
  responseError?: string
  noteForBackend: string
  backendActionItems: string[]
}

declare global {
  interface Window {
    __healthlynkLastAuthReport?: AuthCookieDebugReport
    __healthlynkCopyAuthReport?: () => void
    __healthlynkLogAuthReport?: () => void
  }
}

function parseDocumentCookies(): Record<string, string> {
  if (typeof document === 'undefined' || !document.cookie) return {}
  const out: Record<string, string> = {}
  for (const part of document.cookie.split(';')) {
    const [rawName, ...rest] = part.trim().split('=')
    if (!rawName) continue
    out[rawName] = decodeURIComponent(rest.join('='))
  }
  return out
}

function readVisibleCookie(name: string): boolean {
  if (typeof document === 'undefined') return false
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|; )${escaped}=`).test(document.cookie)
}

function buildCookieReport(params: {
  path: string
  method: string
  url: string
  headers: Headers
}): AuthCookieDebugReport {
  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const pageHost = typeof window !== 'undefined' ? window.location.host : ''
  let apiHost = ''
  let crossOrigin = false
  try {
    const apiUrl = new URL(params.url)
    apiHost = apiUrl.host
    crossOrigin = apiHost !== pageHost
  } catch {
    /* ignore */
  }

  const csrfSent = params.headers.has(CSRF_HEADER_NAME)
  const visibleCookies = parseDocumentCookies()

  return {
    timestamp: new Date().toISOString(),
    endpoint: params.path,
    method: params.method,
    fullUrl: params.url,
    pageOrigin,
    apiHost,
    crossOrigin,
    fetchCredentials: 'include',
    requestHeaders: {
      Authorization: params.headers.get('Authorization'),
      'X-CSRF-TOKEN': csrfSent ? 'sent (redacted)' : 'missing',
    },
    cookiesReadableByJavaScript: visibleCookies,
    access_token_cookie: {
      cookieName: ACCESS_COOKIE_NAME,
      visibleInJavaScript: false,
      expectedOnWire: `Cookie: ${ACCESS_COOKIE_NAME}=<JWT>; csrf_access_token=<token> (if CSRF enabled)`,
      howToSeeActualValue:
        'Chrome DevTools → Network → click this API row → Headers → Request Headers → Cookie (copy full line and send to backend)',
    },
    noteForBackend: crossOrigin
      ? `SPA (${pageHost}) calls API (${apiHost}) cross-origin. Frontend uses credentials:include. If Network "Cookie" header is empty, set JWT_COOKIE_SAMESITE=None, JWT_COOKIE_SECURE=true, CORS_ORIGINS=${pageOrigin}, supports_credentials=true.`
      : `Same-origin API (${apiHost}). Frontend uses credentials:include. If Cookie header missing, check login Set-Cookie on prior POST /auth/login.`,
    backendActionItems: [
      'Confirm POST /auth/login response includes Set-Cookie: access_token_cookie (HttpOnly; Secure)',
      crossOrigin
        ? 'For cross-origin SPA: JWT_COOKIE_SAMESITE=None and JWT_COOKIE_SECURE=true'
        : 'SameSite=Lax is OK for same-origin',
      `CORS_ORIGINS must include ${pageOrigin || 'SPA origin'} with supports_credentials=true`,
      'JWT_TOKEN_LOCATION should include "cookies" (and optionally "headers")',
    ],
  }
}

function publishReport(report: AuthCookieDebugReport): void {
  if (typeof window === 'undefined') return
  window.__healthlynkLastAuthReport = report

  window.__healthlynkCopyAuthReport = () => {
    const text = JSON.stringify(report, null, 2)
    void navigator.clipboard?.writeText(text)
    console.log('[API Auth] Report copied to clipboard. Paste into email/Teams for backend team.')
    return text
  }

  window.__healthlynkLogAuthReport = () => {
    console.log('[API Auth] Latest report (also on window.__healthlynkLastAuthReport):')
    console.log(report)
    return report
  }
}

/**
 * Console cookie/auth report before each API call — share with backend via
 * window.__healthlynkCopyAuthReport() or copy from console.
 */
export function logApiAuthRequest(params: {
  label?: string
  path: string
  method: string
  url: string
  headers: Headers
}): void {
  if (!isApiAuthDebugEnabled()) return

  const report = buildCookieReport(params)
  publishReport(report)

  const title = params.label ? `${params.label} — ${params.method} ${params.path}` : `${params.method} ${params.path}`

  console.group(`[API Auth / Cookie] ${title}`)
  console.log('%cCopy for backend: run __healthlynkCopyAuthReport() in console', 'font-weight:bold;color:#0d9488')
  console.table({
    'Page origin': report.pageOrigin,
    'API URL': report.fullUrl,
    'Cross-origin?': report.crossOrigin,
    'fetch credentials': report.fetchCredentials,
    'X-CSRF-TOKEN': report.requestHeaders['X-CSRF-TOKEN'],
    [`${ACCESS_COOKIE_NAME} in document.cookie`]: 'NO (httpOnly — normal)',
  })
  console.log('Cookies readable by JavaScript (httpOnly JWT NOT listed):', report.cookiesReadableByJavaScript)
  console.log('Expected on wire (verify in Network → Request Headers → Cookie):', report.access_token_cookie.expectedOnWire)
  console.warn(report.access_token_cookie.howToSeeActualValue)
  console.log('Full report object:', report)
  console.log('Backend note:', report.noteForBackend)
  console.log('Backend action items:', report.backendActionItems)
  console.groupEnd()
}

export function logPostLoginCookieChecklist(): void {
  if (!isApiAuthDebugEnabled()) return
  console.group('[API Auth] After login — check Set-Cookie before other APIs')
  console.log('Network → login → Response Headers → Set-Cookie')
  console.log(
    'Must include: access_token_cookie=...; HttpOnly; Secure; SameSite=None; Partitioned (if cross-origin)'
  )
  console.log('Then open any API → Request Headers → Cookie — paste that line for backend')
  console.log('Quick copy: __healthlynkCopyAuthReport() after a failed API call')
  console.groupEnd()
}

export function logApiAuthResponse(
  path: string,
  response: Response,
  label?: string,
  responseBodyText?: string
): void {
  if (!isApiAuthDebugEnabled()) return

  const title = label ? `${label} (${path})` : path
  let responseError: string | undefined
  if (responseBodyText) {
    try {
      const parsed = JSON.parse(responseBodyText) as { msg?: string; message?: string }
      responseError = parsed.msg || parsed.message
    } catch {
      responseError = responseBodyText.slice(0, 200)
    }
  }

  if (typeof window !== 'undefined' && window.__healthlynkLastAuthReport) {
    window.__healthlynkLastAuthReport = {
      ...window.__healthlynkLastAuthReport,
      responseStatus: response.status,
      responseError,
    }
  }

  console.group(`[API Auth / Cookie] AFTER ${title} → HTTP ${response.status}`)
  if (response.status === 401) {
    console.error('401 — Backend says:', responseError ?? '(see response body in Network)')
    console.error(
      'Compare Network → login → Set-Cookie vs this request → Cookie header. If Cookie empty, backend must fix SameSite/CORS.'
    )
    console.log('Updated report:', window.__healthlynkLastAuthReport)
    console.log('Run __healthlynkCopyAuthReport() to copy JSON for backend developer')
  } else {
    console.log('OK', { status: response.status, type: response.type })
  }
  console.groupEnd()
}

/** Call once on app load in dev/debug mode. */
export function installAuthDebugGlobals(): void {
  if (typeof window === 'undefined' || !isApiAuthDebugEnabled()) return
  console.info(
    '[API Auth] Debug enabled. After any API call: __healthlynkCopyAuthReport() | __healthlynkLogAuthReport() | __healthlynkLastAuthReport'
  )
}
