import type { CSSProperties } from 'react'

/** Shared full-bleed dark shell for `/patient-ai` and provider AI intake/result routes. */
export const AI_ELIGIBILITY_FLOW_BG_CLASS = 'bg-slate-950'

export const AI_ELIGIBILITY_FLOW_GRADIENT_CLASS =
  'bg-[radial-gradient(circle_at_12%_18%,rgba(124,58,237,.16),transparent_35%),radial-gradient(circle_at_88%_22%,rgba(14,165,233,.12),transparent_33%),radial-gradient(circle_at_52%_95%,rgba(99,102,241,.1),transparent_35%)]'

type ProviderPortalColors = {
  background: string
  textPrimary: string
}

/** Same flat portal shell as Provider Patient Intake (`providerIntakeChatUi`). */
export function providerPortalShell(colors: ProviderPortalColors): {
  className: string
  style: CSSProperties
} {
  return {
    className: 'relative h-full min-h-0 w-full overflow-y-auto px-4 pt-5 pb-8 sm:px-6',
    style: { backgroundColor: colors.background, color: colors.textPrimary },
  }
}
