import type {
  IntakeEligibilityForm,
  PverifyEligibilityBuildOptions,
} from './pverifyEligibilityPayload'
import { buildPverifyEligibilityRequestBody } from './pverifyEligibilityPayload'
import { apiRequest } from './apiClient'

type PverifyServiceConfig = {
  apiUrl: string
  clientKey: string
  clientSecret: string
  clientApiId: string
  clientUserName: string
  eligibilityPath: string
}

export type PverifyPayerRow = {
  payerName: string
  payerCode: string
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

export async function submitPverifyEligibilityCheck(args: {
  formData: IntakeEligibilityForm
  options: PverifyEligibilityBuildOptions
  config: PverifyServiceConfig
}): Promise<Record<string, unknown>> {
  const { config, formData, options } = args
  const path = config.eligibilityPath.trim() || '/api/EligibilitySummary'
  const payload = buildPverifyEligibilityRequestBody(formData, options)
  const res = await apiRequest('/integrations/pverify/eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, path }),
  })
  const body = await parseApiResponseBody(res)
  if (!res.ok) {
    throw new Error(readApiMessage(body, `pVerify eligibility request failed (${res.status})`))
  }
  const parsed = readApiData(body as ApiEnvelope<Record<string, unknown>>)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Eligibility service returned invalid JSON.')
  }
  return parsed
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function normalizePayerRow(raw: unknown): PverifyPayerRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const payerCode = pickString(o, ['PverifyPayerCode', 'PayerCode', 'payerCode', 'Code'])
  const payerName = pickString(o, ['PayerName', 'PayorName', 'payerName', 'Name'])
  if (!payerCode || !payerName) return null
  return { payerName, payerCode }
}

function extractPayerArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  for (const key of ['Payers', 'payers', 'Data', 'data', 'Result', 'result']) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[]
  }
  return []
}

export async function fetchPverifyPayers(_config: PverifyServiceConfig): Promise<PverifyPayerRow[]> {
  const res = await apiRequest('/integrations/pverify/payers', { method: 'GET' })
  const body = await parseApiResponseBody(res)
  if (!res.ok) {
    throw new Error(readApiMessage(body, `Request failed (${res.status})`))
  }
  const parsed = readApiData(body as ApiEnvelope<unknown>)
  const rows = extractPayerArray(parsed)
    .map(normalizePayerRow)
    .filter((row): row is PverifyPayerRow => row !== null)
  rows.sort((a, b) => a.payerName.localeCompare(b.payerName, undefined, { sensitivity: 'base' }))
  return rows
}
