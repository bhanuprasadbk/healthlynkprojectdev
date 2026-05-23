/**
 * App route paths — use these constants instead of hardcoding URLs.
 * Patient intake + eligibility share `/patient` (`PATIENT_NAV` in location state).
 */
export const ROUTES = {
  LOGIN: '/login',
  /** Patient intake + eligibility — use `PATIENT_NAV` in location state */
  PATIENT_HOME: '/patient',
  /** Experimental AI chat intake + modern result (separate from current flow) */
  PATIENT_AI_INTAKE: '/patient-ai',
  PATIENT_AI_RESULT: '/patient-ai/result',
  /** Provider app versions of intake/result pages (inside private layout/theme) */
  PROVIDER_PATIENT_INTAKE: '/provider/patient-intake',
  PROVIDER_ELIGIBILITY_RESULT: '/provider/eligibility-result',
  DASHBOARD: '/dashboard',
  PAYORS: '/payors',
  /** Provider configuration — NPI & practice state defaults */
  PROVIDER_NPI_LOCATION: '/provider-configuration/npi-location',
  CPT_HCPC: '/cpt-hcpc',
  PRIOR_AUTH: '/prior-auth',
  /** Legacy underscore URL — redirects to PRIOR_AUTH */
  PRIOR_AUTH_LEGACY: '/prior_auth',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
  DASHBOARD_SETTINGS: '/dashboard-settings',
  CHAT: '/chat',
  AGENTS: '/agents',
} as const

/** Pass as `navigate(ROUTES.PATIENT_HOME, { state: PATIENT_NAV.intake })` etc. */
export const PATIENT_NAV = {
  intake: { patientFlow: 'intake' as const },
  eligibility: { patientFlow: 'eligibility' as const },
} as const
