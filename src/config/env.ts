function readEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/$/, '')
}

function requireEnv(name: keyof ImportMetaEnv): string {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`${name} is not configured.`)
  }
  return value
}

const DEFAULT_API_BASE_URL =
  'https://agreeable-cliff-0981a8210.7.azurestaticapps.net/api'

function readRuntimeApiBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  const runtimeConfig = (window as Window & { __APP_CONFIG__?: Record<string, unknown> }).__APP_CONFIG__
  const fromConfig = runtimeConfig?.VITE_API_BASE_URL
  return typeof fromConfig === 'string' ? fromConfig.trim() : ''
}

function sameOriginApiBase(): string {
  if (typeof window === 'undefined') return '/api'
  return `${window.location.origin}/api`
}

/** Hosts where production must call /api on the same origin (httpOnly cookies). */
function isDeployedSpaHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return (
    host === 'healthlynk.ai' ||
    host === 'www.healthlynk.ai' || host ==='https://agreeable-cliff-0981a8210.7.azurestaticapps.net' ||
    host ==='https://www.agreeable-cliff-0981a8210.7.azurestaticapps.net' ||
    host.endsWith('.azurestaticapps.net')
  )
}

function shouldUseSameOriginApi(): boolean {
  if (readEnv('VITE_FORCE_SAME_ORIGIN_API') === 'true') return true
  if (readEnv('VITE_USE_SAME_ORIGIN_API') === 'true') return true
  return isDeployedSpaHost()
}

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const configured = readEnv('VITE_API_BASE_URL')
    // Dev must use same-origin /api (Vite proxy). Full azurewebsites.net URLs break cookies and login.
    if (configured.startsWith('/')) {
      return `${window.location.origin}${normalizeUrl(configured)}`
    }
    return sameOriginApiBase()
  }

  // Production SPA: same-origin /api so httpOnly cookies work (SWA must link App Service backend).
  if (shouldUseSameOriginApi()) {
    return sameOriginApiBase()
  }

  const configured = readEnv('VITE_API_BASE_URL') || readRuntimeApiBaseUrl()

  if (configured) {
    if (configured.startsWith('/')) {
      return `${window.location.origin}${normalizeUrl(configured)}`
    }
    return normalizeUrl(configured)
  }

  return DEFAULT_API_BASE_URL
}

function resolveHealthifyNpiUrl(): string {
  const explicit = readEnv('VITE_HEALTHIFY_NPI_URL')
  if (explicit) return normalizeUrl(explicit)

  return `${resolveApiBaseUrl()}/integrations/npi`
}

/**
 * Client-safe environment accessors only.
 * Stedi / pVerify credentials belong on the backend (Settings → DB), not in VITE_* vars.
 */
export const env = {
  apiBaseUrl: () => resolveApiBaseUrl(),
  healthifyNpiUrl: () => resolveHealthifyNpiUrl(),
  cloudinaryUploadUrl: () => requireEnv('VITE_CLOUDINARY_UPLOAD_URL'),
  cloudinaryUploadPreset: () => requireEnv('VITE_CLOUDINARY_UPLOAD_PRESET'),
}
