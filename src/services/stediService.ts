import type {
  IntakeEligibilityForm,
  PverifyEligibilityBuildOptions,
} from './pverifyEligibilityPayload'
import { providerConfig } from '../data/providerConfig'
import { apiRequest } from './apiClient'

type StediServiceConfig = {
  apiUrl: string
  apiKey: string
}

type IntakeContext = {
  cptHcpcCode: string
  serviceDateFrom: string
  serviceDateTo: string
  patientName: string
}

const STEDI_MAX_SERVICE_TYPE_CODES = 99
export const STEDI_API_DATE = '2024-04-01'

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function parseIsoDate(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return s
  return `${m[2]}/${m[3]}/${m[1]}`
}

function formatYyyyMmDdToMmDdYyyy(raw: string): string {
  const s = raw.trim()
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (!m) return s
  return `${m[2]}/${m[3]}/${m[1]}`
}

function toYyyyMmDdCompact(raw: string): string {
  const s = raw.trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return s.replace(/[^0-9]/g, '')
  return `${m[1]}${m[2]}${m[3]}`
}

type ApiEnvelope<T> = {
  data?: T
  message?: string
  status?: number
}

function readApiData<T>(body: ApiEnvelope<T> | T): T {
  if (body && typeof body === 'object' && 'data' in (body as ApiEnvelope<T>)) {
    return (body as ApiEnvelope<T>).data as T
  }
  return body as T
}

async function parseApiResponseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(`Request failed (${res.status})`)
  }
}

function readApiMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const record = body as Record<string, unknown>
  for (const field of ['message', 'msg', 'error', 'detail']) {
    const value = record[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

function isStediEligibilityPayload(record: Record<string, unknown>): boolean {
  return (
    Array.isArray(record.benefitsInformation) ||
    Array.isArray(record.planStatus) ||
    record.subscriber != null ||
    record.errors != null ||
    record.eligibilitySearchId != null
  )
}

/** Unwraps Stedi 271 payload from integration API shapes (`data.response`, `response`, etc.). */
function unwrapStediEligibilityPayload(parsed: unknown): Record<string, unknown> {
  const record = asRecord(parsed)
  if (!record) return {}

  if (isStediEligibilityPayload(record)) {
    return record
  }

  const fromResponse = asRecord(record.response)
  if (fromResponse && isStediEligibilityPayload(fromResponse)) {
    return fromResponse
  }

  const fromPayload = asRecord(record.payload)
  if (fromPayload && isStediEligibilityPayload(fromPayload)) {
    return fromPayload
  }

  const fromData = asRecord(record.data)
  if (fromData) {
    return unwrapStediEligibilityPayload(fromData)
  }

  return fromResponse ?? fromPayload ?? record
}

export function buildStediEligibilityRequestBody(
  data: IntakeEligibilityForm,
  options: PverifyEligibilityBuildOptions
): Record<string, unknown> {
  const selectedCodes = Array.isArray(data.serviceTypeCodes)
    ? data.serviceTypeCodes
        .map((code) => code.trim())
        .filter((code) => code !== '')
    : []
  const uniqueCodes = [...new Set(selectedCodes)]
  const fallbackCodes = data.cptHcpcCode ? [data.cptHcpcCode] : ['30']
  const serviceTypeCodes = (uniqueCodes.length > 0 ? uniqueCodes : fallbackCodes).slice(
    0,
    STEDI_MAX_SERVICE_TYPE_CODES
  )
  const patientFirst = data.patientFirstName.trim()
  const patientLast = data.patientLastName.trim()
  const subFirst = options.isSubscriberPatient ? patientFirst : data.subscriberFirstName.trim()
  const subLast = options.isSubscriberPatient ? patientLast : data.subscriberLastName.trim()
  const memberId = (data.subscriberID || data.policyNumber).replace(/\s+/g, '').trim()
  const externalPatientId = memberId || 'UNKNOWN_PATIENT'
  const dob = toYyyyMmDdCompact(options.isSubscriberPatient ? data.patientDOB : data.subscriberDOB)
  const tradingPartnerServiceId = data.payerCode.trim()
  return {
    encounter: {
      serviceTypeCodes,
    },
    externalPatientId,
    subscriber: {
      dateOfBirth: dob,
      firstName: subFirst,
      lastName: subLast,
      memberId,
    },
    provider: {
      npi: data.npi || providerConfig.npi,
      organizationName: providerConfig.providerName,
    },
    tradingPartnerServiceId: tradingPartnerServiceId || undefined,
  }
}

function normalizeStediResponse(
  payload: Record<string, unknown>,
  intake: IntakeContext
): Record<string, unknown> {
  const toAmount = (v: unknown): number => {
    if (v == null) return 0
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
  const benefitRows = asArray(payload.benefitsInformation)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
  const hasInactiveBenefitSignal = benefitRows.some((row) => {
    const label = String(row.name ?? row.status ?? '').toLowerCase()
    return /\binactive\b/.test(label) || label.includes('inactive')
  })
  const hasActiveBenefitSignal = benefitRows.some((row) => {
    const label = String(row.name ?? row.status ?? '').toLowerCase()
    return /\bactive\b/.test(label)
  })
  const planStatuses = asArray(payload.planStatus)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
  const hasErrors = asArray(payload.errors).length > 0
  const isActiveStatus = (row: Record<string, unknown>): boolean => {
    const code = String(row.statusCode ?? '').trim()
    const status = String(row.status ?? '').toLowerCase()
    const hasActive = /\bactive\b/.test(status)
    const hasInactive = /\binactive\b/.test(status) || status.includes('inactive')
    // Some Stedi payloads use `statusCode === '1'` even when the plan is inactive.
    // Prefer text signal when available.
    return hasActive || (code === '1' && !hasInactive)
  }
  const active =
    !hasInactiveBenefitSignal &&
    (planStatuses.some(isActiveStatus) || hasActiveBenefitSignal)

  const firstBenefit = (
    code: string,
    coverage: 'IND' | 'FAM',
    timeQualifier: '23' | '29',
    network: 'Y' | 'N'
  ): Record<string, unknown> | null =>
    benefitRows.find((row) => {
      if (String(row.code ?? '') !== code) return false
      if (String(row.coverageLevelCode ?? '') !== coverage) return false
      if (String(row.timeQualifierCode ?? '') !== timeQualifier) return false
      return String(row.inPlanNetworkIndicatorCode ?? '') === network
    }) ?? null

  const firstInNetworkCopay = benefitRows.find(
    (row) =>
      String(row.code ?? '') === 'B' &&
      String(row.inPlanNetworkIndicatorCode ?? '') === 'Y' &&
      String(row.benefitAmount ?? '').trim() !== ''
  )
  const firstInNetworkCoins = benefitRows.find(
    (row) =>
      String(row.code ?? '') === 'A' &&
      String(row.inPlanNetworkIndicatorCode ?? '') === 'Y' &&
      String(row.benefitPercent ?? '').trim() !== ''
  )
  const firstOutNetworkCoins = benefitRows.find(
    (row) =>
      String(row.code ?? '') === 'A' &&
      String(row.inPlanNetworkIndicatorCode ?? '') === 'N' &&
      String(row.benefitPercent ?? '').trim() !== ''
  )
  const dedIndYear = toAmount(firstBenefit('C', 'IND', '23', 'Y')?.benefitAmount)
  const dedIndRemaining = toAmount(firstBenefit('C', 'IND', '29', 'Y')?.benefitAmount)
  const oopIndYear = toAmount(firstBenefit('G', 'IND', '23', 'Y')?.benefitAmount)
  const oopIndRemaining = toAmount(firstBenefit('G', 'IND', '29', 'Y')?.benefitAmount)
  const copayAmount = toAmount(firstInNetworkCopay?.benefitAmount)

  const pctToDisplay = (v: unknown): string => {
    if (v == null || String(v).trim() === '') return '—'
    const n = parseFloat(String(v))
    if (!Number.isFinite(n)) return String(v)
    return `${Math.round(n * 100)}%`
  }

  const planInformation = asRecord(payload.planInformation)
  const planDateInformation = asRecord(payload.planDateInformation)
  const subscriber = asRecord(payload.subscriber)
  const provider = asRecord(payload.provider)
  const payer = asRecord(payload.payer)
  const priorAuthHint = benefitRows
    .flatMap((row) => asArray(row.additionalInformation))
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => String(entry.description ?? '').toLowerCase())
    .some((desc) => desc.includes('precert') || desc.includes('prior auth'))
  const planStatusText =
    planStatuses.find(isActiveStatus)?.status ??
    planStatuses[0]?.status ??
    (active ? 'Active Coverage' : 'Review')
  const planDetails =
    String(planStatuses.find(isActiveStatus)?.planDetails ?? '').trim() ||
    String(planStatuses[0]?.planDetails ?? '').trim() ||
    String(planInformation?.groupDescription ?? '').trim() ||
    '—'
  const insuranceType =
    String(
      benefitRows.find((row) => String(row.code ?? '') === '1')?.insuranceType ?? ''
    ).trim() || '—'
  const memberId = String(subscriber?.memberId ?? '').trim() || '—'
  const subscriberName = [subscriber?.firstName, subscriber?.lastName]
    .filter((v) => String(v ?? '').trim() !== '')
    .join(' ')
    .trim()
  const errorText = hasErrors
    ? asArray(payload.errors)
        .map((err) => asRecord(err))
        .filter((err): err is Record<string, unknown> => err !== null)
        .map((err) => String(err.message ?? err.code ?? '').trim())
        .filter((msg) => msg !== '')
        .join('; ')
    : ''
  const nowId = Date.now()
  return {
    RequestID: nowId,
    APIResponseCode: active && !hasErrors ? '0' : '1',
    APIResponseMessage:
      errorText ||
      String(planStatusText).trim() ||
      'Response received from Stedi',
    ProcessedWithError: hasErrors,
    DOS: parseIsoDate(intake.serviceDateFrom || intake.serviceDateTo),
    PayerName: String(payer?.name ?? '—'),
    PverifyPayerCode: String(payload.tradingPartnerServiceId ?? ''),
    IsPriorAuthRequired: priorAuthHint,
    DemographicInfo: {
      Subscriber: {
        FullName: subscriberName || intake.patientName,
        Identification: [
          {
            Type: 'Member ID',
            Code: memberId,
          },
        ],
      },
    },
    PlanCoverageSummary: {
      PlanName: planDetails,
      PolicyType: insuranceType,
      Status: active ? 'Active' : 'Review',
      EffectiveDate: formatYyyyMmDdToMmDdYyyy(
        String(
          planDateInformation?.eligibilityBegin ??
            planDateInformation?.planBegin ??
            ''
        )
      ),
      GroupNumber: String(planInformation?.groupNumber ?? subscriber?.groupNumber ?? '—'),
    },
    HBPC_Deductible_OOP_Summary: {
      IndividualDeductibleInNet: { Value: dedIndYear },
      IndividualDeductibleRemainingInNet: { Value: dedIndRemaining },
      IndividualOOP_InNet: { Value: oopIndYear },
      IndividualOOPRemainingInNet: { Value: oopIndRemaining },
    },
    DMESummary: {
      ServiceCoveredInNet: active ? 'YES' : 'NO',
      ServiceCoveredOutNet: 'NO',
      CoPayInNet: { Value: copayAmount },
      CoInsInNet: pctToDisplay(firstInNetworkCoins?.benefitPercent),
      CoInsOutNet: pctToDisplay(firstOutNetworkCoins?.benefitPercent),
      BenefitDescription: String(
        benefitRows
          .flatMap((row) => asArray(row.additionalInformation))
          .map((entry) => asRecord(entry))
          .find((entry) => entry && String(entry.description ?? '').trim() !== '')
          ?.description ?? 'Normalized from Stedi eligibility response.'
      ),
    },
    ErrorDescription: errorText || undefined,
    EDIErrorMessage: errorText || undefined,
    Provider: {
      ProviderName: String(provider?.providerName ?? provider?.organizationName ?? '—'),
      NPI: String(provider?.npi ?? '—'),
    },
    StediRawResponse: payload,
  }
}

export async function submitStediEligibilityCheck(args: {
  formData: IntakeEligibilityForm
  options: PverifyEligibilityBuildOptions
  config: StediServiceConfig
  intake: IntakeContext
}): Promise<Record<string, unknown>> {
  const { formData, options, intake } = args
  const apiDate = STEDI_API_DATE
  const payload = buildStediEligibilityRequestBody(formData, options)
  const integrationBody = { api_date: apiDate, payload }
  const endpoint = `/integrations/stedi/eligibility?api_date=${encodeURIComponent(apiDate)}`
  const res = await apiRequest(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(integrationBody),
  })
  const body = await parseApiResponseBody(res)
  if (!res.ok) {
    throw new Error(readApiMessage(body, `Stedi eligibility request failed (${res.status})`))
  }
  const parsed = readApiData(body as ApiEnvelope<unknown>)
  const stediRaw = unwrapStediEligibilityPayload(parsed)
  if (!stediRaw || typeof stediRaw !== 'object') {
    throw new Error('Eligibility service returned invalid JSON.')
  }
  const normalized = normalizeStediResponse(stediRaw, intake)
  return {
    ...normalized,
    StediApiCall: {
      method: 'POST',
      endpoint,
      requestBody: payload,
    },
  }
}

export type StediPayerRow = {
  payerName: string
  payerCode: string
  searchText?: string
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function normalizeStediPayer(raw: unknown): StediPayerRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const payerName = pickString(o, [
    'payerName',
    'PayerName',
    'PayorName',
    'displayName',
    'name',
    'label',
    'tradingPartnerName',
  ])
  const payerCode = pickString(o, [
    'payerCode',
    'PayerCode',
    'tradingPartnerServiceId',
    'primaryPayerId',
    'stediId',
    'id',
    'code',
  ])
  if (!payerName || !payerCode) return null
  const aliases = Array.isArray(o.aliases)
    ? o.aliases
        .map((alias) =>
          alias && typeof alias === 'object' && !Array.isArray(alias)
            ? pickString(alias as Record<string, unknown>, [
                'payerId',
                'id',
                'value',
                'code',
              ])
            : ''
        )
        .filter((v) => v !== '')
    : []
  const primaryPayerId = pickString(o, ['primaryPayerId'])
  const stediId = pickString(o, ['stediId'])
  const searchText = [payerCode, primaryPayerId, stediId, ...aliases]
    .filter((v, i, arr) => v !== '' && arr.indexOf(v) === i)
    .join(' ')
  return { payerName, payerCode, searchText: searchText || undefined }
}

function extractPayerArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>
  for (const k of ['data', 'items', 'payers', 'Payers', 'results']) {
    if (Array.isArray(obj[k])) return obj[k] as unknown[]
  }
  return []
}

export async function fetchStediPayers(_config: StediServiceConfig): Promise<StediPayerRow[]> {
  const res = await apiRequest(
    `/integrations/stedi/payers?format=normalized&api_date=${encodeURIComponent(STEDI_API_DATE)}`,
    { method: 'GET' }
  )
  const body = await parseApiResponseBody(res)
  if (!res.ok) {
    throw new Error(readApiMessage(body, `Failed to load Stedi payers (${res.status})`))
  }
  const parsed = readApiData(body as ApiEnvelope<unknown>)
  const rows = extractPayerArray(parsed)
    .map(normalizeStediPayer)
    .filter((row): row is StediPayerRow => row !== null)
  rows.sort((a, b) => a.payerName.localeCompare(b.payerName, undefined, { sensitivity: 'base' }))
  return rows
}

/**
 * Downloads Stedi eligibility PDF via backend proxy (avoids CORS and keeps API key server-side).
 * Optional `apiDate` is the Stedi path segment (e.g. 2024-04-01); defaults on the server if omitted.
 */
export async function fetchStediEligibilityPdfReport(args: {
  eligibilityCheckId?: string
  /** Stedi API version date path segment, e.g. 2024-04-01 */
  apiDate?: string
  }): Promise<Blob> {
  const eligibilityCheckId = args.eligibilityCheckId?.trim() ?? ''
  if (!eligibilityCheckId) {
    throw new Error('Missing Stedi eligibilityCheckId for PDF generation.')
  }
  const safeId = encodeURIComponent(eligibilityCheckId)
  const apiDate = args.apiDate?.trim()
  const dateQ = apiDate ? `?api_date=${encodeURIComponent(apiDate)}` : ''
  const res = await apiRequest(
    `/integrations/stedi/eligibility-checks/${safeId}/pdf${dateQ}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/pdf, application/json, */*',
      },
    }
  )

  const ct = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text) as { message?: string; Error?: string }
      msg = (j.message || j.Error || text).trim()
    } catch {
      /* keep */
    }
    throw new Error(msg || `Stedi PDF request failed (${res.status})`)
  }

  if (ct.includes('application/json')) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text) as { message?: string; Error?: string }
      msg = (j.message || j.Error || text).trim()
    } catch {
      /* keep */
    }
    throw new Error(msg || 'Stedi PDF API returned JSON instead of a file.')
  }

  return res.blob()
}
