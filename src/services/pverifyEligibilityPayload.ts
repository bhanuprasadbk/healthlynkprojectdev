/**
 * Maps intake form values to pVerify EligibilitySummary JSON (see pVerify / Postman samples).
 * Dates: HTML `yyyy-mm-dd` → `mm/dd/yyyy` as commonly expected by pVerify examples.
 */

import { providerConfig } from '../data/providerConfig'
import { getPverifyLocationFromRuntime } from './providerRuntimeSettings'

export type IntakeEligibilityForm = {
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
  /** pVerify payer code from their payer list (entered in Insurance Details) */
  payerCode: string
  groupNumber: string
  policyNumber: string
  cptHcpcCode: string
  serviceTypeCodes?: string[]
  npi: string
  /** Rendering / NPPES — pVerify `provider` uses these when set. */
  providerFirstName: string
  providerLastName: string
  serviceDateFrom: string
  serviceDateTo: string
  diagnosisCode: string
  placeOfService: string
}

function formatDosForPverify(isoYmd: string): string {
  const raw = isoYmd?.trim()
  if (!raw) return ''
  const parts = raw.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`
  }
  return raw
}

export type PverifyEligibilityBuildOptions = {
  /** Same as UI “subscriber is the patient” */
  isSubscriberPatient: boolean
}

export function buildPverifyEligibilityRequestBody(
  data: IntakeEligibilityForm,
  options: PverifyEligibilityBuildOptions
): Record<string, unknown> {
  const { isSubscriberPatient } = options
  const payerCode = data.payerCode.trim()

  const patientDob = formatDosForPverify(data.patientDOB)
  const subscriberDob = formatDosForPverify(data.subscriberDOB)

  const patientForDependent = {
    firstName: data.patientFirstName,
    lastName: data.patientLastName,
    dob: patientDob,
  }

  const subscriber = isSubscriberPatient
    ? {
        firstName: data.patientFirstName,
        lastName: data.patientLastName,
        dob: patientDob,
        memberID: data.subscriberID || data.policyNumber,
      }
    : {
        firstName: data.subscriberFirstName,
        lastName: data.subscriberLastName,
        dob: subscriberDob,
        memberID: data.subscriberID,
      }

  const dependent = isSubscriberPatient ? null : { patient: patientForDependent }

  const selectedCodes = Array.isArray(data.serviceTypeCodes)
    ? data.serviceTypeCodes
        .map((code) => code.trim())
        .filter((code) => code !== '')
    : []
  const fallbackCode = data.cptHcpcCode.trim()
  const serviceCodes = selectedCodes.length > 0 ? selectedCodes : fallbackCode ? [fallbackCode] : ['30']
  const primaryCode = serviceCodes[0]

  return {
    payerCode,
    payerName: data.payor,
    provider: {
      firstName:
        data.providerFirstName.trim() || providerConfig.providerFirstName,
      middleName: providerConfig.providerMiddleName,
      lastName:
        data.providerLastName.trim() || providerConfig.providerLastName,
      npi: data.npi.trim(),
      pin: providerConfig.providerPin,
    },
    subscriber,
    dependent,
    isSubscriberPatient: isSubscriberPatient ? 'True' : 'False',
    doS_StartDate: formatDosForPverify(data.serviceDateFrom),
    doS_EndDate: formatDosForPverify(data.serviceDateTo),
    PracticeTypeCode: '3',
    referenceId: data.policyNumber || data.subscriberID || 'INTAKE',
    Location: getPverifyLocationFromRuntime(),
    IncludeTextResponse: 'false',
    InternalId: '',
    CustomerID: '',
    /** CPT/HCPCS procedure code(s) from intake (pVerify EligibilitySummary). */
    serviceCodes,
    /** STC service type code from shared list (used by integrations that expect STC). */
    ServiceTypeCode: primaryCode || undefined,
    ServiceTypeCodes: serviceCodes,
  }
}
