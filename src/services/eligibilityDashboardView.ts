/**
 * Maps pVerify EligibilitySummary `rawResponse` + intake context into the Eligibility Result dashboard UI.
 */

import type { TimelineItem } from '../data/eligibilityResultData'

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

function parseMoney(v: unknown): number {
  if (v == null) return 0
  const s = String(v).replace(/[^0-9.-]/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function moneyFromNested(parent: Record<string, unknown> | null, key: string): number {
  if (!parent) return 0
  const block = asRecord(parent[key])
  if (!block) return 0
  return parseMoney(block.Value)
}

/** Scalar or `{ Value }` money field (pVerify / payer JSON shapes differ). */
function moneyFromScalarOrNested(
  parent: Record<string, unknown> | null,
  key: string
): number {
  if (!parent) return 0
  const raw = parent[key]
  if (raw != null && typeof raw !== 'object') return parseMoney(raw)
  return moneyFromNested(parent, key)
}

/** First matching field with value > 0 (field names vary by payer). */
function firstPositiveMoneyField(
  parent: Record<string, unknown> | null,
  keys: string[]
): number {
  if (!parent) return 0
  for (const key of keys) {
    const n = moneyFromScalarOrNested(parent, key)
    if (n > 0) return n
  }
  return 0
}

function formatMoneyField(v: unknown): string {
  if (v == null || v === '') return '—'
  const s = String(v).trim()
  if (s.includes('%')) return s
  const n = parseMoney(s)
  if (n === 0 && !/0/.test(s)) return s
  return s.startsWith('$') ? s : `$${n.toFixed(2)}`
}

export function pverifyDateToDisplay(d: string | null | undefined): string {
  if (!d?.trim()) return '—'
  const parts = d.split('/')
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts
    const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    const dt = new Date(`${iso}T12:00:00`)
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }
  return d.trim()
}

function findMemberId(subscriber: Record<string, unknown> | null): string {
  const idents = subscriber?.Identification
  if (!Array.isArray(idents)) return '—'
  for (const item of idents) {
    const row = asRecord(item)
    if (row && String(row.Type) === 'Member ID' && row.Code != null) {
      return String(row.Code)
    }
  }
  return '—'
}

export type IntakeContextForDashboard = {
  patientName: string
  cptHcpcCode: string
  serviceDateFrom: string
  serviceDateTo: string
}

export type EligibilityDmeRow = {
  label: string
  value: string
}

export type EligibilityDashboardView = {
  patientName: string
  patientId: string
  groupNumber: string
  payor: string
  planName: string
  serviceCode: string
  serviceDate: string
  checkDateDisplay: string
  statusEligible: boolean
  coverageActive: boolean
  planType: string
  networkInNetwork: boolean
  effectiveDateDisplay: string
  /** pVerify `DMESummary` surfaced as label/value rows for the DME card */
  dme: {
    sourcePresent: boolean
    rows: EligibilityDmeRow[]
  }
  financial: {
    copay: number
    /** Annual / plan copay balance remaining when returned by payer (DMESummary). */
    copayRemaining: number
    deductible: number
    deductibleRemaining: number
    outOfPocketMax: number
    outOfPocketRemaining: number
    coinsurance: string
    /** Secondary line when in-network and out-of-network coinsurance differ. */
    coinsuranceSubline?: string
  }
  authorization: {
    required: boolean
    status: 'approved' | 'pending' | 'denied' | 'not-required'
    priorAuthNumber?: string
    submittedDate?: string
  }
  warnings: Array<{ message: string; severity: 'high' | 'medium' }>
  timeline: TimelineItem[]
}

const DME_FIELD_LABELS: Record<string, string> = {
  ServiceCoveredInNet: 'DME covered (in-network)',
  ServiceCoveredOutNet: 'DME covered (out-of-network)',
  CoPayInNet: 'DME copay (in-network)',
  CoPayOutNet: 'DME copay (out-of-network)',
  CoInsInNet: 'DME coinsurance (in-network)',
  CoInsOutNet: 'DME coinsurance (out-of-network)',
  CoPayRemainingInNet: 'DME copay remaining (in-network)',
  CopayRemainingInNet: 'DME copay remaining (in-network)',
  CoPay_RemainingInNet: 'DME copay remaining (in-network)',
  BenefitDescription: 'Benefit description',
  ServiceDescription: 'Service description',
  AuthorizationInfo: 'Authorization information',
  QuantityLimit: 'Quantity limit',
  VisitLimit: 'Visit limit',
  PurchasePriceCap: 'Purchase price cap',
  RentalCap: 'Rental cap',
}

const DME_KEY_ORDER = [
  'ServiceCoveredInNet',
  'ServiceCoveredOutNet',
  'CoPayInNet',
  'CoPayOutNet',
  'CoPayRemainingInNet',
  'CopayRemainingInNet',
  'CoPay_RemainingInNet',
  'CoInsInNet',
  'CoInsOutNet',
  'BenefitDescription',
  'ServiceDescription',
  'AuthorizationInfo',
  'QuantityLimit',
  'VisitLimit',
  'PurchasePriceCap',
  'RentalCap',
] as const

function dmeValueLooksMoney(key: string): boolean {
  return /copay|deductible|oop|amount|balance|remaining|limit|cap|fund|price|rental/i.test(
    key
  )
}

function formatDmeCell(key: string, raw: unknown): string {
  if (raw == null || raw === '') return '—'
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  const nested = asRecord(raw)
  if (nested && 'Value' in nested) {
    const inner = nested.Value
    if (dmeValueLooksMoney(key)) return formatMoneyField(inner)
    if (inner == null || inner === '') return '—'
    const s = String(inner).trim()
    return s || '—'
  }
  if (typeof raw === 'number') {
    return dmeValueLooksMoney(key) ? formatMoneyField(raw) : String(raw)
  }
  const s = String(raw).trim()
  if (!s) return '—'
  if (
    dmeValueLooksMoney(key) &&
    /^[\d$.,\s%-]+$/.test(s) &&
    /[\d.]/.test(s)
  ) {
    return formatMoneyField(raw)
  }
  const u = s.toUpperCase()
  if (u === 'YES' || u === 'NO') {
    return u === 'YES' ? 'Yes' : 'No'
  }
  return s
}

function humanizeDmeKey(key: string): string {
  return DME_FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim()
}

function isSimpleDmeLeaf(raw: unknown): boolean {
  if (raw == null) return false
  if (
    typeof raw === 'string' ||
    typeof raw === 'number' ||
    typeof raw === 'boolean'
  ) {
    return true
  }
  const o = asRecord(raw)
  return Boolean(o && 'Value' in o)
}

function buildDmeSection(
  dme: Record<string, unknown> | null,
  sourcePresent: boolean
): EligibilityDashboardView['dme'] {
  if (!sourcePresent || !dme) {
    return { sourcePresent, rows: [] }
  }
  const seen = new Set<string>()
  const rows: EligibilityDmeRow[] = []

  for (const key of DME_KEY_ORDER) {
    if (!(key in dme)) continue
    const value = formatDmeCell(key, dme[key])
    if (value === '—') continue
    rows.push({
      label: DME_FIELD_LABELS[key] ?? humanizeDmeKey(key),
      value,
    })
    seen.add(key)
  }

  for (const key of Object.keys(dme).sort()) {
    if (seen.has(key)) continue
    if (!isSimpleDmeLeaf(dme[key])) continue
    const value = formatDmeCell(key, dme[key])
    if (value === '—') continue
    rows.push({ label: humanizeDmeKey(key), value })
  }

  return { sourcePresent: true, rows }
}

function pushWarningUnique(
  list: EligibilityDashboardView['warnings'],
  severity: 'high' | 'medium',
  message: unknown
) {
  const t = message != null ? String(message).trim() : ''
  if (!t) return
  if (list.some((w) => w.message === t)) return
  list.push({ severity, message: t })
}

export function buildEligibilityDashboardView(
  raw: Record<string, unknown>,
  intake: IntakeContextForDashboard
): EligibilityDashboardView {
  const demo = asRecord(raw.DemographicInfo)
  const sub = demo ? asRecord(demo.Subscriber) : null
  const fullName =
    sub?.FullName != null
      ? String(sub.FullName)
      : [sub?.Firstname, sub?.Lastname_R].filter(Boolean).join(' ').trim()

  const patientName =
    intake.patientName.trim() || fullName || 'Patient'

  const memberId = findMemberId(sub)
  const plan = asRecord(raw.PlanCoverageSummary)
  const hbpc = asRecord(raw.HBPC_Deductible_OOP_Summary)
  const dmeRaw = raw.DMESummary
  const dmeSourcePresent =
    dmeRaw != null &&
    typeof dmeRaw === 'object' &&
    !Array.isArray(dmeRaw)
  const dme = dmeSourcePresent ? asRecord(dmeRaw) : null

  const planStatus = plan?.Status != null ? String(plan.Status) : ''
  const processedError = raw.ProcessedWithError === true
  const apiOk = String(raw.APIResponseCode ?? '') === '0'
  const activeCoverage =
    !processedError && apiOk && planStatus.toLowerCase() === 'active'

  const statusEligible = activeCoverage

  const inNet = String(dme?.ServiceCoveredInNet ?? '').toUpperCase() === 'YES'
  const outNet = String(dme?.ServiceCoveredOutNet ?? '').toUpperCase() === 'YES'
  const networkInNetwork = inNet || (!inNet && !outNet)

  const priorRequired = raw.IsPriorAuthRequired === true

  const copay = moneyFromNested(dme, 'CoPayInNet')
  const copayRem = firstPositiveMoneyField(dme, [
    'CoPayRemainingInNet',
    'CopayRemainingInNet',
    'CoPay_RemainingInNet',
  ])
  const deductible = moneyFromNested(hbpc, 'IndividualDeductibleInNet')
  const deductibleRem = moneyFromNested(hbpc, 'IndividualDeductibleRemainingInNet')
  const oopMax = moneyFromNested(hbpc, 'IndividualOOP_InNet')
  const oopRem = moneyFromNested(hbpc, 'IndividualOOPRemainingInNet')
  const coinsuranceStr = formatMoneyField(
    asRecord(dme?.CoInsInNet as unknown)?.Value ?? dme?.CoInsInNet
  )
  const coinsuranceOutStr = formatMoneyField(
    asRecord(dme?.CoInsOutNet as unknown)?.Value ?? dme?.CoInsOutNet
  )
  const coinsuranceSubline =
    coinsuranceOutStr !== '—' &&
    coinsuranceOutStr.trim() !== '' &&
    coinsuranceOutStr !== coinsuranceStr
      ? `Out-of-network ${coinsuranceOutStr}`
      : undefined

  const serviceDate =
    raw.DOS != null && String(raw.DOS).trim()
      ? String(raw.DOS).trim()
      : intake.serviceDateFrom && intake.serviceDateTo
        ? intake.serviceDateFrom === intake.serviceDateTo
          ? intake.serviceDateFrom
          : `${intake.serviceDateFrom} – ${intake.serviceDateTo}`
        : '—'

  const eff = plan?.EffectiveDate != null ? String(plan.EffectiveDate) : ''
  const effectiveDateDisplay = pverifyDateToDisplay(eff)

  /** Hard errors only — omit payer informational notes (ExceptionNotes, FollowUpAction, etc.). */
  const warnings: EligibilityDashboardView['warnings'] = []

  pushWarningUnique(warnings, 'high', raw.EDIErrorMessage)
  pushWarningUnique(warnings, 'high', raw.ErrorDescription)
  if (raw.RecursiveProcessedWithError === true) {
    pushWarningUnique(warnings, 'high', raw.RecursiveAPIResponseMessage)
  }

  const reqId = raw.RequestID
  const rid = typeof reqId === 'number' ? reqId : Date.now()

  const timeline: TimelineItem[] = [
    {
      id: String(rid),
      date: new Date().toISOString(),
      status: statusEligible ? 'eligible' : 'not-eligible',
      action: 'Eligibility Check Performed',
      performedBy: 'pVerify',
      details:
        raw.APIResponseMessage != null
          ? String(raw.APIResponseMessage)
          : 'Real-time eligibility verification completed',
      result: statusEligible ? 'Eligible' : 'Review required',
    },
  ]

  const serviceCodeDisplay = intake.cptHcpcCode.trim() || '—'

  if (priorRequired) {
    timeline.push({
      id: `${rid}-pa`,
      date: new Date().toISOString(),
      status: 'pending',
      action: 'Prior Authorization',
      performedBy: '—',
      details: `Prior authorization may be required for service code ${
        serviceCodeDisplay !== '—' ? serviceCodeDisplay : 'selected'
      }.`,
      result: 'Pending Review',
    })
  }

  return {
    patientName,
    patientId: memberId,
    groupNumber: plan?.GroupNumber != null ? String(plan.GroupNumber) : '—',
    payor: raw.PayerName != null ? String(raw.PayerName) : '—',
    planName: plan?.PlanName != null ? String(plan.PlanName) : '—',
    serviceCode: serviceCodeDisplay,
    serviceDate,
    checkDateDisplay: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    statusEligible,
    coverageActive: activeCoverage,
    planType: plan?.PolicyType != null ? String(plan.PolicyType) : '—',
    networkInNetwork,
    effectiveDateDisplay,
    dme: buildDmeSection(dme, dmeSourcePresent),
    financial: {
      copay,
      copayRemaining: copayRem,
      deductible,
      deductibleRemaining: deductibleRem,
      outOfPocketMax: oopMax,
      outOfPocketRemaining: oopRem,
      coinsurance:
        coinsuranceStr === '—' && dme ? 'See plan' : coinsuranceStr,
      coinsuranceSubline,
    },
    authorization: priorRequired
      ? {
          required: true,
          status: 'pending',
          priorAuthNumber: undefined,
          submittedDate: undefined,
        }
      : { required: false, status: 'not-required' },
    warnings,
    timeline,
  }
}
