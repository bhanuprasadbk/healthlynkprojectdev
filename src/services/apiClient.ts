import { env } from '../config/env'
import { applyCsrfHeader, clearLegacyAuthStorage } from './authSession'
import { isApiAuthDebugEnabled, logApiAuthRequest, logApiAuthResponse } from './authDebug'

const API_BASE_URL = env.apiBaseUrl()
export const AUTH_EXPIRED_EVENT = 'healthlynk:auth-expired'

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

function readErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  const candidates = [record.message, record.msg, record.error, record.detail]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }
  return null
}

/** Azure App Service Authentication returns empty 401/400 + WWW-Authenticate before Flask runs. */
function readPlatformAuthBlockMessage(response: Response, responseText: string): string | null {
  if (responseText.trim()) return null
  const wwwAuth = response.headers.get('WWW-Authenticate') ?? ''
  if (!wwwAuth.includes('azurewebsites.net')) return null
  if (response.status !== 401 && response.status !== 400) return null
  return (
    'API blocked by Azure App Service Authentication (not invalid password). ' +
    'Azure Portal → healthlynkapi → Authentication → disable platform auth or allow anonymous access, then restart the app.'
  )
}

function resolveFailureMessage(response: Response, responseText: string, body: unknown): string {
  return (
    readErrorMessage(body) ??
    readPlatformAuthBlockMessage(response, responseText) ??
    `Request failed (${response.status})`
  )
}

function notifyAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
  debugLabel?: string
): Promise<Response> {
  const headers = new Headers(init.headers)
  applyCsrfHeader(headers)
  const method = (init.method || 'GET').toUpperCase()
  const url = buildUrl(path)

  logApiAuthRequest({
    label: debugLabel,
    path,
    method,
    url,
    headers,
  })

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (isApiAuthDebugEnabled()) {
    const responsePreview = await response.clone().text().catch(() => '')
    logApiAuthResponse(path, response, debugLabel, responsePreview)
  }
  return response
}

export type ApiJsonRequestOptions = {
  /** Use for GET /auth/me when guest 401 is expected — avoids auth-expired side effects. */
  suppressAuthExpiredOn401?: boolean
  /** Console label for auth debug logs (e.g. "notifications"). */
  debugLabel?: string
}

export async function apiJsonRequest<T>(
  path: string,
  init: RequestInit = {},
  options?: ApiJsonRequestOptions
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body != null) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await apiRequest(
    path,
    {
      ...init,
      headers,
    },
    options?.debugLabel
  )

  const text = await response.text()
  let body: T | null = null
  if (text) {
    try {
      body = JSON.parse(text) as T
    } catch {
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
      }
      throw new Error('Response returned invalid JSON.')
    }
  }

  if (!response.ok) {
    const message = resolveFailureMessage(response, text, body)
    if (response.status === 401) {
      if (!options?.suppressAuthExpiredOn401) {
        clearLegacyAuthStorage()
        notifyAuthExpired()
      }
    }
    throw new Error(message)
  }
  return (body ?? ({} as T)) as T
}

export { API_BASE_URL }
