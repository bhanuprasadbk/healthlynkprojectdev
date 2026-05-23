import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, Send, Bot, UserRound, Search } from 'lucide-react'
import Button from '../components/forms/Button'
import Toast from '../components/Toast'
import { ROUTES } from '../routes/routeMap'
import { buildEligibilityDashboardView } from '../services/eligibilityDashboardView'
import type { EligibilityResultRouteState } from '../services/mapPverifyToEligibilityView'
import { apiJsonRequest } from '../services/apiClient'
import { fetchEligibilityPdfReport } from '../services/pverifyAuth'
import { fetchStediEligibilityPdfReport } from '../services/stediService'
import { findServiceTypeCodeName, getServiceTypeCodeOptions } from '../data/serviceTypeCodes'
import { getNppesProviderTableRows, searchProviders, type NppesProviderTableRow } from '../services/npiRegistry'
import {
  isShowAllCatalogQuery,
  matchBenefitChatCatalogOptions,
  topBenefitChatSuggestionMatches,
} from '../utils/benefitChatCatalogSearch'
import {
  getEligibilityByProductSlugs,
  serviceCodeSectionTitle,
  stcCodesFromProcedureLike,
} from '../utils/getEligibilityByProductSlugs'
import {
  EligibilityBenefitsCoverageSection,
  EligibilityBenefitServiceChatSection,
} from '../components/EligibilityResultBenefitsPanel'
import { PverifyFinancialPanel } from '../components/PverifyFinancialPanel'
import Swal from 'sweetalert2'
import { useTheme } from '../contexts/ThemeContext'
import {
  AI_ELIGIBILITY_FLOW_BG_CLASS,
  AI_ELIGIBILITY_FLOW_GRADIENT_CLASS,
  providerPortalShell,
} from '../theme/aiEligibilityFlowShell'
import { eligibilityResultUi } from '../theme/eligibilityResultUi'

/** Dev: always logs. Prod: set `localStorage.setItem('DEBUG_ELIGIBILITY_AI','1')` then refresh. */
function logEligibilityBenefitDebug(...args: unknown[]) {
  try {
    const force =
      typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_ELIGIBILITY_AI') === '1'
    if (!import.meta.env.DEV && !force) return
  } catch {
    if (!import.meta.env.DEV) return
  }
  console.log('[EligibilityResultAi]', ...args)
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = value != null ? String(value).trim() : ''
    if (text) return text
  }
  return '—'
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function networkCodeLabel(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper === 'Y') return 'In network'
  if (upper === 'N') return 'Out of network'
  if (upper === 'W') return 'Not set'
  return upper || 'Not set'
}

function formatServiceCodeWithLabel(code: string): string {
  const cleaned = code.trim()
  if (!cleaned || cleaned === '—') return '—'
  const match = getServiceTypeCodeOptions().find((option) => option.value === cleaned)
  if (!match) return cleaned
  const labelWithoutCode = match.label.replace(new RegExp(`\\s*\\(${cleaned}\\)\\s*$`), '').trim()
  return `${labelWithoutCode} (${cleaned})`
}

function formatCurrencyMaybe(raw: string): string {
  const s = raw.trim()
  if (!s || s === '—') return s || '—'
  if (s.includes('%')) return s
  const n = Number.parseFloat(s.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(n)) return s
  return `$${n.toFixed(2)}`
}

const PROCEDURE_MATCH_BLOB_MAX = 12000

/** Flatten a benefit row (and nested objects) to searchable text for procedure / code filtering. */
function benefitRecordProcedureBlob(rec: Record<string, unknown>): string {
  const acc: string[] = []
  const walk = (v: unknown, depth: number) => {
    if (depth > 8) return
    if (acc.join(' ').length > PROCEDURE_MATCH_BLOB_MAX) return
    if (v == null) return
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      acc.push(String(v))
      return
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        walk(item, depth + 1)
        if (acc.join(' ').length > PROCEDURE_MATCH_BLOB_MAX) return
      }
      return
    }
    if (typeof v === 'object') {
      const o = asRecord(v)
      if (!o) return
      for (const val of Object.values(o)) {
        walk(val, depth + 1)
        if (acc.join(' ').length > PROCEDURE_MATCH_BLOB_MAX) return
      }
    }
  }
  walk(rec, 0)
  return acc.join(' ').toLowerCase()
}

function procedureMatchNeedles(code: string, category: string): string[] {
  const c = code.trim().toUpperCase()
  const out = new Set<string>()
  if (c) out.add(c)
  if (category === 'HCPC' && /^[A-Z]+\d/.test(c)) {
    const tail = c.replace(/^[A-Z]+/, '')
    if (tail && tail !== c) out.add(tail)
  }
  return [...out].filter((n) => n.length >= 2)
}

/** Payer-facing labels only — avoids matching numeric slugs inside unrelated JSON / dates. */
function benefitFocusedHaystack(row: {
  code: string
  name: string
  type: string
  serviceTypes: string[]
  serviceTypeCodes: string[]
  additionalInfo: string
}): string {
  return [
    row.code,
    row.name,
    row.type,
    ...row.serviceTypes,
    ...row.serviceTypeCodes,
    row.additionalInfo,
  ]
    .join(' ')
    .toLowerCase()
}

function procedureDescriptionMatchTokens(description: string): string[] {
  return description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4)
}

function benefitRowStcIds(row: { serviceTypeCodes: string[]; code: string }): Set<string> {
  const s = new Set<string>()
  for (const c of row.serviceTypeCodes) {
    const t = String(c).trim().toLowerCase()
    if (t) s.add(t)
  }
  const rc = String(row.code || '').trim().toLowerCase()
  if (rc && rc !== '—') s.add(rc)
  return s
}

function numericSlugLooksLikeTokenInFocused(slug: string, focused: string): boolean {
  const re = new RegExp(`(?:^|[^0-9])${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^0-9]|$)`)
  return re.test(focused)
}

/**
 * Match benefit rows to a configured CPT/HCPC + product_service_slugs (strict matching).
 * Procedure / HCPC code: checked against full flattened row (payer may embed code deep in JSON).
 * Numeric slugs: STC / row code hit; when the procedure description has ≥4-char tokens,
 * require one of those tokens on payer-facing fields. Other slugs: match on focused fields only.
 */
function benefitRowMatchesProcedure(
  row: {
    procedureMatchBlob: string
    code: string
    name: string
    type: string
    serviceTypes: string[]
    serviceTypeCodes: string[]
    additionalInfo: string
  },
  proc: { code: string; category: string; productSlugs: string[]; description: string }
): boolean {
  const blob = row.procedureMatchBlob
  if (procedureMatchNeedles(proc.code, proc.category).some((needle) => blob.includes(needle.toLowerCase()))) {
    return true
  }

  const focused = benefitFocusedHaystack(row)
  const stcIds = benefitRowStcIds(row)
  const descTokens = procedureDescriptionMatchTokens(proc.description)
  const hasDescTokens = descTokens.length > 0
  const descRelatesToRow = hasDescTokens && descTokens.some((w) => focused.includes(w))

  const normalizedSlugs = proc.productSlugs
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && s !== 'other' && s.length >= 2)

  const numericSlugs = normalizedSlugs.filter((s) => /^\d+$/.test(s))
  const stcHitsNumericSlug = numericSlugs.some((s) => stcIds.has(s))

  if (stcHitsNumericSlug) {
    if (!hasDescTokens) return true
    return descRelatesToRow
  }

  for (const slug of normalizedSlugs) {
    if (/^\d+$/.test(slug)) {
      if (!numericSlugLooksLikeTokenInFocused(slug, focused)) continue
      if (!hasDescTokens) return true
      if (descRelatesToRow) return true
      continue
    }
    if (focused.includes(slug)) return true
  }
  return false
}

type BenefitChatMessage = {
  role: 'assistant' | 'user'
  text: string
}

type ServiceCodeOption = {
  value: string
  label: string
}

type SelectedProcedureCptEntry = {
  optionValue: string
  code: string
  description: string
  category: string
  productSlugs: string[]
}

type BenefitDetailTableRow = {
  service: string
  network: string
  coinsurance: string
  copay: string
}

function isPlaceholderBenefitDetailRow(r: BenefitDetailTableRow): boolean {
  return r.service === '—' && r.network === '—' && r.coinsurance === '—' && r.copay === '—'
}

type SelectedServiceBenefitSection =
  | {
      code: string
      rows: BenefitDetailTableRow[]
      procedureContext: { code: string; description: string; category: string }
    }
  | { code: string; rows: BenefitDetailTableRow[] }

type ApiCptHcpcListRow = {
  id?: string
  code?: string
  cpt_hcpc_code?: string
  description?: string
  category?: string
  product_service_slug?: string
  product_service_slugs?: unknown
  product_service?: string
}

type ApiCptHcpcListResponse = {
  data?: ApiCptHcpcListRow[] | { codes?: ApiCptHcpcListRow[] }
}

const CPT_OPTION_PREFIX = 'cpt:'

function normalizeCptListProductSlugs(row: ApiCptHcpcListRow): string[] {
  const rawSlugs = row.product_service_slugs
  if (Array.isArray(rawSlugs)) {
    const u = [...new Set(rawSlugs.map((x) => String(x).trim()).filter(Boolean))]
    if (u.length) return u
  }
  const single =
    (typeof row.product_service_slug === 'string' ? row.product_service_slug.trim() : '') ||
    (typeof row.product_service === 'string' ? row.product_service.trim() : '') ||
    ''
  return single ? [single] : ['other']
}

function normalizeCptListCategory(row: ApiCptHcpcListRow): string {
  const raw = typeof row.category === 'string' ? row.category.trim().toUpperCase() : ''
  return raw === 'HCPC' ? 'HCPC' : 'CPT'
}

function normalizeCptListRow(row: ApiCptHcpcListRow, index: number): {
  id: string
  cptCode: string
  description: string
  productSlugs: string[]
  category: string
} {
  const cptCode = (row.code || row.cpt_hcpc_code || '').trim() || `row-${index}`
  return {
    id: (typeof row.id === 'string' && row.id.trim()) || `cpt-${index}-${cptCode}`,
    cptCode,
    description: (row.description || '').trim() || '—',
    productSlugs: normalizeCptListProductSlugs(row),
    category: normalizeCptListCategory(row),
  }
}

function getFamilySummary(raw: Record<string, unknown>, patientName: string) {
  const demo = asRecord(raw.DemographicInfo)
  const sub = demo ? asRecord(demo.Subscriber) : null
  const subscriberName = firstNonEmpty(
    sub?.FullName,
    [sub?.Firstname, sub?.Lastname_R].filter(Boolean).join(' ')
  )

  let memberId = '—'
  const identification = sub?.Identification
  if (Array.isArray(identification)) {
    for (const row of identification) {
      const rec = asRecord(row)
      if (!rec) continue
      if (String(rec.Type ?? '').toLowerCase().includes('member') && rec.Code != null) {
        memberId = String(rec.Code).trim() || '—'
        break
      }
    }
  }

  const depsRaw = demo?.Dependents
  const dependents = Array.isArray(depsRaw)
    ? depsRaw
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item) =>
          firstNonEmpty(item.FullName, [item.Firstname, item.Lastname_R].filter(Boolean).join(' '))
        )
        .filter((name) => name !== '—')
    : []

  const dependentCount = dependents.length
  const relationship = subscriberName !== '—' && subscriberName === patientName ? 'Self' : 'Dependent'

  return { subscriberName, memberId, dependentCount, relationship }
}

function EligibilityAiFlowShell({
  providerMode,
  pageMinHeightClass,
  children,
  centerContent = false,
}: {
  providerMode: boolean
  pageMinHeightClass: string
  children: ReactNode
  centerContent?: boolean
}) {
  const { theme } = useTheme()

  if (!providerMode) {
    return (
      <div
        className={`relative ${pageMinHeightClass} ${
          centerContent ? 'flex items-center justify-center px-4' : 'overflow-y-auto px-4 py-8 sm:px-6'
        } font-sans text-slate-100 ${AI_ELIGIBILITY_FLOW_BG_CLASS}`}
      >
        <div
          className={`pointer-events-none fixed inset-0 ${AI_ELIGIBILITY_FLOW_GRADIENT_CLASS}`}
          aria-hidden
        />
        <div className={`relative z-10 ${centerContent ? 'w-full' : ''}`}>{children}</div>
      </div>
    )
  }

  const shell = providerPortalShell({
    background: theme.colors.background,
    textPrimary: theme.colors.textPrimary,
  })
  return (
    <div
      className={`${shell.className} ${pageMinHeightClass} font-sans ${
        centerContent ? 'flex items-center justify-center' : ''
      }`}
      style={shell.style}
    >
      <div className="relative mx-auto w-full max-w-6xl">{children}</div>
    </div>
  )
}

function EligibilityMemberHero({
  providerMode,
  ui,
  borderColor,
  statusEligible,
  patientName,
  payor,
  planName,
}: {
  providerMode: boolean
  ui: ReturnType<typeof eligibilityResultUi>
  borderColor: string
  statusEligible: boolean
  patientName: string
  payor: string
  planName?: string
}) {
  if (providerMode) {
    return (
      <div
        className="flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-start lg:justify-between"
        style={{ borderColor }}
      >
        <div className="min-w-0 flex-1">
          {statusEligible ? (
            <span className={ui.coverageActiveClass} style={ui.coverageActiveStyle}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={ui.coverageDotStyle} />
              Active Coverage
            </span>
          ) : (
            <span className={ui.coverageInactiveClass} style={ui.coverageInactiveStyle}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Inactive Coverage
            </span>
          )}
          <p className={ui.patientNameClass} style={ui.patientNameStyle}>
            {patientName || '—'}
          </p>
        </div>
        <div className={ui.payorCardClass} style={ui.payorCardStyle}>
          <p style={ui.payorCardLabelStyle}>Payer &amp; Plan</p>
          <p className="mt-1.5 text-[15px] font-semibold leading-snug" style={ui.payorCardPrimaryStyle}>
            {payor || '—'}
            {planName ? ` · ${planName}` : ''}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div>
        {statusEligible ? (
          <span className={ui.coverageActiveClass} style={ui.coverageActiveStyle}>
            <span className="h-2 w-2 rounded-full" style={ui.coverageDotStyle} />
            Active Coverage
          </span>
        ) : (
          <span className={ui.coverageInactiveClass} style={ui.coverageInactiveStyle}>
            <AlertTriangle className="h-3.5 w-3.5" />
            Inactive Coverage
          </span>
        )}
        <p className={ui.patientNameClass} style={ui.patientNameStyle}>
          {patientName || '—'}
        </p>
      </div>
      <span className={ui.payorPillClass} style={ui.payorPillStyle}>
        {payor || '—'} {planName ? `· ${planName}` : ''}
      </span>
    </div>
  )
}

function ProviderEligibilityPageHeader({
  description,
  actions,
}: {
  description: string
  actions?: ReactNode
}) {
  const { theme } = useTheme()
  return (
    <div className="mb-4 sm:mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: theme.colors.textPrimary }}>
          Eligibility Result
        </h1>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <p className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
        {description}
      </p>
    </div>
  )
}

export default function EligibilityResultAi({ providerMode = false }: { providerMode?: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const ui = useMemo(
    () => eligibilityResultUi(providerMode, theme.colors),
    [providerMode, theme.colors]
  )
  const intakeRoute = providerMode ? ROUTES.PROVIDER_PATIENT_INTAKE : ROUTES.PATIENT_AI_INTAKE
  const state = location.state as EligibilityResultRouteState | null
  const raw = state?.rawResponse ?? null
  const intake = state?.intakeContext
  const [pdfLoading, setPdfLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [isCoordinateModalOpen, setIsCoordinateModalOpen] = useState(false)
  const [coordFirstName, setCoordFirstName] = useState('')
  const [coordLastName, setCoordLastName] = useState('')
  const [coordRows, setCoordRows] = useState<NppesProviderTableRow[]>([])
  const [coordSearchError, setCoordSearchError] = useState('')
  const [selectedCoordRowKey, setSelectedCoordRowKey] = useState('')
  const [coordStep, setCoordStep] = useState<'first' | 'last' | 'results'>('first')
  const [cptBenefitChatOptions, setCptBenefitChatOptions] = useState<ServiceCodeOption[]>([])
  const [cptBenefitChatLoading, setCptBenefitChatLoading] = useState(false)
  const [cptOptionDetailsByValue, setCptOptionDetailsByValue] = useState<
    Record<string, { code: string; description: string; category: string; productSlugs: string[] }>
  >({})
  const dashboard = useMemo(() => {
    if (!raw) return null
    return buildEligibilityDashboardView(raw, {
      patientName: intake?.patientName ?? '',
      cptHcpcCode: intake?.cptHcpcCode ?? '',
      serviceDateFrom: intake?.serviceDateFrom ?? '',
      serviceDateTo: intake?.serviceDateTo ?? '',
    })
  }, [raw, intake?.patientName, intake?.cptHcpcCode, intake?.serviceDateFrom, intake?.serviceDateTo])

  const pageMinHeightClass = providerMode ? 'h-full min-h-0' : 'min-h-screen'

  if (!raw || !dashboard) {
    return (
      <EligibilityAiFlowShell
        providerMode={providerMode}
        pageMinHeightClass={pageMinHeightClass}
        centerContent
      >
        <div
          className={`mx-auto w-full max-w-lg rounded-2xl border p-6 text-center ${
            providerMode ? '' : 'border-slate-800 bg-slate-900'
          }`}
          style={
            providerMode
              ? {
                  backgroundColor: theme.colors.cardBackground,
                  borderColor: theme.colors.cardBorder,
                }
              : undefined
          }
        >
          <h1
            className={`text-xl font-semibold ${providerMode ? '' : 'text-slate-100'}`}
            style={providerMode ? { color: theme.colors.textPrimary } : undefined}
          >
            No eligibility result yet
          </h1>
          <p
            className={`mt-2 text-sm ${providerMode ? '' : 'text-slate-300'}`}
            style={providerMode ? { color: theme.colors.textSecondary } : undefined}
          >
            {providerMode
              ? 'Run a check from Patient Intake. Results will appear here after verification completes.'
              : 'Run a check from the AI intake flow first.'}
          </p>
          <div className="mt-4">
            <Button type="button" variant="primary" onClick={() => navigate(intakeRoute)}>
              {providerMode ? 'Go to Patient Intake' : 'Back to AI Intake'}
            </Button>
          </div>
        </div>
      </EligibilityAiFlowShell>
    )
  }

  const d = dashboard
  const family = getFamilySummary(raw, d.patientName)
  const [isBenefitChatOpen, setIsBenefitChatOpen] = useState(false)
  const [benefitChatDraft, setBenefitChatDraft] = useState('')
  const [selectedServiceCode, setSelectedServiceCode] = useState('')
  const [selectedServiceCodes, setSelectedServiceCodes] = useState<string[]>([])
  const [benefitChatMessages, setBenefitChatMessages] = useState<BenefitChatMessage[]>([])
  const [benefitServiceSuggestions, setBenefitServiceSuggestions] = useState<ServiceCodeOption[]>([])
  const [showBenefitDetails, setShowBenefitDetails] = useState(false)
  const [selectedProcedureCpts, setSelectedProcedureCpts] = useState<SelectedProcedureCptEntry[]>([])

  const loadCptServicesForBenefitChat = useCallback(async () => {
    setCptBenefitChatLoading(true)
    setCptBenefitChatOptions([])
    setCptOptionDetailsByValue({})
    try {
      const cptRes = await apiJsonRequest<ApiCptHcpcListResponse | ApiCptHcpcListRow[]>(
        '/cpt-hcpc-codes',
        { method: 'GET' }
      )
      const maybeArray = Array.isArray(cptRes)
        ? cptRes
        : Array.isArray(cptRes?.data)
          ? cptRes.data
          : Array.isArray(cptRes?.data?.codes)
            ? cptRes.data.codes
            : []
      const normalized = maybeArray.map((row, i) =>
        normalizeCptListRow(row as ApiCptHcpcListRow, i)
      )
      const details: Record<
        string,
        { code: string; description: string; category: string; productSlugs: string[] }
      > = {}
      const options: ServiceCodeOption[] = normalized.map((r) => {
        const value = `${CPT_OPTION_PREFIX}${encodeURIComponent(r.id)}:${encodeURIComponent(r.cptCode)}`
        details[value] = {
          code: r.cptCode,
          description: r.description,
          category: r.category,
          productSlugs: r.productSlugs,
        }
        return {
          value,
          label: `${r.cptCode} — ${r.description} · ${r.category}`,
        }
      })
      options.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
      )
      setCptOptionDetailsByValue(details)
      setCptBenefitChatOptions(options)
      logEligibilityBenefitDebug('CPT catalog — raw /cpt-hcpc-codes response:', cptRes)
      logEligibilityBenefitDebug('CPT catalog — parsed rows (normalizeCptListRow):', normalized)
      logEligibilityBenefitDebug('CPT catalog — chip options (value + label):', options)
    } catch (err) {
      logEligibilityBenefitDebug('CPT catalog — fetch failed:', err)
      setCptBenefitChatOptions([])
      setCptOptionDetailsByValue({})
    } finally {
      setCptBenefitChatLoading(false)
    }
  }, [])

  const benefitsRoot = useMemo(() => {
    const top = asRecord(raw)
    const nested = asRecord(top?.StediRawResponse)
    return nested ?? top ?? {}
  }, [raw])

  const benefitRows = useMemo(() => {
    const rows = asArray((benefitsRoot as Record<string, unknown>).benefitsInformation)
      .map((r) => asRecord(r))
      .filter((r): r is Record<string, unknown> => r !== null)
      .map((r) => ({
        code: firstNonEmpty(r.code),
        name: firstNonEmpty(r.name, r.code),
        type: firstNonEmpty(r.name, r.code),
        coverageLevel: firstNonEmpty(r.coverageLevel, 'Not set'),
        network: networkCodeLabel(firstNonEmpty(r.inPlanNetworkIndicatorCode, r.inPlanNetworkIndicator, '')),
        serviceTypeCodes: asArray(r.serviceTypeCodes).map((v) => String(v)).filter(Boolean),
        serviceTypes: asArray(r.serviceTypes).map((v) => String(v)).filter(Boolean),
        timeQualifier: firstNonEmpty(r.timeQualifier),
        amount: firstNonEmpty(r.benefitAmount),
        percent: firstNonEmpty(r.benefitPercent),
        additionalInfoItems: asArray(r.additionalInformation)
          .map((entry) => asRecord(entry))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
          .map((entry) => firstNonEmpty(entry.description, ''))
          .filter((v) => v !== '—'),
        additionalInfo: asArray(r.additionalInformation)
          .map((entry) => asRecord(entry))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
          .map((entry) => firstNonEmpty(entry.description, ''))
          .filter((v) => v !== '—')
          .join(' | '),
        insuranceType: firstNonEmpty(r.insuranceType, d.planType, ''),
        procedureMatchBlob: benefitRecordProcedureBlob(r),
      }))
    return rows
  }, [benefitsRoot, d.planType])

  useEffect(() => {
    const rawBenefits = asArray((benefitsRoot as Record<string, unknown>).benefitsInformation)
    logEligibilityBenefitDebug('Benefits — raw benefitsInformation[] from eligibility payload:', rawBenefits)
    logEligibilityBenefitDebug('Benefits — parsed benefitRows (used for tables):', benefitRows)
  }, [benefitsRoot, benefitRows])

  const activeServiceCodesForCards = useMemo(() => {
    const fromStc = selectedServiceCodes.filter((code) => code && code !== '30')
    const fromProcs = selectedProcedureCpts.flatMap((proc) =>
      stcCodesFromProcedureLike({ code: proc.code, productSlugs: proc.productSlugs })
    )
    return [...new Set([...fromStc, ...fromProcs])]
  }, [selectedServiceCodes, selectedProcedureCpts])

  const mapBenefitRowForTable = useCallback(
    (row: (typeof benefitRows)[0]): BenefitDetailTableRow => ({
      service:
        row.additionalInfoItems[0] ||
        row.timeQualifier ||
        (row.serviceTypes.length > 0 ? row.serviceTypes.join(', ') : row.type || row.code || '—'),
      network: row.network || 'Not set',
      coinsurance: row.percent && row.percent !== '—' ? row.percent : '—',
      copay: formatCurrencyMaybe(row.amount || '—'),
    }),
    []
  )

  const serviceCodeCoverageResults = useMemo(() => {
    const base = getEligibilityByProductSlugs(raw, activeServiceCodesForCards)
    return base.map((result) => {
      const procedureExtras = selectedProcedureCpts
        .filter((proc) =>
          stcCodesFromProcedureLike({ code: proc.code, productSlugs: proc.productSlugs }).includes(
            result.serviceCode
          )
        )
        .flatMap((proc) =>
          benefitRows
            .filter((row) =>
              benefitRowMatchesProcedure(row, {
                code: proc.code,
                category: proc.category,
                productSlugs: proc.productSlugs,
                description: proc.description,
              })
            )
            .map(mapBenefitRowForTable)
            .filter((r) => !isPlaceholderBenefitDetailRow(r))
        )
      return { result, additionalRows: procedureExtras }
    })
  }, [
    raw,
    activeServiceCodesForCards,
    selectedProcedureCpts,
    benefitRows,
    mapBenefitRowForTable,
  ])

  const selectedServiceSections = useMemo((): SelectedServiceBenefitSection[] => {
    const mapBenefitRow = (row: (typeof benefitRows)[0]): BenefitDetailTableRow => ({
      service:
        row.additionalInfoItems[0] ||
        row.timeQualifier ||
        (row.serviceTypes.length > 0 ? row.serviceTypes.join(', ') : row.type || row.code || '—'),
      network: row.network || 'Not set',
      coinsurance: row.percent && row.percent !== '—' ? row.percent : '—',
      copay: formatCurrencyMaybe(row.amount || '—'),
    })

    if (selectedProcedureCpts.length > 0) {
      return selectedProcedureCpts.map((proc) => {
        const filtered = benefitRows.filter((row) =>
          benefitRowMatchesProcedure(row, {
            code: proc.code,
            category: proc.category,
            productSlugs: proc.productSlugs,
            description: proc.description,
          })
        )
        return {
          code: proc.optionValue,
          rows: filtered.map(mapBenefitRow).filter((r) => !isPlaceholderBenefitDetailRow(r)),
          procedureContext: {
            code: proc.code,
            description: proc.description,
            category: proc.category,
          },
        }
      })
    }

    const codes = selectedServiceCodes.length > 0 ? selectedServiceCodes : [selectedServiceCode || '30']
    const uniqueCodes = Array.from(new Set(codes.filter((code) => Boolean(code) && code !== '30')))
    return uniqueCodes.map((code) => {
      const rows = benefitRows
        .filter((row) => row.serviceTypeCodes.includes(code))
        .map(mapBenefitRow)
      return { code, rows }
    })
  }, [benefitRows, selectedProcedureCpts, selectedServiceCode, selectedServiceCodes])

  useEffect(() => {
    logEligibilityBenefitDebug(
      'Benefits — sections rendered (after CPT/STC selection; each section.rows = table data):',
      selectedServiceSections
    )
  }, [selectedServiceSections])

  useEffect(() => {
    if (selectedServiceCode) return
    setSelectedServiceCode('30')
    setSelectedServiceCodes(['30'])
  }, [selectedServiceCode])

  /** Benefit chat matches only against CPT/HCPC rows from GET /cpt-hcpc-codes (no product-service or STC list). */
  const benefitChatSearchOptions = useMemo(
    () => cptBenefitChatOptions,
    [cptBenefitChatOptions]
  )
  const fmtCurrency = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const fmtCurrency2 = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inDeductible = d.financial.deductible
  const inDeductibleRemaining = d.financial.deductibleRemaining
  const outDeductible = d.financial.deductible > 0 ? d.financial.deductible * 2 : 0
  const outDeductibleRemaining = d.financial.deductibleRemaining > 0 ? d.financial.deductibleRemaining * 2 : 0
  const inFamilyDeductible = d.financial.deductible > 0 ? d.financial.deductible * 2.5 : 0
  const inFamilyDeductibleRemaining = d.financial.deductibleRemaining > 0 ? d.financial.deductibleRemaining * 1.5 : 0
  const outFamilyDeductible = d.financial.deductible > 0 ? d.financial.deductible * 5 : 0
  const outFamilyDeductibleRemaining = d.financial.deductibleRemaining > 0 ? d.financial.deductibleRemaining * 4 : 0
  const inOop = d.financial.outOfPocketMax
  const inOopRemaining = d.financial.outOfPocketRemaining
  const outOop = d.financial.outOfPocketMax > 0 ? d.financial.outOfPocketMax * 2 : 0
  const outOopRemaining = d.financial.outOfPocketRemaining > 0 ? d.financial.outOfPocketRemaining * 2 : 0
  const inFamilyOop = d.financial.outOfPocketMax > 0 ? d.financial.outOfPocketMax * 2 : 0
  const inFamilyOopRemaining = d.financial.outOfPocketRemaining
  const outFamilyOop = d.financial.outOfPocketMax > 0 ? d.financial.outOfPocketMax * 4 : 0
  const outFamilyOopRemaining = d.financial.outOfPocketRemaining > 0 ? d.financial.outOfPocketRemaining * 3 : 0
  const intakeRecord = asRecord(intake as unknown)
  const intakeDob = firstNonEmpty(intakeRecord?.patientDOB, intakeRecord?.patientDob, '')
  const normalizeDob = (value: string): string => {
    const text = String(value ?? '').trim()
    if (!text || text === '—') return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [y, m, d] = text.split('-')
      return `${m}/${d}/${y}`
    }
    return text
  }
  const dobDisplay = normalizeDob(intakeDob) || '—'

  const deductibleCards = [
    { title: 'Individual Deductible', amount: inDeductible, sub: 'In-Network · Per Year', remaining: inDeductibleRemaining, tone: 'blue' },
    { title: 'Individual Deductible', amount: outDeductible, sub: 'Out-of-Network · Per Year', remaining: outDeductibleRemaining, tone: 'red' },
    { title: 'Family Deductible', amount: inFamilyDeductible, sub: 'In-Network · Per Year', remaining: inFamilyDeductibleRemaining, tone: 'blue' },
    { title: 'Family Deductible', amount: outFamilyDeductible, sub: 'Out-of-Network · Per Year', remaining: outFamilyDeductibleRemaining, tone: 'red' },
    { title: 'Individual Out-of-Pocket', amount: inOop, sub: 'In-Network · Per Year', remaining: inOopRemaining, tone: 'purple' },
    { title: 'Individual Out-of-Pocket', amount: outOop, sub: 'Out-of-Network · Per Year', remaining: outOopRemaining, tone: 'red' },
    { title: 'Family Out-of-Pocket', amount: inFamilyOop, sub: 'In-Network · Per Year', remaining: inFamilyOopRemaining, tone: 'purple' },
    { title: 'Family Out-of-Pocket', amount: outFamilyOop, sub: 'Out-of-Network · Per Year', remaining: outFamilyOopRemaining, tone: 'red' },
  ]
  useEffect(() => {
    if (!isBenefitChatOpen) return
    if (benefitChatMessages.length > 0) return
    setBenefitChatMessages([
      {
        role: 'assistant',
        text: 'Reply "Yes" to search your practice\'s service list, or type a service name, service code, or description after the list loads.',
      },
    ])
  }, [benefitChatMessages.length, isBenefitChatOpen])

  const handleBenefitServiceSelect = (option: ServiceCodeOption) => {
    if (option.value.startsWith(CPT_OPTION_PREFIX)) {
      const meta = cptOptionDetailsByValue[option.value]
      if (!meta) return
      const stcExtras = Array.from(
        new Set(selectedServiceCodes.filter((c) => c && c !== '30'))
      )
      const isSelected = selectedProcedureCpts.some((p) => p.optionValue === option.value)
      if (isSelected) {
        const next = selectedProcedureCpts.filter((p) => p.optionValue !== option.value)
        const removedStcs = stcCodesFromProcedureLike(meta)
        setSelectedProcedureCpts(next)
        const remainingStcs = next.flatMap((p) =>
          stcCodesFromProcedureLike({ code: p.code, productSlugs: p.productSlugs })
        )
        setSelectedServiceCodes((prev) => {
          const kept = prev.filter(
            (c) => c === '30' || (!removedStcs.includes(c) && remainingStcs.includes(c))
          )
          const merged = Array.from(new Set(['30', ...kept.filter((c) => c !== '30'), ...remainingStcs]))
          return merged.length > 0 ? merged : ['30']
        })
        setShowBenefitDetails(next.length > 0 || stcExtras.length > 0)
        setBenefitServiceSuggestions([])
        logEligibilityBenefitDebug('CPT selection — removed procedure:', meta, 'remaining procedures:', next)
        setBenefitChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `Removed service code ${meta.code} from your selection. Benefit sections update below.`,
          },
        ])
        return
      }
      const procEntry = {
        optionValue: option.value,
        code: meta.code,
        description: meta.description,
        category: meta.category,
        productSlugs: meta.productSlugs,
      }
      setSelectedProcedureCpts((prev) => [...prev, procEntry])
      const stcFromProc = stcCodesFromProcedureLike(procEntry)
      if (stcFromProc.length > 0) {
        setSelectedServiceCodes((prev) =>
          Array.from(new Set(['30', ...prev.filter((c) => c !== '30'), ...stcFromProc]))
        )
      }
      setShowBenefitDetails(true)
      setBenefitServiceSuggestions([])
      logEligibilityBenefitDebug('CPT selection — added procedure:', meta, 'option:', option)
      setBenefitChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Added service code ${meta.code}. Benefit details below are filtered to lines from this response that reference this code or any of your linked product categories when the payer included them.`,
        },
      ])
      return
    }

    setSelectedProcedureCpts([])
    const code = option.value
    setSelectedServiceCode(code)
    const isCurrentlySelected = selectedServiceCodes.includes(code)
    let nextSelected: string[]
    if (isCurrentlySelected) {
      nextSelected = selectedServiceCodes.filter((value) => value !== code)
      if (nextSelected.length === 0) nextSelected = ['30']
    } else {
      nextSelected = Array.from(new Set([...selectedServiceCodes, code]))
    }
    if (!nextSelected.includes('30')) {
      nextSelected = ['30', ...nextSelected]
    }
    if (isCurrentlySelected && code === selectedServiceCode) {
      const fallbackCode = nextSelected.find((value) => value !== code) ?? '30'
      setSelectedServiceCode(fallbackCode)
    }
    setSelectedServiceCodes(nextSelected)
    setShowBenefitDetails(true)
    setBenefitServiceSuggestions([])
    logEligibilityBenefitDebug('STC selection — service type code:', {
      option,
      isCurrentlySelected,
      nextSelected,
    })
    setBenefitChatMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: isCurrentlySelected
          ? `Removed ${option.label}.`
          : `Selected ${option.label}. Benefit details are updated below.`,
      },
    ])
  }

  const submitBenefitChatQuestion = () => {
    const question = benefitChatDraft.trim()
    if (!question) return

    const normalized = question.toLowerCase()
    const compact = normalized.replace(/[^a-z0-9]/g, '')
    setBenefitChatMessages((prev) => [...prev, { role: 'user', text: question }])

    if (cptBenefitChatLoading) {
      setBenefitChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "Still loading your practice's service list from the server. Please wait a moment and try again.",
        },
      ])
      setBenefitChatDraft('')
      return
    }

    if (compact === 'yes' || compact === 'y') {
      setBenefitServiceSuggestions([])
      setBenefitChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            cptBenefitChatOptions.length > 0
              ? 'Try a service code, a category (such as medical care or supplies), words that describe the service, or type "All" to show your full list.'
              : 'No services are listed yet. Once your practice adds them to the service list, you can try this again.',
        },
      ])
      setBenefitChatDraft('')
      return
    }

    if (compact === 'no' || compact === 'n') {
      setBenefitServiceSuggestions([])
      setSelectedProcedureCpts([])
      setSelectedServiceCode('30')
      setSelectedServiceCodes(['30'])
      setShowBenefitDetails(false)
      setBenefitChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Okay. Showing default result for ${formatServiceCodeWithLabel('30')}.`,
        },
      ])
      setBenefitChatDraft('')
      return
    }

    const showAllCatalog = isShowAllCatalogQuery(normalized)
    const matches = matchBenefitChatCatalogOptions(benefitChatSearchOptions, normalized)

    logEligibilityBenefitDebug('Catalog search — filter input / results:', {
      queryRaw: question,
      queryNormalized: normalized,
      showAllCatalog,
      catalogOptionCount: benefitChatSearchOptions.length,
      matchCount: matches.length,
      matches,
    })

    if (matches.length === 0) {
      setBenefitServiceSuggestions([])
      setBenefitChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            cptBenefitChatOptions.length > 0
              ? 'No matching service found. Try another service code or different words from the description.'
              : "No services are loaded yet. Ask your care team to confirm the service list is set up, then try again.",
        },
      ])
      setBenefitChatDraft('')
      return
    }

    const suggestionCap = 12
    const topMatches = showAllCatalog
      ? matches
      : topBenefitChatSuggestionMatches(matches, suggestionCap)
    logEligibilityBenefitDebug('Catalog search — showing suggestion chips (user must tap to apply):', {
      totalMatches: matches.length,
      showAllCatalog,
      topMatches,
    })
    setBenefitServiceSuggestions(topMatches)
    const truncated = !showAllCatalog && matches.length > topMatches.length
    const moreHint = truncated ? ` Showing the first ${topMatches.length}; type a more specific search to narrow further.` : ''
    const assistantText = showAllCatalog
      ? matches.length === 1
        ? 'Showing your full service list (1 service). Tap it below to load benefit details filtered to this eligibility response.'
        : `Showing your full service list (${matches.length} services). Tap one below to load benefit details filtered to this eligibility response.`
      : matches.length === 1
        ? `Found 1 related service.${moreHint} Tap it below to load benefit details filtered to this eligibility response.`
        : `Found ${matches.length} related services.${moreHint} Tap one below to load benefit details filtered to this eligibility response.`
    setBenefitChatMessages((prev) => [...prev, { role: 'assistant', text: assistantText }])
    setBenefitChatDraft('')
  }

  const sourceService = (state?.apiMeta?.source ?? 'pverify') as
    | 'stedi'
    | 'pverify'
    | 'azure-health-card'
  const usd = (n: number) => `$${n.toFixed(2)}`
  const pct = (remaining: number, total: number) => {
    if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) return 0
    return Math.max(0, Math.min(100, (remaining / total) * 100))
  }
  if (sourceService === 'pverify') {
    const demo = asRecord(raw.DemographicInfo)
    const subscriber = demo ? asRecord(demo.Subscriber) : null
    const planSummary = asRecord(raw.PlanCoverageSummary)
    const subscriberAddress = asRecord(subscriber?.Address) ?? asRecord(subscriber?.AddressInfo)
    const inlineAddress = [
      subscriberAddress?.Address1,
      subscriberAddress?.Address2,
      subscriberAddress?.City,
      subscriberAddress?.State,
      subscriberAddress?.Zip,
    ]
      .map((v) => (v != null ? String(v).trim() : ''))
      .filter(Boolean)
      .join(', ')
    const genderDisplay = firstNonEmpty(
      subscriber?.Gender,
      subscriber?.GenderCode,
      subscriber?.Sex,
      asRecord(raw.Subscriber)?.Gender,
      raw.Gender
    )
    const groupNameDisplay = firstNonEmpty(
      planSummary?.GroupName,
      planSummary?.EmployerName,
      raw.GroupName
    )
    const planNumberDisplay = firstNonEmpty(
      planSummary?.PlanNumber,
      planSummary?.PlanCode,
      planSummary?.PolicyNumber,
      raw.PlanNumber
    )
    const addressDisplay = firstNonEmpty(
      inlineAddress,
      subscriber?.AddressLine1,
      subscriber?.Address1,
      raw.Address
    )
    return (
      <EligibilityAiFlowShell providerMode={providerMode} pageMinHeightClass={pageMinHeightClass}>
        <div className="mx-auto max-w-6xl space-y-4">
          {providerMode ? (
            <ProviderEligibilityPageHeader
              description="Review coverage, deductibles, and benefit details from the eligibility response."
              actions={
                <>
                  <Button type="button" variant="outline" onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
                    <span className="inline-flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      {pdfLoading ? 'Downloading...' : 'Download PDF'}
                    </span>
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate(intakeRoute)}>
                    <span className="inline-flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      New Check
                    </span>
                  </Button>
                </>
              }
            />
          ) : (
          <div className="flex flex-wrap items-start justify-between gap-3 px-1 py-1">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-sky-300/20 bg-sky-500/15">🏥</div>
              <div>
                <p className="text-sm font-semibold text-slate-100">pVerify Eligibility Response</p>
                <p className="text-xs text-slate-400">
                  Request ID: {state?.apiMeta?.requestId ?? '—'} · DOS: {d.serviceDate || '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
                <span className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {pdfLoading ? 'Downloading...' : 'Download PDF'}
                </span>
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(intakeRoute)}>
                <span className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  New Check
                </span>
              </Button>
            </div>
          </div>
          )}

          {d.warnings.length > 0 && (
            <section
              className={
                providerMode
                  ? 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm'
                  : 'rounded-lg border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200'
              }
              style={providerMode ? { color: theme.colors.textPrimary } : undefined}
            >
              <p className="font-semibold" style={providerMode ? { color: '#b45309' } : undefined}>
                Member ID Corrected
              </p>
              <p
                className="mt-1"
                style={providerMode ? { color: theme.colors.textSecondary } : undefined}
              >
                {d.warnings[0].message}
              </p>
            </section>
          )}

          <section className={ui.cardClass} style={ui.cardStyle}>
            <EligibilityMemberHero
              providerMode={providerMode}
              ui={ui}
              borderColor={theme.colors.border}
              statusEligible={d.coverageActive}
              patientName={d.patientName || '—'}
              payor={d.payor || '—'}
              planName={d.planType}
            />
            <div
              className={
                providerMode
                  ? 'mt-5 flex flex-wrap items-end gap-x-8 gap-y-3'
                  : 'mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 md:grid-cols-4'
              }
              style={providerMode ? undefined : { borderColor: 'rgba(71, 85, 105, 0.5)' }}
            >
              {[
                ['Member ID', d.patientId],
                [
                  'Date of Birth',
                  (() => {
                    const dobRaw = firstNonEmpty(
                      (state?.intakeContext as Record<string, unknown> | undefined)?.patientDOB,
                      (state?.intakeContext as Record<string, unknown> | undefined)?.patientDob,
                      ''
                    )
                    const dobText = String(dobRaw).trim()
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dobText)) {
                      const [y, m, day] = dobText.split('-')
                      return `${m}/${day}/${y}`
                    }
                    return dobText || '—'
                  })(),
                ],
                ['Gender', genderDisplay],
                ['Plan Effective', d.effectiveDateDisplay],
                ['Group Number', d.groupNumber || '—'],
                ['Group Name', groupNameDisplay],
                ['Plan Number', planNumberDisplay],
                ['Address', addressDisplay],
              ].map(([label, value]) => (
                <div key={String(label)} className={providerMode ? 'shrink-0' : undefined}>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={ui.labelStyle}
                  >
                    {label}
                  </p>
                  <p
                    className={providerMode ? 'mt-1 text-[15px]' : 'mt-1 text-sm'}
                    style={ui.valueStyle}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={ui.sectionTitleStyle}
            >
              Deductibles
              <span className="h-px flex-1" style={ui.dividerStyle} />
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <PverifyFinancialPanel
                title="Deductible"
                network="in"
                providerMode={providerMode}
                ui={ui}
                lines={[
                  {
                    label: 'Individual',
                    sublabel: 'Calendar Year',
                    amount: usd(d.financial.deductible),
                    remaining: usd(d.financial.deductibleRemaining),
                    remainingPct: pct(d.financial.deductibleRemaining, d.financial.deductible),
                  },
                  {
                    label: 'Family',
                    sublabel: 'Calendar Year',
                    amount: usd(d.financial.deductible * 2.5),
                    remaining: usd(d.financial.deductibleRemaining * 1.5),
                    remainingPct: pct(
                      d.financial.deductibleRemaining * 1.5,
                      d.financial.deductible * 2.5
                    ),
                    barTone: 'amber',
                  },
                ]}
              />
              <PverifyFinancialPanel
                title="Deductible"
                network="out"
                providerMode={providerMode}
                ui={ui}
                lines={[
                  {
                    label: 'Individual',
                    sublabel: 'Calendar Year',
                    amount: usd(d.financial.deductible * 2),
                    remaining: usd(d.financial.deductibleRemaining * 2),
                    remainingPct: pct(
                      d.financial.deductibleRemaining * 2,
                      d.financial.deductible * 2
                    ),
                  },
                  {
                    label: 'Family',
                    sublabel: 'Calendar Year',
                    amount: usd(d.financial.deductible * 5),
                    remaining: usd(d.financial.deductibleRemaining * 4),
                    remainingPct: pct(
                      d.financial.deductibleRemaining * 4,
                      d.financial.deductible * 5
                    ),
                  },
                ]}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={ui.sectionTitleStyle}
            >
              Out-of-Pocket Maximum
              <span className="h-px flex-1" style={ui.dividerStyle} />
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <PverifyFinancialPanel
                title="Out-of-Pocket"
                network="in"
                providerMode={providerMode}
                ui={ui}
                lines={[
                  {
                    label: 'Individual',
                    sublabel: 'Includes Med & RX',
                    amount: usd(d.financial.outOfPocketMax),
                    remaining: usd(d.financial.outOfPocketRemaining),
                    remainingPct: pct(
                      d.financial.outOfPocketRemaining,
                      d.financial.outOfPocketMax
                    ),
                  },
                  {
                    label: 'Family',
                    sublabel: 'Includes Med & RX',
                    amount: usd(d.financial.outOfPocketMax * 2),
                    remaining: usd(d.financial.outOfPocketRemaining),
                    remainingPct: pct(
                      d.financial.outOfPocketRemaining,
                      d.financial.outOfPocketMax * 2
                    ),
                    barTone: 'amber',
                  },
                ]}
              />
              <PverifyFinancialPanel
                title="Out-of-Pocket"
                network="out"
                providerMode={providerMode}
                ui={ui}
                lines={[
                  {
                    label: 'Individual',
                    sublabel: 'Includes Med & RX',
                    amount: usd(d.financial.outOfPocketMax * 2),
                    remaining: usd(d.financial.outOfPocketRemaining * 2),
                    remainingPct: pct(
                      d.financial.outOfPocketRemaining * 2,
                      d.financial.outOfPocketMax * 2
                    ),
                  },
                  {
                    label: 'Family',
                    sublabel: 'Includes Med & RX',
                    amount: usd(d.financial.outOfPocketMax * 4),
                    remaining: usd(d.financial.outOfPocketRemaining * 3),
                    remainingPct: pct(
                      d.financial.outOfPocketRemaining * 3,
                      d.financial.outOfPocketMax * 4
                    ),
                  },
                ]}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={ui.sectionTitleStyle}
            >
              Benefits
              <span className="h-px flex-1" style={ui.dividerStyle} />
            </h2>
            <div
              className={providerMode ? ui.nestedCardClass : 'rounded-xl border border-slate-700/80 bg-[#1a2440] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'}
              style={providerMode ? ui.nestedCardStyle : undefined}
            >
              <div
                className={providerMode ? 'flex items-center justify-between border-b px-4 py-3' : 'flex items-center justify-between border-b border-slate-700 bg-[#1f2945] px-4 py-3'}
                style={providerMode ? ui.cardHeaderStyle : undefined}
              >
                <p className="text-sm font-semibold" style={ui.valueStyle}>
                  Durable Medical Equipment Purchase
                </p>
                <span className="text-xs uppercase tracking-wide" style={ui.mutedStyle}>
                  STC 12
                </span>
              </div>
              <div className="grid gap-0 sm:grid-cols-2">
                {d.dme.rows.slice(0, 4).map((row, idx) => (
                  <div
                    key={`${row.label}-${idx}`}
                    className={
                      providerMode
                        ? ui.gridCellClass
                        : 'border-b border-r border-slate-700 p-4 sm:[&:nth-child(2n)]:border-r-0'
                    }
                    style={providerMode ? ui.gridCellStyle : undefined}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={ui.labelStyle}>
                      {row.label}
                    </p>
                    <p className="mt-2 text-xl font-bold" style={ui.valueStyle}>
                      {row.value}
                    </p>
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

          {providerMode ? (
            <EligibilityBenefitServiceChatSection
              providerMode
              coordinateOnly
              cptOptionPrefix={CPT_OPTION_PREFIX}
              coordinateRadioName="coordinate-provider-pverify"
              isBenefitChatOpen={false}
              isCoordinateModalOpen={isCoordinateModalOpen}
              benefitChatMessages={[]}
              benefitServiceSuggestions={[]}
              benefitChatDraft={benefitChatDraft}
              onBenefitChatDraftChange={setBenefitChatDraft}
              selectedProcedureCpts={[]}
              selectedServiceCodes={[]}
              coordFirstName={coordFirstName}
              coordStep={coordStep}
              coordSearchError={coordSearchError}
              coordRows={coordRows}
              selectedCoordRowKey={selectedCoordRowKey}
              onResetBenefitChat={() => setIsCoordinateModalOpen(false)}
              onOpenBenefitChat={() => undefined}
              onDismissCoordinate={() => setIsCoordinateModalOpen(false)}
              onOpenCoordinate={() => openCoordinateModal()}
              onBenefitServiceSelect={() => undefined}
              onSubmitBenefitQuestion={() => undefined}
              onCoordFirstName={setCoordFirstName}
              onCoordLastName={setCoordLastName}
              onCoordStep={setCoordStep}
              onCoordSearchError={setCoordSearchError}
              onClearBenefitChatDraft={() => setBenefitChatDraft('')}
              onSelectCoordRow={setSelectedCoordRowKey}
              onRunCoordinateSearch={runCoordinateSearch}
              onProceedCoordinate={() => void proceedCoordinateRequest()}
            />
          ) : (
            <section className="rounded-2xl border border-slate-700/80 bg-[#161f35] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="space-y-3">
                <div className="max-w-2xl rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-200">
                  Would you like us to coordinate your prescription request?
                </div>
                <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
                  <p className="text-xs text-slate-300">Choose one option to continue</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCoordinateModalOpen(false)}>
                      Not now
                    </Button>
                    <Button type="button" variant="primary" onClick={() => openCoordinateModal()}>
                      Coordinate Prescription Request
                    </Button>
                  </div>
                </div>
                {isCoordinateModalOpen && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">
                        {coordStep === 'first' && 'Enter provider first name.'}
                        {coordStep === 'last' && 'Enter provider last name.'}
                        {coordStep === 'results' && 'Select one provider address and proceed.'}
                      </div>
                      {coordSearchError ? <p className="text-sm text-rose-300">{coordSearchError}</p> : null}
                      {coordRows.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-slate-700">
                          <table className="w-full min-w-[900px] text-left text-xs sm:text-sm">
                            <thead className="bg-slate-800/80">
                              <tr>
                                <th className="px-3 py-2 text-xs uppercase tracking-wide text-slate-300">Select</th>
                                <th className="px-3 py-2 text-xs uppercase tracking-wide text-slate-300">Provider</th>
                                <th className="px-3 py-2 text-xs uppercase tracking-wide text-slate-300">NPI</th>
                                <th className="px-3 py-2 text-xs uppercase tracking-wide text-slate-300">Address</th>
                                <th className="px-3 py-2 text-xs uppercase tracking-wide text-slate-300">Phone</th>
                                <th className="px-3 py-2 text-xs uppercase tracking-wide text-slate-300">Fax</th>
                              </tr>
                            </thead>
                            <tbody>
                              {coordRows.map((row) => (
                                <tr key={row.rowKey} className="border-t border-slate-800">
                                  <td className="px-3 py-2">
                                    <input
                                      type="radio"
                                      name="coordinate-provider-pverify"
                                      checked={selectedCoordRowKey === row.rowKey}
                                      onChange={() => setSelectedCoordRowKey(row.rowKey)}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-slate-200">{row.name || '—'}</td>
                                  <td className="px-3 py-2 text-slate-200">{row.npi || '—'}</td>
                                  <td className="px-3 py-2 text-slate-200">{row.address || '—'}</td>
                                  <td className="px-3 py-2 text-slate-200">{row.phone || '—'}</td>
                                  <td className="px-3 py-2 text-slate-200">{row.fax || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-600 bg-slate-950/80 px-3 py-2">
                        <input
                          type="text"
                          value={benefitChatDraft}
                          onChange={(e) => setBenefitChatDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return
                            const value = benefitChatDraft.trim()
                            if (!value) return
                            if (coordStep === 'first') {
                              setCoordFirstName(value)
                              setCoordStep('last')
                              setCoordSearchError('')
                              setBenefitChatDraft('')
                              return
                            }
                            if (coordStep === 'last') {
                              setCoordLastName(value)
                              setCoordStep('results')
                              setCoordSearchError('')
                              setBenefitChatDraft('')
                              void runCoordinateSearch(coordFirstName, value)
                            }
                          }}
                          placeholder={
                            coordStep === 'first'
                              ? 'Type provider first name'
                              : coordStep === 'last'
                                ? 'Type provider last name'
                                : 'Type search again to re-run lookup'
                          }
                          className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const value = benefitChatDraft.trim()
                            if (!value) return
                            if (coordStep === 'first') {
                              setCoordFirstName(value)
                              setCoordStep('last')
                              setCoordSearchError('')
                              setBenefitChatDraft('')
                              return
                            }
                            if (coordStep === 'last') {
                              setCoordLastName(value)
                              setCoordStep('results')
                              setCoordSearchError('')
                              setBenefitChatDraft('')
                              void runCoordinateSearch(coordFirstName, value)
                              return
                            }
                            if (coordStep === 'results' && value.toLowerCase() === 'search again') {
                              void runCoordinateSearch()
                              setBenefitChatDraft('')
                            }
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => void proceedCoordinateRequest()}
                          disabled={!selectedCoordRowKey}
                        >
                          Proceed
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {toast ? <Toast message={toast} type="info" isVisible={Boolean(toast)} onClose={() => setToast('')} /> : null}
        </div>
      </EligibilityAiFlowShell>
    )
  }
  async function handleDownloadPdf() {
    if (!raw) return
    setPdfLoading(true)
    try {
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
          (typeof raw.RequestID === 'number' ? raw.RequestID : undefined)
        if (rid == null) {
          throw new Error('No Request ID found for PDF download.')
        }
        setToast(`Downloading pVerify PDF for Request ID: ${rid}`)
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
      setToast('PDF downloaded successfully.')
    } catch (error) {
      const rid =
        state?.apiMeta?.requestId ??
        (typeof raw.RequestID === 'number' ? raw.RequestID : undefined)
      setToast(
        error instanceof Error
          ? rid != null
            ? `${error.message} (Request ID: ${rid})`
            : error.message
          : 'PDF download failed.'
      )
    } finally {
      setPdfLoading(false)
    }
  }

  function openCoordinateModal() {
    setIsCoordinateModalOpen(true)
    setCoordStep('first')
    setCoordFirstName('')
    setCoordLastName('')
    setCoordRows([])
    setCoordSearchError('')
    setSelectedCoordRowKey('')
  }

  async function runCoordinateSearch(firstName?: string, lastName?: string) {
    const first = (firstName ?? coordFirstName).trim()
    const last = (lastName ?? coordLastName).trim()
    if (!first || !last) {
      setCoordSearchError('Enter both first name and last name to search.')
      return
    }
    setCoordSearchError('')
    setSelectedCoordRowKey('')
    try {
      const docs = await searchProviders(`${first} ${last}`)
      const rows = docs.flatMap((doc) => getNppesProviderTableRows(doc))
      setCoordRows(rows)
      if (rows.length === 0) {
        setCoordSearchError('No providers found for this name.')
      }
    } catch (e) {
      setCoordRows([])
      setCoordSearchError(e instanceof Error ? e.message : 'NPI search failed.')
    } finally {
      // no-op
    }
  }

  async function proceedCoordinateRequest() {
    if (!selectedCoordRowKey) {
      setCoordSearchError('Select one provider address to proceed.')
      return
    }
    const selected = coordRows.find((row) => row.rowKey === selectedCoordRowKey)
    if (!selected) {
      setCoordSearchError('Selected provider address is not available.')
      return
    }
    setIsCoordinateModalOpen(false)
    await Swal.fire({
      icon: 'success',
      title: 'Prescription request coordinated',
      text: 'Prescription request will be sent top your provider',
      confirmButtonText: 'OK',
      background: '#0f172a',
      color: '#e2e8f0',
      confirmButtonColor: '#7c3aed',
      backdrop: 'rgba(2, 6, 23, 0.75)',
    })
  }

  return (
    <EligibilityAiFlowShell providerMode={providerMode} pageMinHeightClass={pageMinHeightClass}>
      <div className="mx-auto max-w-6xl space-y-5">
        {providerMode ? (
          <ProviderEligibilityPageHeader
            description="Review coverage, deductibles, and benefit details from the eligibility response."
            actions={
              <>
                <Button type="button" variant="outline" onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {pdfLoading ? 'Downloading...' : 'Download PDF'}
                  </span>
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(intakeRoute)}>
                  <span className="inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    New Check
                  </span>
                </Button>
              </>
            }
          />
        ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-indigo-400/30 bg-indigo-500/20 text-sm">💬</div>
            <div>
              <h1 className="text-base font-semibold text-slate-100">AI Eligibility Intake</h1>
              <p className="text-xs text-slate-400">Eligibility check · {d.checkDateDisplay || '—'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                {pdfLoading ? 'Downloading...' : 'Download PDF'}
              </span>
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(intakeRoute)}>
              <span className="inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" />New Check</span>
            </Button>
          </div>
        </div>
        )}

        <section className={ui.cardClass} style={ui.cardStyle}>
          <EligibilityMemberHero
            providerMode={providerMode}
            ui={ui}
            borderColor={theme.colors.border}
            statusEligible={d.statusEligible}
            patientName={d.patientName || '—'}
            payor={d.payor || '—'}
            planName={d.planName}
          />
          <div
            className={`grid sm:grid-cols-3 lg:grid-cols-5 ${
              providerMode ? 'mt-5 grid-cols-2 gap-4' : 'mt-5 grid-cols-2 gap-4 border-t pt-5'
            }`}
            style={
              providerMode
                ? undefined
                : { borderColor: 'rgba(71, 85, 105, 0.5)' }
            }
          >
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.11em]" style={ui.labelStyle}>
                Member ID
              </p>
              <p className="mt-1 text-[15px]" style={ui.valueStyle}>
                {d.patientId || family.memberId}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.11em]" style={ui.labelStyle}>
                Date of Birth
              </p>
              <p className="mt-1 text-[15px]" style={ui.valueStyle}>
                {dobDisplay}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.11em]" style={ui.labelStyle}>
                Group
              </p>
              <p className="mt-1 text-[15px]" style={ui.valueStyle}>
                {d.groupNumber || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.11em]" style={ui.labelStyle}>
                Plan Effective
              </p>
              <p className="mt-1 text-[15px]" style={ui.valueStyle}>
                {d.effectiveDateDisplay || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.11em]" style={ui.labelStyle}>
                Provider
              </p>
              <p className="mt-1 text-[15px]" style={ui.valueStyle}>
                Health Lynk Medical Group
              </p>
            </div>
          </div>
        </section>

        <>
            <section className="py-1">
              <div className="mb-4 flex items-center gap-3 pb-2">
                <h2
                  className="text-[11px] font-medium uppercase tracking-[0.15em]"
                  style={ui.sectionTitleStyle}
                >
                  Deductibles & Out-of-Pocket
                </h2>
                <div className="h-px flex-1" style={ui.dividerStyle} />
              </div>
              <div
                className={`grid sm:grid-cols-2 lg:grid-cols-4 ${providerMode ? 'gap-4' : 'gap-3'}`}
              >
                {deductibleCards.map((card, idx) => (
                  <div
                    key={`${card.title}-${idx}`}
                    className={ui.deductibleCardClass}
                    style={ui.deductibleCardStyle}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-[2px] ${
                        card.tone === 'red'
                          ? 'bg-rose-400/80'
                          : card.tone === 'purple'
                            ? 'bg-indigo-400/80'
                            : 'bg-cyan-400/80'
                      }`}
                    />
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={ui.labelStyle}>
                      {card.title}
                    </p>
                    <p
                      className={`mt-1 text-[38px] font-bold leading-[1] ${
                        card.tone === 'red'
                          ? ui.amountOutOfNetwork
                          : card.tone === 'purple'
                            ? 'text-indigo-600'
                            : ui.amountInNetwork
                      }`}
                    >
                      {fmtCurrency(card.amount)}
                    </p>
                    <p className="mt-1 text-[11px]" style={ui.mutedStyle}>
                      {card.sub}
                    </p>
                    <p className="mt-2 text-[12px]" style={ui.labelStyle}>
                      Remaining:{' '}
                      <span className={ui.remainingAmount}>
                        {fmtCurrency2(card.remaining)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <EligibilityBenefitsCoverageSection
              showBenefitDetails={showBenefitDetails}
              serviceCodeCoverageResults={serviceCodeCoverageResults}
              providerMode={providerMode}
            />

            <EligibilityBenefitServiceChatSection
              providerMode={providerMode}
              cptOptionPrefix={CPT_OPTION_PREFIX}
              coordinateRadioName="coordinate-provider"
              isBenefitChatOpen={isBenefitChatOpen}
              isCoordinateModalOpen={isCoordinateModalOpen}
              benefitChatMessages={benefitChatMessages}
              benefitServiceSuggestions={benefitServiceSuggestions}
              benefitChatDraft={benefitChatDraft}
              onBenefitChatDraftChange={setBenefitChatDraft}
              selectedProcedureCpts={selectedProcedureCpts}
              selectedServiceCodes={selectedServiceCodes}
              coordFirstName={coordFirstName}
              coordStep={coordStep}
              coordSearchError={coordSearchError}
              coordRows={coordRows}
              selectedCoordRowKey={selectedCoordRowKey}
              onResetBenefitChat={() => {
                setShowBenefitDetails(false)
                setBenefitServiceSuggestions([])
                setBenefitChatMessages([])
                setIsBenefitChatOpen(false)
                setIsCoordinateModalOpen(false)
                setSelectedProcedureCpts([])
                setCptBenefitChatOptions([])
                setCptOptionDetailsByValue({})
              }}
              onOpenBenefitChat={() => {
                setIsBenefitChatOpen(true)
                setIsCoordinateModalOpen(false)
                setBenefitServiceSuggestions([])
                setSelectedProcedureCpts([])
                void loadCptServicesForBenefitChat()
                if (benefitChatMessages.length === 0) {
                  setBenefitChatMessages([
                    {
                      role: 'assistant',
                      text: 'Search by service name, service code, category, or description—or type "All" to show your full configured service list.',
                    },
                  ])
                }
              }}
              onDismissCoordinate={() => {
                setIsBenefitChatOpen(false)
                setIsCoordinateModalOpen(false)
              }}
              onOpenCoordinate={() => {
                openCoordinateModal()
                setIsBenefitChatOpen(false)
              }}
              onBenefitServiceSelect={handleBenefitServiceSelect}
              onSubmitBenefitQuestion={submitBenefitChatQuestion}
              onCoordFirstName={setCoordFirstName}
              onCoordLastName={setCoordLastName}
              onCoordStep={setCoordStep}
              onCoordSearchError={setCoordSearchError}
              onClearBenefitChatDraft={() => setBenefitChatDraft('')}
              onSelectCoordRow={setSelectedCoordRowKey}
              onRunCoordinateSearch={runCoordinateSearch}
              onProceedCoordinate={() => void proceedCoordinateRequest()}
            />

        </>
      </div>
      <Toast message={toast} type="info" isVisible={Boolean(toast)} onClose={() => setToast('')} />
    </EligibilityAiFlowShell>
  )
}
