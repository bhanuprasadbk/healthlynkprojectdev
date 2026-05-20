/**
 * Maps Azure Document Intelligence `prebuilt-healthInsuranceCard.us` analyze result
 * into Patient Intake form fields.
 *
 * Azure often omits `Member.Name` and puts the primary subscriber under
 * `Dependents[0].Name` (member index 01 on the card).
 *
 * @see https://learn.microsoft.com/azure/ai-services/document-intelligence/prebuilt/health-insurance-card
 */

/** Subset of PatientIntake FormData filled from the card. */
export type IntakeFormPatchFromHealthCard = {
  patientFirstName: string
  patientLastName: string
  patientDOB: string
  patientGender: string
  patientZip: string
  patientPhone: string
  patientEmail: string
  subscriberFirstName: string
  subscriberLastName: string
  subscriberDOB: string
  subscriberID: string
  relationToSubscriber: string
  subscriberZip: string
  payor: string
  payerCode: string
  groupNumber: string
  policyNumber: string
  /** Plan effective date → Service Date From (step 2). */
  serviceDateFrom: string
}

const EMPTY: IntakeFormPatchFromHealthCard = {
  patientFirstName: '',
  patientLastName: '',
  patientDOB: '',
  patientGender: '',
  patientZip: '',
  patientPhone: '',
  patientEmail: '',
  subscriberFirstName: '',
  subscriberLastName: '',
  subscriberDOB: '',
  subscriberID: '',
  relationToSubscriber: 'self',
  subscriberZip: '',
  payor: '',
  payerCode: '',
  groupNumber: '',
  policyNumber: '',
  serviceDateFrom: '',
}

function fieldAsString(field: unknown): string {
  if (field === null || field === undefined) return ''
  if (typeof field === 'string') return field.trim()
  if (typeof field !== 'object') return String(field).trim()
  const o = field as Record<string, unknown>
  if (typeof o.valueString === 'string') return o.valueString.trim()
  if (typeof o.valueDate === 'string') return o.valueDate.trim()
  if (typeof o.valuePhoneNumber === 'string') return o.valuePhoneNumber.trim()
  if (typeof o.valueNumber === 'number' && Number.isFinite(o.valueNumber)) {
    return String(o.valueNumber)
  }
  if (typeof o.content === 'string') return o.content.trim()
  return ''
}

/** Unwraps `valueObject` on a document field (nested fields). */
function fieldAsObject(field: unknown): Record<string, unknown> | null {
  if (!field || typeof field !== 'object') return null
  const o = field as Record<string, unknown>
  const vo = o.valueObject
  if (vo && typeof vo === 'object' && !Array.isArray(vo)) {
    return vo as Record<string, unknown>
  }
  return null
}

function normalizeDateForInput(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const mm = m[1].padStart(2, '0')
    const dd = m[2].padStart(2, '0')
    const yy = m[3]
    return `${yy}-${mm}-${dd}`
  }
  return t
}

function splitFullName(name: string): { first: string; last: string } {
  const t = name.trim()
  if (!t) return { first: '', last: '' }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function normalizeGender(g: string): string {
  const u = g.trim().toUpperCase()
  if (u === 'M' || u === 'MALE') return 'male'
  if (u === 'F' || u === 'FEMALE') return 'female'
  const lower = g.trim().toLowerCase()
  if (lower === 'male' || lower === 'female') return lower
  return g.trim()
}

function extractZipFromAddress(address: string): string {
  const m = address.match(/\b(\d{5})(-\d{4})?\b/)
  return m ? `${m[1]}${m[2] ?? ''}` : ''
}

/** `address` fields expose `valueAddress.postalCode` in addition to `content`. */
function postalCodeFromAddressField(addressField: unknown): string {
  if (!addressField || typeof addressField !== 'object') return ''
  const o = addressField as Record<string, unknown>
  const va = o.valueAddress
  if (va && typeof va === 'object') {
    const pc = (va as Record<string, unknown>).postalCode
    if (typeof pc === 'string' && pc.trim()) return pc.trim()
  }
  return extractZipFromAddress(fieldAsString(addressField))
}

/** Names listed under `Dependents` (first entry is often the primary / 01 line). */
function getDependentNames(fields: Record<string, unknown>): string[] {
  return getDependentEntries(fields)
    .map((e) => e.name)
    .filter(Boolean)
}

export type HealthCardPersonOption = {
  /** `member` = subscriber line on card; `dep:0`, `dep:1`, … = Dependents index */
  id: string
  /** Full name for display */
  label: string
}

type DependentEntry = { name: string; birthDate: string; gender: string }

function getDependentEntries(fields: Record<string, unknown>): DependentEntry[] {
  const depField = fields.Dependents
  if (!depField || typeof depField !== 'object') return []
  const valueArray = (depField as Record<string, unknown>).valueArray
  if (!Array.isArray(valueArray)) return []
  const out: DependentEntry[] = []
  for (const entry of valueArray) {
    const vo = fieldAsObject(entry)
    if (!vo) continue
    const name = fieldAsString(vo.Name).trim()
    if (!name) continue
    out.push({
      name,
      birthDate: fieldAsString(vo.BirthDate),
      gender: fieldAsString(vo.Gender),
    })
  }
  return out
}

/**
 * People named on the card (Member + each Dependent with a name).
 * When length > 1, the UI should let the user pick who the patient is.
 */
export function listHealthCardPersons(payload: unknown): HealthCardPersonOption[] {
  const fields = getFirstDocumentFields(payload)
  if (!fields) return []
  const memberObj = fieldAsObject(fields.Member)
  const memberName = memberObj ? fieldAsString(memberObj.Name).trim() : ''
  const out: HealthCardPersonOption[] = []
  if (memberName) {
    out.push({ id: 'member', label: memberName })
  }
  const deps = getDependentEntries(fields)
  deps.forEach((d, i) => {
    out.push({ id: `dep:${i}`, label: d.name })
  })
  return out
}

export function normalizeInsurerKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[®©™]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Match OCR insurer string (e.g. `aetna®`) to a pVerify payer row for dropdown + code. */
export function matchPverifyPayerForInsurer<
  T extends { payerName: string; payerCode: string },
>(insurerRaw: string, rows: T[]): T | undefined {
  const key = normalizeInsurerKey(insurerRaw)
  if (!key) return undefined
  const byExact = rows.find((r) => normalizeInsurerKey(r.payerName) === key)
  if (byExact) return byExact
  return rows.find((r) => {
    const rk = normalizeInsurerKey(r.payerName)
    return rk.includes(key) || key.includes(rk)
  })
}

function getFirstDocumentFields(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null
  const ar = (payload as Record<string, unknown>).analyzeResult
  if (!ar || typeof ar !== 'object') return null
  const docs = (ar as Record<string, unknown>).documents
  if (!Array.isArray(docs) || docs.length === 0) return null
  const d0 = docs[0] as Record<string, unknown>
  const fields = d0.fields
  if (!fields || typeof fields !== 'object') return null
  return fields as Record<string, unknown>
}

function buildMemberId(prefix: string, number: string, suffix: string): string {
  return [prefix, number, suffix]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join('')
}

function buildCommonInsuranceFields(
  fields: Record<string, unknown>,
  memberObj: Record<string, unknown> | null
): Pick<
  IntakeFormPatchFromHealthCard,
  | 'patientZip'
  | 'patientPhone'
  | 'patientEmail'
  | 'subscriberID'
  | 'subscriberZip'
  | 'payor'
  | 'payerCode'
  | 'groupNumber'
  | 'policyNumber'
  | 'serviceDateFrom'
> {
  const insurer = fieldAsString(fields.Insurer)
  const idSuffix = memberObj ? fieldAsString(memberObj.IdNumberSuffix) : ''

  const idNumField = fields.IdNumber
  const idObj = fieldAsObject(idNumField)
  const idPrefix = idObj ? fieldAsString(idObj.Prefix) : ''
  const idNumber = idObj ? fieldAsString(idObj.Number) : ''
  const subscriberId = buildMemberId(idPrefix, idNumber, idSuffix)

  const groupNumber = fieldAsString(fields.GroupNumber)

  const planField = fields.Plan
  const planObj = fieldAsObject(planField)
  const planNumber = planObj ? fieldAsString(planObj.Number) : ''

  const rxField = fields.PrescriptionInfo
  const rxObj = fieldAsObject(rxField)
  const rxId = rxObj ? fieldAsString(rxObj.RxId) : ''

  const policyNumber = planNumber || rxId

  const payerField = fields.Payer
  const payerObj = fieldAsObject(payerField)
  let payerPhone = ''
  let payerZip = ''
  if (payerObj) {
    payerPhone = fieldAsString(payerObj.PhoneNumber)
    const addrField = payerObj.Address
    payerZip = postalCodeFromAddressField(addrField)
  }

  const effectiveRaw = fieldAsString(fields.EffectiveDate)
  const serviceDateFrom = normalizeDateForInput(effectiveRaw)

  return {
    patientZip: payerZip,
    patientPhone: payerPhone,
    patientEmail: '',
    subscriberID: subscriberId,
    subscriberZip: payerZip,
    payor: insurer,
    payerCode: '',
    groupNumber,
    policyNumber,
    serviceDateFrom,
  }
}

function personPatchForMember(
  memberObj: Record<string, unknown> | null
): Pick<
  IntakeFormPatchFromHealthCard,
  | 'patientFirstName'
  | 'patientLastName'
  | 'patientDOB'
  | 'patientGender'
  | 'subscriberFirstName'
  | 'subscriberLastName'
  | 'subscriberDOB'
  | 'relationToSubscriber'
> {
  const rawName = memberObj ? fieldAsString(memberObj.Name) : ''
  const { first, last } = splitFullName(rawName)
  const dob = memberObj
    ? normalizeDateForInput(fieldAsString(memberObj.BirthDate))
    : ''
  const gender = memberObj ? normalizeGender(fieldAsString(memberObj.Gender)) : ''
  return {
    patientFirstName: first,
    patientLastName: last,
    patientDOB: dob,
    patientGender: gender,
    subscriberFirstName: first,
    subscriberLastName: last,
    subscriberDOB: dob,
    relationToSubscriber: 'self',
  }
}

function personPatchForDependentIndex(
  fields: Record<string, unknown>,
  index: number,
  memberObj: Record<string, unknown> | null
): Pick<
  IntakeFormPatchFromHealthCard,
  | 'patientFirstName'
  | 'patientLastName'
  | 'patientDOB'
  | 'patientGender'
  | 'subscriberFirstName'
  | 'subscriberLastName'
  | 'subscriberDOB'
  | 'relationToSubscriber'
> {
  const depField = fields.Dependents
  const valueArray =
    depField && typeof depField === 'object'
      ? (depField as Record<string, unknown>).valueArray
      : null
  if (!Array.isArray(valueArray) || index < 0 || index >= valueArray.length) {
    return personPatchLegacy(fields, memberObj)
  }
  const entry = valueArray[index]
  const vo = fieldAsObject(entry)
  const rawName = vo ? fieldAsString(vo.Name) : ''
  const { first, last } = splitFullName(rawName)
  let dob = vo ? normalizeDateForInput(fieldAsString(vo.BirthDate)) : ''
  let gender = vo ? normalizeGender(fieldAsString(vo.Gender)) : ''
  const memberName = memberObj ? fieldAsString(memberObj.Name).trim() : ''
  const memberDob = memberObj
    ? normalizeDateForInput(fieldAsString(memberObj.BirthDate))
    : ''
  const memberGender = memberObj
    ? normalizeGender(fieldAsString(memberObj.Gender))
    : ''
  if (!dob) dob = memberDob
  if (!gender) gender = memberGender

  if (memberName) {
    const mf = splitFullName(memberName)
    return {
      patientFirstName: first,
      patientLastName: last,
      patientDOB: dob,
      patientGender: gender,
      subscriberFirstName: mf.first,
      subscriberLastName: mf.last,
      subscriberDOB: memberDob,
      relationToSubscriber: 'child',
    }
  }

  return {
    patientFirstName: first,
    patientLastName: last,
    patientDOB: dob,
    patientGender: gender,
    subscriberFirstName: first,
    subscriberLastName: last,
    subscriberDOB: dob,
    relationToSubscriber: 'self',
  }
}

/** When Azure lists no discrete persons, use legacy: Member name or first Dependent name. */
function personPatchLegacy(
  fields: Record<string, unknown>,
  memberObj: Record<string, unknown> | null
): Pick<
  IntakeFormPatchFromHealthCard,
  | 'patientFirstName'
  | 'patientLastName'
  | 'patientDOB'
  | 'patientGender'
  | 'subscriberFirstName'
  | 'subscriberLastName'
  | 'subscriberDOB'
  | 'relationToSubscriber'
> {
  const memberNameFromMember = memberObj ? fieldAsString(memberObj.Name) : ''
  const dependentNames = getDependentNames(fields)
  const memberNameRaw = memberNameFromMember || dependentNames[0] || ''
  const memberDobRaw = memberObj ? fieldAsString(memberObj.BirthDate) : ''
  const memberGenderRaw = memberObj ? fieldAsString(memberObj.Gender) : ''
  const { first: firstName, last: lastName } = splitFullName(memberNameRaw)
  const dob = normalizeDateForInput(memberDobRaw)
  const gender = normalizeGender(memberGenderRaw)
  return {
    patientFirstName: firstName,
    patientLastName: lastName,
    patientDOB: dob,
    patientGender: gender,
    subscriberFirstName: firstName,
    subscriberLastName: lastName,
    subscriberDOB: dob,
    relationToSubscriber: 'self',
  }
}

/**
 * Extracts patient/subscriber/insurance fields from a successful Azure analyze payload.
 * @param personId Required when {@link listHealthCardPersons} returns more than one option (`member`, `dep:0`, …).
 */
export function mapAzureHealthInsuranceResultToIntakeForm(
  payload: unknown,
  personId?: string
): IntakeFormPatchFromHealthCard {
  const fields = getFirstDocumentFields(payload)
  if (!fields) {
    console.warn(
      'mapAzureHealthInsuranceResultToIntakeForm: missing analyzeResult.documents[0].fields'
    )
    return { ...EMPTY }
  }

  const memberField = fields.Member
  const memberObj = fieldAsObject(memberField)

  const choices = listHealthCardPersons(payload)
  const common = buildCommonInsuranceFields(fields, memberObj)

  let person: Pick<
    IntakeFormPatchFromHealthCard,
    | 'patientFirstName'
    | 'patientLastName'
    | 'patientDOB'
    | 'patientGender'
    | 'subscriberFirstName'
    | 'subscriberLastName'
    | 'subscriberDOB'
    | 'relationToSubscriber'
  >

  if (choices.length === 0) {
    person = personPatchLegacy(fields, memberObj)
  } else if (choices.length === 1) {
    const only = choices[0].id
    person =
      only === 'member'
        ? personPatchForMember(memberObj)
        : only.startsWith('dep:')
          ? personPatchForDependentIndex(
              fields,
              parseInt(only.slice(4), 10),
              memberObj
            )
          : personPatchLegacy(fields, memberObj)
  } else {
    const id = personId ?? choices[0].id
    if (id === 'member') {
      person = personPatchForMember(memberObj)
    } else if (id.startsWith('dep:')) {
      person = personPatchForDependentIndex(
        fields,
        parseInt(id.slice(4), 10),
        memberObj
      )
    } else {
      person = personPatchLegacy(fields, memberObj)
    }
  }

  return {
    ...person,
    ...common,
  }
}
