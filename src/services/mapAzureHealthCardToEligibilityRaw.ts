type UnknownRecord = Record<string, unknown>

export type EligibilityVerificationField = {
  label: string
  value: string
  confidence?: number
  polygon?: number[]
}

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as UnknownRecord) : null
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function toStringValue(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  const o = asRecord(v)
  if (!o) return ''
  const valueString = o.valueString
  if (typeof valueString === 'string') return valueString.trim()
  const valueDate = o.valueDate
  if (typeof valueDate === 'string') return valueDate.trim()
  const valueNumber = o.valueNumber
  if (typeof valueNumber === 'number' && Number.isFinite(valueNumber)) return String(valueNumber)
  const content = o.content
  if (typeof content === 'string') return content.trim()
  return ''
}

function firstDocFieldMap(payload: unknown): UnknownRecord | null {
  const root = asRecord(payload)
  const ar = root ? asRecord(root.analyzeResult) : null
  const docs = ar ? asArray(ar.documents) : []
  const d0 = docs.length > 0 ? asRecord(docs[0]) : null
  return d0 ? asRecord(d0.fields) : null
}

function mmDdYyyyFromIso(iso: string): string {
  const t = iso.trim()
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return t
  return `${m[2]}/${m[3]}/${m[1]}`
}

function toMoneyString(v: unknown): string {
  const s = toStringValue(v)
  if (!s) return ''
  if (s.includes('%')) return s
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(n)) return s
  return `$${n.toFixed(2)}`
}

function fieldPolygon(field: unknown): number[] | undefined {
  const o = asRecord(field)
  const br = o ? asArray(o.boundingRegions) : []
  const first = br.length > 0 ? asRecord(br[0]) : null
  const poly = first ? asArray(first.polygon) : []
  if (poly.length < 8) return undefined
  const out = poly
    .map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : NaN))
    .filter((n) => Number.isFinite(n))
  return out.length >= 8 ? out : undefined
}

function fieldConfidence(field: unknown): number | undefined {
  const o = asRecord(field)
  const conf = o?.confidence
  return typeof conf === 'number' && Number.isFinite(conf) ? conf : undefined
}

function memberNameFromFields(fields: UnknownRecord): string {
  const member = asRecord(fields.Member)
  const memberObj = member ? asRecord(member.valueObject) : null
  const direct = memberObj ? toStringValue(memberObj.Name) : ''
  if (direct) return direct

  const dep = asRecord(fields.Dependents)
  const arr = dep ? asArray(dep.valueArray) : []
  const first = arr.length > 0 ? asRecord(arr[0]) : null
  const firstObj = first ? asRecord(first.valueObject) : null
  return firstObj ? toStringValue(firstObj.Name) : ''
}

function memberIdFromFields(fields: UnknownRecord): string {
  const idNumber = asRecord(fields.IdNumber)
  const idObj = idNumber ? asRecord(idNumber.valueObject) : null
  return idObj ? toStringValue(idObj.Number) : ''
}

function pickCopay(copaysField: unknown): number {
  const c = asRecord(copaysField)
  const rows = c ? asArray(c.valueArray) : []
  const amounts: number[] = []
  for (const row of rows) {
    const rowObj = asRecord(row)
    const valueObj = rowObj ? asRecord(rowObj.valueObject) : null
    const amt = valueObj ? asRecord(valueObj.Amount) : null
    const n = parseFloat(toStringValue(amt).replace(/[^0-9.-]/g, ''))
    if (Number.isFinite(n) && n > 0) amounts.push(n)
  }
  if (amounts.length === 0) return 0
  return Math.min(...amounts)
}

function pickCoinsurance(copaysField: unknown): string {
  const c = asRecord(copaysField)
  const rows = c ? asArray(c.valueArray) : []
  for (const row of rows) {
    const rowObj = asRecord(row)
    const valueObj = rowObj ? asRecord(rowObj.valueObject) : null
    const amt = valueObj ? toStringValue(valueObj.Amount) : ''
    const percent = amt.match(/(\d+)%/)
    if (percent) return `${percent[1]}%`
  }
  return '—'
}

function buildVerificationMap(fields: UnknownRecord): Record<string, EligibilityVerificationField> {
  const map: Record<string, EligibilityVerificationField> = {}
  const set = (key: string, label: string, field: unknown, fallback = '') => {
    const value = toStringValue(field) || fallback
    if (!value) return
    map[key] = {
      label,
      value,
      confidence: fieldConfidence(field),
      polygon: fieldPolygon(field),
    }
  }

  set('insurer', 'Insurer', fields.Insurer)
  set('memberName', 'Member Name', fields.Member, memberNameFromFields(fields))
  set('memberId', 'Member ID', fields.IdNumber, memberIdFromFields(fields))
  set('payerId', 'Payer ID', asRecord(fields.Payer)?.valueObject ? asRecord(asRecord(fields.Payer)?.valueObject)?.Id : null)
  set('groupNumber', 'Group Number', fields.GroupNumber)
  set('effectiveDate', 'Effective Date', fields.EffectiveDate)
  set('plan', 'Plan', asRecord(fields.Plan)?.valueObject ? asRecord(asRecord(fields.Plan)?.valueObject)?.Name : null)
  return map
}

/**
 * Converts Azure prebuilt health-insurance-card payload into the minimal pVerify-like shape
 * consumed by `buildEligibilityDashboardView`.
 */
export function mapAzureHealthCardToEligibilityRaw(
  payload: unknown,
  intake: { serviceDateFrom: string; serviceDateTo: string; cptHcpcCode: string }
): {
  raw: Record<string, unknown>
  verificationFields: Record<string, EligibilityVerificationField>
} | null {
  const fields = firstDocFieldMap(payload)
  if (!fields) return null

  const memberName = memberNameFromFields(fields)
  const memberId = memberIdFromFields(fields)
  const insurer = toStringValue(fields.Insurer)
  const groupNumber = toStringValue(fields.GroupNumber)
  const effectiveIso = toStringValue(fields.EffectiveDate)
  const effectiveDate = mmDdYyyyFromIso(effectiveIso)
  const copay = pickCopay(fields.Copays)
  const coinsurance = pickCoinsurance(fields.Copays)

  const planField = asRecord(fields.Plan)
  const planObj = planField ? asRecord(planField.valueObject) : null
  const planName = planObj ? toStringValue(planObj.Name) : ''
  const planType = planObj ? toStringValue(planObj.Type) : ''

  const payerField = asRecord(fields.Payer)
  const payerObj = payerField ? asRecord(payerField.valueObject) : null
  const payerId = payerObj ? toStringValue(payerObj.Id) : ''

  const raw: Record<string, unknown> = {
    RequestID: Date.now(),
    APIResponseCode: '0',
    APIResponseMessage: 'Mapped from Azure health insurance card analysis',
    ProcessedWithError: false,
    DOS: intake.serviceDateFrom || intake.serviceDateTo || '',
    PayerName: insurer || '—',
    PverifyPayerCode: payerId || '',
    IsPriorAuthRequired: false,
    DemographicInfo: {
      Subscriber: {
        FullName: memberName || '',
        Identification: memberId
          ? [{ Type: 'Member ID', Code: memberId }]
          : [],
      },
    },
    PlanCoverageSummary: {
      PlanName: planName || '—',
      PolicyType: planType || '—',
      Status: 'Active',
      EffectiveDate: effectiveDate || '',
      GroupNumber: groupNumber || '',
    },
    HBPC_Deductible_OOP_Summary: {},
    DMESummary: {
      ServiceCoveredInNet: 'YES',
      ServiceCoveredOutNet: 'NO',
      CoPayInNet: copay > 0 ? { Value: toMoneyString(copay) } : { Value: '$0.00' },
      CoInsInNet: coinsurance,
      BenefitDescription: 'Mapped from OCR health insurance card.',
    },
  }

  return {
    raw,
    verificationFields: buildVerificationMap(fields),
  }
}
