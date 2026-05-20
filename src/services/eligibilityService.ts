import { submitPverifyEligibilityCheck } from './pverifyService'
import { submitStediEligibilityCheck } from './stediService'
import type {
  IntakeEligibilityForm,
  PverifyEligibilityBuildOptions,
} from './pverifyEligibilityPayload'

export type EligibilityServiceType = 'stedi' | 'pverify'

export type StediConfig = {
  apiUrl: string
  apiKey: string
}

export type PverifyConfig = {
  apiUrl: string
  clientKey: string
  clientSecret: string
  clientApiId: string
  clientUserName: string
  eligibilityPath: string
}

export type EligibilityServiceConfigs = {
  stedi: StediConfig
  pverify: PverifyConfig
}

/** Defaults are empty; credentials are loaded from Settings (backend DB), not VITE_* env. */
export function buildDefaultServiceConfigs(): EligibilityServiceConfigs {
  return {
    stedi: {
      apiUrl: '',
      apiKey: '',
    },
    pverify: {
      apiUrl: '',
      clientKey: '',
      clientSecret: '',
      clientApiId: '',
      clientUserName: '',
      eligibilityPath: '/api/EligibilitySummary',
    },
  }
}

type SubmitEligibilityArgs = {
  service: EligibilityServiceType
  serviceConfigs: EligibilityServiceConfigs
  formData: IntakeEligibilityForm
  options: PverifyEligibilityBuildOptions
  intakeContext: {
    cptHcpcCode: string
    serviceDateFrom: string
    serviceDateTo: string
    patientName: string
    patientDOB?: string
  }
}

export async function submitEligibilityCheck({
  service,
  serviceConfigs,
  formData,
  options,
  intakeContext,
}: SubmitEligibilityArgs): Promise<Record<string, unknown>> {
  if (service === 'pverify') {
    const result = await submitPverifyEligibilityCheck({
      formData,
      options,
      config: serviceConfigs.pverify,
    })
    console.log('[Eligibility Result][pverify]', result)
    return result
  }
  const result = await submitStediEligibilityCheck({
    formData,
    options,
    config: serviceConfigs.stedi,
    intake: intakeContext,
  })
  console.log('[Eligibility Result][stedi]', result)
  return result
}
