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

function readRuntimeApiBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  const runtimeConfig = (window as Window & { __APP_CONFIG__?: Record<string, unknown> }).__APP_CONFIG__
  const fromConfig = runtimeConfig?.VITE_API_BASE_URL
  return typeof fromConfig === 'string' ? fromConfig.trim() : ''
}

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    // In local dev, force same-origin API calls so Vite proxy can bypass CORS.
    return `${window.location.origin}/api`
  }
  const configured = readEnv('VITE_API_BASE_URL') || readRuntimeApiBaseUrl()
  if (configured) return normalizeUrl(configured)

  // Deployment safety-net: keep app functional if env injection is missed.
  // Prefer setting VITE_API_BASE_URL in CI/CD.
  return 'https://healthlynkapi-e9dzgrfgaebvhre4.centralus-01.azurewebsites.net/api'
}

function resolveHealthifyNpiUrl(): string {
  const explicit = readEnv('VITE_HEALTHIFY_NPI_URL')
  if (explicit) return normalizeUrl(explicit)

  // Keep NPI endpoint aligned with API host when only VITE_API_BASE_URL is set.
  return `${resolveApiBaseUrl()}/integrations/npi`
}

export const env = {
  apiBaseUrl: () => resolveApiBaseUrl(),
  pverifyApiBase: () => normalizeUrl(requireEnv('VITE_PVERIFY_API_BASE')),
  pverifyClientId: () => requireEnv('VITE_PVERIFY_CLIENT_ID'),
  pverifyClientSecret: () => requireEnv('VITE_PVERIFY_CLIENT_SECRET'),
  pverifyClientApiId: () =>
    readEnv('VITE_PVERIFY_CLIENT_API_ID') || requireEnv('VITE_PVERIFY_CLIENT_ID'),
  pverifyClientUserName: () => readEnv('VITE_PVERIFY_CLIENT_USER_NAME'),
  pverifyEligibilityPath: () => requireEnv('VITE_PVERIFY_ELIGIBILITY_PATH'),
  pverifyEligibilityPdfPrefix: () => requireEnv('VITE_PVERIFY_ELIGIBILITY_PDF_PREFIX'),
  stediApiUrl: () => normalizeUrl(readEnv('VITE_STEDI_API_URL') || 'https://api.stedi.com'),
  stediApiKey: () => readEnv('VITE_STEDI_API_KEY') || readEnv('VITE_STEDI_CLIENT_KEY'),
  healthifyNpiUrl: () => resolveHealthifyNpiUrl(),
  cloudinaryUploadUrl: () => requireEnv('VITE_CLOUDINARY_UPLOAD_URL'),
  cloudinaryUploadPreset: () => requireEnv('VITE_CLOUDINARY_UPLOAD_PRESET'),
}
