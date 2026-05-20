export type PverifyIntakeContext = {
  cptHcpcCode: string
  serviceDateFrom: string
  serviceDateTo: string
  patientName: string
  patientDOB?: string
}

import {
  mapAzureHealthCardToEligibilityRaw,
  type EligibilityVerificationField,
} from './mapAzureHealthCardToEligibilityRaw'

/** Route state for eligibility (`/patient` + `patientFlow: 'eligibility'`): full API body + PDF/meta helpers */
export type EligibilityResultRouteState = {
  rawResponse: Record<string, unknown>
  apiMeta: {
    requestId?: number
    verificationType?: string | null
    dos?: string | null
    apiResponseMessage?: string | null
    payerCode?: string | null
      source?: 'stedi' | 'pverify' | 'azure-health-card'
    clickAndVerifyFields?: Record<string, EligibilityVerificationField>
  }
  /** Patient intake fields for dashboard copy (name, CPT, dates). */
  intakeContext?: PverifyIntakeContext
}

/**
 * Builds navigation state from pVerify EligibilitySummary JSON.
 * The UI reads `rawResponse` directly — no legacy view-model mapping.
 */
export function mapPverifyToEligibilityView(
  raw: Record<string, unknown>,
  intake: PverifyIntakeContext
): EligibilityResultRouteState {
  const converted = mapAzureHealthCardToEligibilityRaw(raw, intake)
  const sourceRaw = converted?.raw ?? raw
  const reqId = sourceRaw.RequestID
  return {
    rawResponse: sourceRaw,
    intakeContext: intake,
    apiMeta: {
      requestId: typeof reqId === 'number' ? reqId : undefined,
      verificationType:
        sourceRaw.VerificationType != null ? String(sourceRaw.VerificationType) : null,
      dos: sourceRaw.DOS != null ? String(sourceRaw.DOS) : null,
      apiResponseMessage:
        sourceRaw.APIResponseMessage != null ? String(sourceRaw.APIResponseMessage) : null,
      payerCode:
        sourceRaw.PverifyPayerCode != null ? String(sourceRaw.PverifyPayerCode) : null,
      source: converted ? 'azure-health-card' : 'pverify',
      clickAndVerifyFields: converted?.verificationFields,
    },
  }
}
