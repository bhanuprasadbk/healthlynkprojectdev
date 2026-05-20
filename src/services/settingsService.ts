import { apiJsonRequest } from './apiClient'

export type SettingsFullResponse = {
  data?: Record<string, unknown>
} & Record<string, unknown>

export type EligibilityServiceOptionsResponse = {
  data?: unknown[] | { options?: unknown[] }
} & Record<string, unknown>

export type EligibilityServiceConfigResponse = {
  data?: Record<string, unknown>
} & Record<string, unknown>

export async function getSettingsFull(): Promise<SettingsFullResponse> {
  return apiJsonRequest<SettingsFullResponse>('/settings/full', {
    method: 'GET',
    debugLabel: 'settings/full (compare)',
  })
}

export async function getEligibilityServiceOptions(): Promise<EligibilityServiceOptionsResponse> {
  return apiJsonRequest<EligibilityServiceOptionsResponse>('/eligibility-services/options', {
    method: 'GET',
  })
}

export async function getEligibilityServiceConfig(): Promise<EligibilityServiceConfigResponse> {
  return apiJsonRequest<EligibilityServiceConfigResponse>('/eligibility-services/config', {
    method: 'GET',
  })
}

export async function putSettingsFull(payload: Record<string, unknown>): Promise<void> {
  await apiJsonRequest('/settings/full', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function putEligibilityServiceConfig(
  payload: Record<string, unknown>
): Promise<void> {
  await apiJsonRequest('/eligibility-services/config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
