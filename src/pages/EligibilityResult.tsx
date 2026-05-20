import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, PATIENT_NAV } from '../routes/routeMap'
import {
  Download,
  Mail,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  BadgeCheck,
  ArrowLeft,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Toast from '../components/Toast'
import Button from '../components/forms/Button'
import StediEligibilityResultPanel from '../components/StediEligibilityResultPanel'
import { PatientFlowCogniThemeScope, useTheme } from '../contexts/ThemeContext'
import { useEligibilityServiceConfig } from '../contexts/EligibilityServiceContext'
import type { EligibilityResultRouteState } from '../services/mapPverifyToEligibilityView'
import { fetchEligibilityPdfReport } from '../services/pverifyAuth'
import { fetchStediEligibilityPdfReport } from '../services/stediService'
import { buildEligibilityDashboardView } from '../services/eligibilityDashboardView'

type ThemeColors = {
  background: string
  cardBackground: string
  cardBorder: string
  border: string
  textPrimary: string
  textSecondary: string
  primary: string
  navHeaderBackground: string
}

const cardShadow = (isDark: boolean) =>
  isDark
    ? '0 24px 48px -16px rgba(0, 0, 0, 0.45)'
    : '0 20px 50px -12px rgba(15, 23, 42, 0.08)'

function fmtUsd(n: number) {
  return `$${n.toFixed(2)}`
}

function clampPercent(remaining: number, total: number): number {
  if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, Math.min(100, (remaining / total) * 100))
}

/** Matches Patient Intake: full-width strip with themed header background. */
function FlowPageHeader({
  colors,
  logo,
  title,
  description,
  Icon,
  actions,
}: {
  colors: {
    border: string
    cardBackground: string
    textPrimary: string
    textSecondary: string
    primary: string
    navHeaderBackground: string
  }
  logo?: string
  title: string
  description: string
  Icon: LucideIcon
  actions?: ReactNode
}) {
  return (
    <header
      className="relative z-[1] w-full border-b"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.navHeaderBackground,
      }}
    >
      <div className="w-full px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {logo ? (
              <img
                src={logo}
                alt="Health Lynk"
                className="h-6 w-auto max-w-[min(100%,200px)] shrink-0 object-contain object-left sm:h-7"
              />
            ) : (
              <p
                className="shrink-0 text-base font-bold leading-none tracking-tight sm:text-lg"
                style={{ color: colors.primary }}
              >
                Health Lynk
              </p>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9"
                style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 18%, transparent)`,
                  color: colors.primary,
                  boxShadow: `0 0 0 1px color-mix(in srgb, ${colors.primary} 35%, transparent)`,
                }}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h1
                  className="text-lg font-semibold leading-tight tracking-tight sm:text-xl"
                  style={{ color: colors.textPrimary }}
                >
                  {title}
                </h1>
                <p
                  className="mt-0.5 max-w-2xl text-xs leading-snug sm:text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {description}
                </p>
              </div>
            </div>
          </div>
          {actions ? (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto lg:max-w-[min(100%,28rem)] xl:max-w-none">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function EligibilityResultContent({ providerMode = false }: { providerMode?: boolean }) {
  const { theme } = useTheme()
  const isDarkMode = true
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedService } = useEligibilityServiceConfig()
  const state = location.state as EligibilityResultRouteState | null
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>(
    'error'
  )

  const tc: ThemeColors = {
    background: theme.colors.background,
    cardBackground: theme.colors.cardBackground,
    cardBorder: theme.colors.cardBorder,
    border: theme.colors.border,
    textPrimary: theme.colors.textPrimary,
    textSecondary: theme.colors.textSecondary,
    primary: theme.colors.primary,
    navHeaderBackground: theme.colors.navHeaderBackground,
  }

  const surfaceCard = {
    backgroundColor: tc.cardBackground,
    border: `1px solid ${tc.cardBorder}`,
    boxShadow: isDarkMode
      ? `0 0 0 1px color-mix(in srgb, ${tc.primary} 14%, transparent), 0 24px 48px -16px rgba(0, 0, 0, 0.5), 0 0 72px -28px color-mix(in srgb, ${tc.primary} 22%, transparent)`
      : cardShadow(isDarkMode),
  } as const

  const layoutBackdropStyle = {
    backgroundColor: tc.background,
    backgroundImage: isDarkMode
      ? `
        radial-gradient(ellipse 120% 80% at 50% -8%, color-mix(in srgb, ${tc.primary} 42%, transparent) 0%, transparent 50%),
        radial-gradient(ellipse 70% 55% at 0% 32%, color-mix(in srgb, ${tc.primary} 26%, transparent) 0%, transparent 58%),
        radial-gradient(ellipse 65% 52% at 100% 52%, color-mix(in srgb, ${tc.primary} 22%, transparent) 0%, transparent 58%),
        radial-gradient(ellipse 90% 60% at 50% 102%, color-mix(in srgb, ${tc.primary} 16%, transparent) 0%, transparent 55%),
        linear-gradient(180deg,
          color-mix(in srgb, ${tc.primary} 12%, ${tc.background}) 0%,
          ${tc.background} 40%,
          color-mix(in srgb, ${tc.primary} 10%, ${tc.background}) 100%)`
      : `
        radial-gradient(ellipse 115% 72% at 50% -4%, color-mix(in srgb, ${tc.primary} 20%, transparent) 0%, transparent 54%),
        radial-gradient(ellipse 68% 52% at 0% 38%, color-mix(in srgb, ${tc.primary} 12%, transparent) 0%, transparent 58%),
        radial-gradient(ellipse 62% 50% at 100% 58%, color-mix(in srgb, ${tc.primary} 10%, transparent) 0%, transparent 56%),
        radial-gradient(ellipse 85% 58% at 50% 102%, color-mix(in srgb, ${tc.primary} 8%, transparent) 0%, transparent 54%),
        linear-gradient(180deg,
          color-mix(in srgb, ${tc.primary} 6%, ${tc.cardBackground}) 0%,
          ${tc.background} 45%,
          color-mix(in srgb, ${tc.primary} 5%, ${tc.background}) 100%)`,
  } as const

  const pushToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'error'
  ) => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
  }

  const raw = state?.rawResponse ?? null
  const sourceService = (state?.apiMeta?.source ?? selectedService) as
    | 'stedi'
    | 'pverify'
    | 'azure-health-card'
  const ic = state?.intakeContext
  const clickAndVerifyFields = state?.apiMeta?.clickAndVerifyFields
  void clickAndVerifyFields

  const dashboard = useMemo(() => {
    if (!raw) return null
    return buildEligibilityDashboardView(raw, {
      patientName: ic?.patientName ?? '',
      cptHcpcCode: ic?.cptHcpcCode ?? '',
      serviceDateFrom: ic?.serviceDateFrom ?? '',
      serviceDateTo: ic?.serviceDateTo ?? '',
    })
  }, [
    raw,
    ic?.patientName,
    ic?.cptHcpcCode,
    ic?.serviceDateFrom,
    ic?.serviceDateTo,
  ])

  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    try {
      if (!raw) {
        throw new Error('No eligibility response found for PDF download.')
      }
      let blob: Blob
      let fileName: string
      if (sourceService === 'stedi') {
        const stediRaw: Record<string, unknown> =
          raw.StediRawResponse &&
          typeof raw.StediRawResponse === 'object' &&
          !Array.isArray(raw.StediRawResponse)
            ? (raw.StediRawResponse as Record<string, unknown>)
            : raw
        const eligibilityCheckId = [stediRaw.id, stediRaw.eligibilityCheckId, stediRaw.eligibilitySearchId]
          .map((value) => (value != null ? String(value).trim() : ''))
          .find((value) => value !== '')
        blob = await fetchStediEligibilityPdfReport({
          eligibilityCheckId,
        })
        fileName = `stedi-eligibility-${eligibilityCheckId ?? Date.now()}.pdf`
      } else {
        const rid =
          state?.apiMeta?.requestId ??
          (typeof state?.rawResponse?.RequestID === 'number'
            ? state.rawResponse.RequestID
            : undefined)
        if (rid == null) {
          throw new Error('No pVerify Request ID found for PDF download.')
        }
        pushToast(`Downloading pVerify PDF for Request ID: ${rid}`, 'info')
        blob = await fetchEligibilityPdfReport(rid)
        fileName = `eligibility-${rid}.pdf`
      }
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
      pushToast('PDF downloaded successfully.', 'success')
    } catch (e) {
      const rid =
        state?.apiMeta?.requestId ??
        (typeof state?.rawResponse?.RequestID === 'number'
          ? state.rawResponse.RequestID
          : undefined)
      pushToast(
        e instanceof Error
          ? rid != null
            ? `${e.message} (Request ID: ${rid})`
            : e.message
          : 'PDF download failed.',
        'error'
      )
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSendToEmail = () => {
    pushToast('Send to email will be available in a future update.', 'info')
  }

  const handleBackToIntake = () => {
    if (providerMode) {
      navigate(ROUTES.PROVIDER_PATIENT_INTAKE)
      return
    }
    navigate(ROUTES.PATIENT_HOME, { state: PATIENT_NAV.intake })
  }

  const toastEl = (
    <Toast
      message={toastMessage}
      type={toastType}
      isVisible={showToast}
      onClose={() => setShowToast(false)}
      duration={toastType === 'error' ? 6000 : toastType === 'info' ? 4000 : 3000}
    />
  )

  if (!raw || !dashboard) {
    return (
      <>
        <div className="relative min-h-screen">
          {!providerMode && (
            <>
              <div
                className="pointer-events-none absolute inset-0 min-h-full"
                style={layoutBackdropStyle}
                aria-hidden
              />
              <FlowPageHeader
                colors={tc}
                logo={theme.logo}
                title="Eligibility result"
                description={`Review coverage and benefits returned by ${sourceService === 'stedi' ? 'Stedi' : 'pVerify'}.`}
                Icon={BadgeCheck}
                actions={
                  <Button
                    variant="outline"
                    size="lg"
                    type="button"
                    onClick={handleBackToIntake}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-5 sm:w-auto"
                  >
                    <ArrowLeft className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span>Back to Service</span>
                  </Button>
                }
              />
            </>
          )}
          <div className="relative z-10 flex min-h-[45vh] w-full items-center justify-center px-4 py-12 sm:px-6">
            <div
              className="w-full max-w-md rounded-2xl p-8 text-center"
              style={surfaceCard}
            >
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: tc.textPrimary }}
              >
                No eligibility response yet
              </h2>
              <p className="mb-8 mt-3 text-sm leading-relaxed" style={{ color: tc.textSecondary }}>
                Run a check from Patient Intake. Results will appear here after the selected service returns.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  providerMode
                    ? navigate(ROUTES.PROVIDER_PATIENT_INTAKE, { replace: true })
                    : navigate(ROUTES.PATIENT_HOME, { replace: true, state: PATIENT_NAV.intake })
                }
              >
                Go to Patient Intake
              </Button>
            </div>
          </div>
        </div>
        {toastEl}
      </>
    )
  }

  const apiOk = String(raw.APIResponseCode ?? '') === '0'
  const processedErr = raw.ProcessedWithError === true

  const d = dashboard

  const headerActions = (
    <>
      <Button
        variant="outline"
        size="lg"
        type="button"
        onClick={handleSendToEmail}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 sm:w-auto"
      >
        <Mail className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span>Send to Email</span>
      </Button>
      <Button
        variant="primary"
        size="lg"
        type="button"
        onClick={() => void handleDownloadPDF()}
        disabled={pdfLoading}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 sm:w-auto"
      >
        {pdfLoading ? (
          <>
            <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin" aria-hidden />
            <span>Downloading…</span>
          </>
        ) : (
          <>
            <Download className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span>Download PDF</span>
          </>
        )}
      </Button>
      <Button
        variant="outline"
        size="lg"
        type="button"
        onClick={handleBackToIntake}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 sm:w-auto"
      >
        <ArrowLeft className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span>Back to Service</span>
      </Button>
    </>
  )
  const providerActions = (
    <>
      <Button
        variant="outline"
        size="lg"
        type="button"
        onClick={handleSendToEmail}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 sm:w-auto"
      >
        <Mail className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span>Send to Email</span>
      </Button>
      <Button
        variant="primary"
        size="lg"
        type="button"
        onClick={() => void handleDownloadPDF()}
        disabled={pdfLoading}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 sm:w-auto"
      >
        {pdfLoading ? (
          <>
            <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin" aria-hidden />
            <span>Downloading…</span>
          </>
        ) : (
          <>
            <Download className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span>Download PDF</span>
          </>
        )}
      </Button>
    </>
  )

  return (
    <div className="relative min-h-screen">
      {!providerMode && (
        <>
          <div
            className="pointer-events-none absolute inset-0 min-h-full"
            style={layoutBackdropStyle}
            aria-hidden
          />
          <FlowPageHeader
            colors={tc}
            logo={theme.logo}
            title="Eligibility result"
            description={`Verification summary for ${d.patientName || 'patient'}. Review coverage, costs, and authorization below.`}
            Icon={BadgeCheck}
            actions={headerActions}
          />
        </>
      )}

      <div className="relative z-10 w-full space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        {providerMode && (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1
                  className="text-xl sm:text-2xl font-bold text-left"
                  style={{ color: tc.textPrimary }}
                >
                  Eligibility Result
                </h1>
                <p
                  className="mt-1 text-left"
                  style={{ color: tc.textSecondary }}
                >
                  Review coverage, costs, and authorization details from the eligibility response.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:self-start">
                {providerActions}
              </div>
            </div>
          </div>
        )}

        {sourceService === 'stedi' && (processedErr || !apiOk) && (
          <div
            className="flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm sm:px-5 sm:text-[15px]"
            style={{
              backgroundColor: 'color-mix(in srgb, #f87171 12%, transparent)',
              borderColor: 'color-mix(in srgb, #f87171 35%, transparent)',
              color: tc.textPrimary,
            }}
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-base font-semibold">Response needs review</p>
              <p className="mt-1.5 leading-relaxed opacity-95">
                This result may be incomplete or returned an error from the payer.
                {raw.ErrorDescription != null &&
                  String(raw.ErrorDescription).trim() !== '' && (
                    <span className="mt-2 block font-medium">
                      {String(raw.ErrorDescription)}
                    </span>
                  )}
              </p>
            </div>
          </div>
        )}

        {sourceService === 'stedi' && (
          <section
            className="relative overflow-hidden rounded-2xl border-2 p-6 sm:p-8 lg:p-10"
            style={{
              ...surfaceCard,
              borderColor: tc.primary,
              background: `linear-gradient(135deg, color-mix(in srgb, ${tc.primary} 12%, ${tc.cardBackground}) 0%, ${tc.cardBackground} 60%)`,
            }}
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: tc.textSecondary }}
                >
                  Patient
                </p>
                <p
                  className="break-words text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
                  style={{ color: tc.textPrimary }}
                >
                  {d.patientName || '—'}
                </p>
                <p className="text-base sm:text-lg" style={{ color: tc.textSecondary }}>
                  <span className="font-semibold" style={{ color: tc.textPrimary }}>
                    {d.payor || '—'}
                  </span>
                  {d.planName ? <span> · {d.planName}</span> : null}
                </p>
                <div className="flex flex-wrap gap-2 pt-2 sm:gap-3">
                  <span
                    className="rounded-xl px-3 py-2 text-sm font-semibold sm:text-base"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${tc.primary} 14%, transparent)`,
                      color: tc.textPrimary,
                    }}
                  >
                    Code {d.serviceCode || '—'}
                  </span>
                  <span
                    className="rounded-xl px-3 py-2 text-sm font-semibold sm:text-base"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${tc.primary} 14%, transparent)`,
                      color: tc.textPrimary,
                    }}
                  >
                    Service {d.serviceDate || '—'}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                {d.statusEligible ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2.5 text-base font-bold text-emerald-900 sm:text-lg">
                    <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2.5 text-base font-bold text-amber-950 sm:text-lg">
                    <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
                    Inactive
                  </span>
                )}
                <p
                  className="max-w-xs text-right text-sm font-medium leading-snug sm:text-base"
                  style={{ color: tc.textSecondary }}
                >
                  Coverage {d.coverageActive ? 'active' : 'inactive'} ·{' '}
                  {d.networkInNetwork ? 'In-network' : 'Out-of-network'}
                </p>
              </div>
            </div>
          </section>
        )}

        {sourceService === 'stedi' ? (
          <StediEligibilityResultPanel
            raw={
              raw.StediRawResponse &&
              typeof raw.StediRawResponse === 'object' &&
              !Array.isArray(raw.StediRawResponse)
                ? (raw.StediRawResponse as Record<string, unknown>)
                : raw
            }
            colors={tc}
            surfaceCard={surfaceCard}
          />
        ) : (
          <>
            <section className="rounded-xl border border-slate-800/70 bg-[#121a2c] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-sky-300/20 bg-sky-500/15">🏥</div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">pVerify Eligibility Response</p>
                  <p className="text-xs text-slate-400">
                    Request ID: {state?.apiMeta?.requestId ?? '—'} · DOS: {d.serviceDate || '—'}
                  </p>
                </div>
              </div>
            </section>

            {d.warnings.length > 0 && (
              <section className="rounded-lg border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                <p className="font-semibold">Member ID Corrected</p>
                <p className="mt-1 text-amber-100/80">{d.warnings[0].message}</p>
              </section>
            )}

            <section className="rounded-2xl border border-slate-700/80 bg-[#161f35] p-5 shadow-[0_6px_28px_rgba(0,0,0,0.38)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[38px] font-bold leading-none text-slate-100">{d.patientName || '—'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      {d.coverageActive ? 'Active Coverage' : 'Inactive Coverage'}
                    </span>
                    <span className="rounded-full border border-sky-300/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                      {d.planType || 'Plan'}
                    </span>
                    <span className="rounded-full border border-violet-300/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                      DME Practice
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Payer</p>
                  <p className="text-lg font-bold text-sky-300">{d.payor || '—'}</p>
                  <p className="text-xs text-slate-500">ID {state?.apiMeta?.payerCode ?? '—'}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-700/70 pt-4 md:grid-cols-4">
                {[
                  ['Member ID', d.patientId],
                  ['Date of Birth', (state as any)?.intakeContext?.patientDOB ?? '—'],
                  ['Plan Effective', d.effectiveDateDisplay],
                  ['Group Number', d.groupNumber || '—'],
                  ['Plan Name', d.planName || '—'],
                  ['Service Code', d.serviceCode || '—'],
                  ['Service Date', d.serviceDate || '—'],
                  ['Network Status', d.networkInNetwork ? 'In-network' : 'Out-of-network'],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-sm text-slate-200">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Deductibles
                <span className="h-px flex-1 bg-slate-800/80" />
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-700/80 bg-[#1a2440] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-200">Deductible</p>
                    <span className="rounded border border-sky-300/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">In-Network</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-700 pb-3">
                      <div><p className="text-sm text-slate-300">Individual</p><p className="text-xs text-slate-500">Calendar Year</p></div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{fmtUsd(d.financial.deductible)}</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-rose-300">{fmtUsd(d.financial.deductibleRemaining)}</span> remaining</p>
                        <div className="mt-1 h-0.5 w-20 rounded bg-slate-700">
                          <div className="h-full rounded bg-rose-300" style={{ width: `${clampPercent(d.financial.deductibleRemaining, d.financial.deductible)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm text-slate-300">Family</p><p className="text-xs text-slate-500">Calendar Year</p></div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{fmtUsd(d.financial.deductible * 2.5)}</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-rose-300">{fmtUsd(d.financial.deductibleRemaining * 1.5)}</span> remaining</p>
                        <div className="mt-1 h-0.5 w-20 rounded bg-slate-700">
                          <div className="h-full rounded bg-amber-300" style={{ width: `${clampPercent(d.financial.deductibleRemaining * 1.5, d.financial.deductible * 2.5)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-[#1a2440] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-200">Deductible</p>
                    <span className="rounded border border-rose-300/30 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300">Out-of-Network</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-700 pb-3">
                      <div><p className="text-sm text-slate-300">Individual</p><p className="text-xs text-slate-500">Calendar Year</p></div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{fmtUsd(d.financial.deductible * 2)}</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-rose-300">{fmtUsd(d.financial.deductibleRemaining * 2)}</span> remaining</p>
                        <div className="mt-1 h-0.5 w-20 rounded bg-slate-700">
                          <div className="h-full rounded bg-rose-300" style={{ width: `${clampPercent(d.financial.deductibleRemaining * 2, d.financial.deductible * 2)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm text-slate-300">Family</p><p className="text-xs text-slate-500">Calendar Year</p></div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{fmtUsd(d.financial.deductible * 5)}</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-rose-300">{fmtUsd(d.financial.deductibleRemaining * 4)}</span> remaining</p>
                        <div className="mt-1 h-0.5 w-20 rounded bg-slate-700">
                          <div className="h-full rounded bg-rose-300" style={{ width: `${clampPercent(d.financial.deductibleRemaining * 4, d.financial.deductible * 5)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Out-of-Pocket Maximum
                <span className="h-px flex-1 bg-slate-800/80" />
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-700/80 bg-[#1a2440] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-200">Out-of-Pocket</p>
                    <span className="rounded border border-sky-300/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">In-Network</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-700 pb-3">
                      <div><p className="text-sm text-slate-300">Individual</p><p className="text-xs text-slate-500">Includes Med & RX</p></div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{fmtUsd(d.financial.outOfPocketMax)}</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-rose-300">{fmtUsd(d.financial.outOfPocketRemaining)}</span> remaining</p>
                        <div className="mt-1 h-0.5 w-20 rounded bg-slate-700">
                          <div className="h-full rounded bg-rose-300" style={{ width: `${clampPercent(d.financial.outOfPocketRemaining, d.financial.outOfPocketMax)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm text-slate-300">Family</p><p className="text-xs text-slate-500">Includes Med & RX</p></div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{fmtUsd(d.financial.outOfPocketMax * 2)}</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-rose-300">{fmtUsd(d.financial.outOfPocketRemaining)}</span> remaining</p>
                        <div className="mt-1 h-0.5 w-20 rounded bg-slate-700">
                          <div className="h-full rounded bg-amber-300" style={{ width: `${clampPercent(d.financial.outOfPocketRemaining, d.financial.outOfPocketMax * 2)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-[#1a2440] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-200">Out-of-Pocket</p>
                    <span className="rounded border border-rose-300/30 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300">Out-of-Network</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-700 pb-3">
                      <div><p className="text-sm text-slate-300">Individual</p><p className="text-xs text-slate-500">Includes Med & RX</p></div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{fmtUsd(d.financial.outOfPocketMax * 2)}</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-rose-300">{fmtUsd(d.financial.outOfPocketRemaining * 2)}</span> remaining</p>
                        <div className="mt-1 h-0.5 w-20 rounded bg-slate-700">
                          <div className="h-full rounded bg-rose-300" style={{ width: `${clampPercent(d.financial.outOfPocketRemaining * 2, d.financial.outOfPocketMax * 2)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm text-slate-300">Family</p><p className="text-xs text-slate-500">Includes Med & RX</p></div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{fmtUsd(d.financial.outOfPocketMax * 4)}</p>
                        <p className="text-xs text-slate-500"><span className="font-semibold text-rose-300">{fmtUsd(d.financial.outOfPocketRemaining * 3)}</span> remaining</p>
                        <div className="mt-1 h-0.5 w-20 rounded bg-slate-700">
                          <div className="h-full rounded bg-rose-300" style={{ width: `${clampPercent(d.financial.outOfPocketRemaining * 3, d.financial.outOfPocketMax * 4)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Benefits
                <span className="h-px flex-1 bg-slate-800/80" />
              </h2>
              <div className="rounded-xl border border-slate-700/80 bg-[#1a2440] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between border-b border-slate-700 bg-[#1c2540] px-4 py-3">
                  <p className="text-sm font-semibold text-slate-100">Durable Medical Equipment Purchase</p>
                  <span className="text-xs uppercase tracking-wide text-slate-500">STC 12</span>
                </div>
                <div className="grid gap-0 sm:grid-cols-2">
                  {d.dme.rows.slice(0, 4).map((row, idx) => (
                    <div key={`${row.label}-${idx}`} className="border-b border-r border-slate-700 p-4 sm:[&:nth-child(2n)]:border-r-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
                      <p className="mt-2 text-xl font-bold text-slate-100">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden rounded-xl border border-sky-300/30 bg-sky-500/10 px-4 py-3 text-sm text-slate-200">
                <p className="font-semibold text-sky-300">Precertification May Be Required</p>
                <p className="mt-1 text-slate-300">To verify if precert is needed for a specific service, use the payer code search tool before rendering services.</p>
              </div>
            </section>

            <section className="hidden space-y-3">
              <h2 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Request Details
                <span className="h-px flex-1 bg-slate-800/80" />
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['API Response', `Processed (${raw.APIResponseCode ?? '—'})`],
                  ['Request ID', String(state?.apiMeta?.requestId ?? '—')],
                  ['Verification Type', String(state?.apiMeta?.verificationType ?? '—')],
                  ['Date of Service', d.serviceDate || '—'],
                  ['Payer ID', String(state?.apiMeta?.payerCode ?? '—')],
                  ['Practice Type', d.serviceCode || '—'],
                  ['Member ID Exception', d.warnings[0]?.message ?? 'None'],
                  ['Network Status', d.networkInNetwork ? 'In-network' : 'Out-of-network'],
                  ['HMO Plan', d.planType.toLowerCase().includes('hmo') ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-700 bg-[#161d2e] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-sm text-slate-200">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {toastEl}
      </div>
    </div>
  )
}

export default function EligibilityResult({ providerMode = false }: { providerMode?: boolean }) {
  if (providerMode) {
    return <EligibilityResultContent providerMode />
  }

  return (
    <PatientFlowCogniThemeScope className="relative overflow-x-hidden">
      <EligibilityResultContent />
    </PatientFlowCogniThemeScope>
  )
}
