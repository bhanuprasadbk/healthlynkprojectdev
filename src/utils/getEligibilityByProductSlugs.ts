import { findServiceTypeCodeName } from '../data/serviceTypeCodes'

/** X12 service type code → human-readable label (DME-focused subset). */
export const SERVICE_LABELS: Record<string, string> = {
  '11': 'Used durable medical equipment',
  '12': 'DME purchase',
  '18': 'DME rental',
}

export function serviceTypeLabel(code: string): string {
  return SERVICE_LABELS[code] ?? findServiceTypeCodeName(code)
}

/** Matched row from Stedi 271 `benefitsInformation[]`. */
export type EligibilityBenefitDetail = Record<string, unknown>

export interface EligibilityServiceResult {
  serviceCode: string
  serviceType: string
  coveredInNet?: string
  coveredOutNet?: string
  coPayInNet?: string
  coPayOutNet?: string
  coInsInNet?: string
  coInsOutNet?: string
  description?: string
  deductible?: string
  deductibleRemaining?: string
  oop?: string
  oopRemaining?: string
  hasError: boolean
  errorCode?: string
  benefits?: EligibilityBenefitDetail[]
}

const DME_SERVICE_CODES = new Set(['11', '12', '18'])

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function nestedValue(field: unknown): string | undefined {
  if (field == null) return undefined
  const obj = asRecord(field)
  if (obj && 'Value' in obj) {
    const v = obj.Value
    return v != null && String(v).trim() !== '' ? String(v) : undefined
  }
  const s = String(field).trim()
  return s !== '' ? s : undefined
}

function benefitsInformationRoot(rawData: Record<string, unknown>): unknown[] {
  const top = asArray(rawData.benefitsInformation)
  if (top.length > 0) return top
  const stediRaw = asRecord(rawData.StediRawResponse)
  return stediRaw ? asArray(stediRaw.benefitsInformation) : []
}

function benefitMatchesServiceCode(row: Record<string, unknown>, code: string): boolean {
  return asArray(row.serviceTypeCodes)
    .map((v) => String(v).trim())
    .filter(Boolean)
    .includes(code)
}

function networkCode(row: Record<string, unknown>): string {
  return String(row.inPlanNetworkIndicatorCode ?? row.inPlanNetworkIndicator ?? '')
    .trim()
    .toUpperCase()
}

function formatPercent(raw: unknown): string | undefined {
  if (raw == null || String(raw).trim() === '') return undefined
  const n = Number.parseFloat(String(raw))
  if (!Number.isFinite(n)) return String(raw).trim()
  if (n > 0 && n <= 1) return `${Math.round(n * 100)}%`
  return `${Math.round(n)}%`
}

function formatMoney(raw: unknown): string | undefined {
  const s = nestedValue(raw) ?? (raw != null ? String(raw).trim() : '')
  if (!s) return undefined
  if (s.includes('%')) return s
  const n = Number.parseFloat(s.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(n)) return s
  return `$${n.toFixed(2)}`
}

function yesNoFromCoverage(row: Record<string, unknown> | null): string | undefined {
  if (!row) return undefined
  const name = String(row.name ?? row.status ?? '').toLowerCase()
  if (name.includes('inactive') || name.includes('not covered')) return 'No'
  if (name.includes('active') || String(row.code ?? '') === '1') return 'Yes'
  return undefined
}

function findBenefitRow(
  rows: Record<string, unknown>[],
  benefitCode: string,
  network: 'Y' | 'N'
): Record<string, unknown> | null {
  return (
    rows.find((row) => {
      if (String(row.code ?? '') !== benefitCode) return false
      const net = networkCode(row)
      return net === network || (net === '' && network === 'Y')
    }) ?? null
  )
}

function firstBenefitDescription(rows: Record<string, unknown>[]): string | undefined {
  for (const row of rows) {
    for (const entry of asArray(row.additionalInformation)) {
      const rec = asRecord(entry)
      const text = rec ? String(rec.description ?? '').trim() : ''
      if (text) return text
    }
  }
  return undefined
}

function extractCoverageForServiceCode(
  benefitRows: Record<string, unknown>[],
  serviceCode: string,
  dme: Record<string, unknown> | null
): Pick<
  EligibilityServiceResult,
  | 'coveredInNet'
  | 'coveredOutNet'
  | 'coPayInNet'
  | 'coPayOutNet'
  | 'coInsInNet'
  | 'coInsOutNet'
  | 'description'
> {
  const matched = benefitRows.filter((row) => benefitMatchesServiceCode(row, serviceCode))

  const activeIn = findBenefitRow(matched, '1', 'Y')
  const activeOut = findBenefitRow(matched, '1', 'N')
  const coinsIn = findBenefitRow(matched, 'A', 'Y')
  const coinsOut = findBenefitRow(matched, 'A', 'N')
  const copayIn = findBenefitRow(matched, 'B', 'Y')
  const copayOut = findBenefitRow(matched, 'B', 'N')

  const coveredInNet =
    yesNoFromCoverage(activeIn) ??
    (dme?.ServiceCoveredInNet != null ? String(dme.ServiceCoveredInNet) : undefined)
  const coveredOutNet =
    yesNoFromCoverage(activeOut) ??
    (dme?.ServiceCoveredOutNet != null ? String(dme.ServiceCoveredOutNet) : undefined)

  const coInsInNet =
    formatPercent(coinsIn?.benefitPercent) ?? nestedValue(dme?.CoInsInNet) ?? formatPercent(dme?.CoInsInNet)
  const coInsOutNet =
    formatPercent(coinsOut?.benefitPercent) ??
    nestedValue(dme?.CoInsOutNet) ??
    formatPercent(dme?.CoInsOutNet)
  const coPayInNet = formatMoney(copayIn?.benefitAmount) ?? formatMoney(dme?.CoPayInNet)
  const coPayOutNet = formatMoney(copayOut?.benefitAmount) ?? formatMoney(dme?.CoPayOutNet)

  const description =
    firstBenefitDescription(matched) ??
    nestedValue(dme?.BenefitDescription) ??
    (dme?.BenefitDescription != null ? String(dme.BenefitDescription).trim() : undefined)

  return {
    coveredInNet,
    coveredOutNet,
    coPayInNet,
    coPayOutNet,
    coInsInNet,
    coInsOutNet,
    description: description || undefined,
  }
}

/** X12 service type codes linked to a practice CPT/HCPC catalog row (numeric slugs + code when numeric). */
export function stcCodesFromProcedureLike(input: {
  code: string
  productSlugs: string[]
}): string[] {
  const out = new Set<string>()
  const code = input.code.trim()
  if (/^\d{1,3}$/.test(code)) out.add(code)
  for (const slug of input.productSlugs) {
    const s = String(slug).trim()
    if (/^\d{1,3}$/.test(s)) out.add(s)
  }
  return [...out]
}

/** Service codes sent on the eligibility request (excludes plan-level code 30). */
export function getRequestedServiceTypeCodesFromRaw(rawData: Record<string, unknown>): string[] {
  const codes: string[] = []

  const stediCall = asRecord(rawData.StediApiCall)
  const requestBody = asRecord(stediCall?.requestBody)
  const stediPayload = asRecord(requestBody?.payload) ?? requestBody
  const encounter = asRecord(stediPayload?.encounter)
  for (const v of asArray(encounter?.serviceTypeCodes)) {
    const c = String(v).trim()
    if (c) codes.push(c)
  }

  for (const v of asArray(rawData.ServiceTypeCodes)) {
    const c = String(v).trim()
    if (c) codes.push(c)
  }

  const cpt = String(rawData.cptHcpcCode ?? '').trim()
  if (cpt) {
    for (const part of cpt.split(/[,\s]+/)) {
      const c = part.trim()
      if (/^\d{1,3}$/.test(c)) codes.push(c)
    }
  }

  return [...new Set(codes.filter((c) => c && c !== '30'))]
}

/** Section heading for a service-type coverage card (e.g. DME — DURABLE MEDICAL EQUIPMENT (SERVICE CODE 12)). */
export function serviceCodeSectionTitle(code: string): string {
  const name = findServiceTypeCodeName(code).toUpperCase()
  const prefix = DME_SERVICE_CODES.has(code) ? 'DME — ' : ''
  return `${prefix}${name} (SERVICE CODE ${code})`
}

/**
 * Maps eligibility raw response to per–service-type coverage rows for the requested codes.
 * When `productSlugs` is empty, uses all service codes from the eligibility request.
 */
export function getEligibilityByProductSlugs(
  rawData: Record<string, unknown>,
  productSlugs: string[] = []
): EligibilityServiceResult[] {
  const requestedFromApi = getRequestedServiceTypeCodesFromRaw(rawData)
  const slugSet = new Set(productSlugs.map((s) => String(s).trim()).filter(Boolean))
  const serviceCodes =
    slugSet.size > 0
      ? [...slugSet].filter((code) => requestedFromApi.length === 0 || requestedFromApi.includes(code))
      : requestedFromApi

  const dme = asRecord(rawData.DMESummary)
  const hbpc = asRecord(rawData.HBPC_Deductible_OOP_Summary)

  const deductible = nestedValue(hbpc?.IndividualDeductibleInNet)
  const deductibleRemaining = nestedValue(hbpc?.IndividualDeductibleRemainingInNet)
  const oop = nestedValue(hbpc?.IndividualOOP_InNet)
  const oopRemaining = nestedValue(hbpc?.IndividualOOPRemainingInNet)

  const hasError = rawData.ProcessedWithError === true
  const errorCode =
    rawData.EDIErrorMessage != null && String(rawData.EDIErrorMessage).trim() !== ''
      ? String(rawData.EDIErrorMessage)
      : undefined

  const benefitRows = benefitsInformationRoot(rawData)
    .map((r) => asRecord(r))
    .filter((r): r is Record<string, unknown> => r !== null)

  return serviceCodes.map((serviceCode) => {
    const coverage = extractCoverageForServiceCode(benefitRows, serviceCode, dme)
    const matched = benefitRows.filter((row) => benefitMatchesServiceCode(row, serviceCode))

    const result: EligibilityServiceResult = {
      serviceCode,
      serviceType: serviceTypeLabel(serviceCode),
      ...coverage,
      deductible,
      deductibleRemaining,
      oop,
      oopRemaining,
      hasError,
      errorCode,
    }

    if (matched.length > 0) {
      result.benefits = matched
    }

    return result
  })
}
