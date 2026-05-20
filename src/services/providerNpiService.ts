import { apiJsonRequest } from './apiClient'

export type ApiProviderLocation = {
  id?: string
  location_name?: string
  location?: string
  state_code?: string
  practice_state?: string
  practiceState?: string
  is_primary?: boolean
  isPrimary?: boolean
}

export type ApiProvider = {
  id?: string
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  npi?: string
  npi_code?: string
  npiCode?: string
  fax_number?: string
  faxNumber?: string
  tax_number?: string
  pin?: string
  is_default?: boolean
  isDefault?: boolean
  locations?: ApiProviderLocation[]
}

export type ApiProvidersResponse = {
  data?: ApiProvider[] | { providers?: ApiProvider[] }
} & Record<string, unknown>

export type DefaultProviderResponse = {
  data?: ApiProvider
} & Record<string, unknown>

export async function listProviders(): Promise<ApiProvidersResponse | ApiProvider[]> {
  return apiJsonRequest<ApiProvidersResponse | ApiProvider[]>('/providers', {
    method: 'GET',
  })
}

export async function getDefaultProvider(): Promise<DefaultProviderResponse> {
  return apiJsonRequest<DefaultProviderResponse>('/providers/default-provider', {
    method: 'GET',
  })
}

export type CreateProviderPayload = {
  first_name: string
  last_name: string
  npi: string
  fax_number: string
  tax_number: string
  pin: string
  locations: {
    location_name: string
    state_code: string
    is_primary: boolean
  }[]
}

export type CreateProviderResponse = {
  data?: {
    id?: string
  } & Record<string, unknown>
} & Record<string, unknown>

export type UpdateProviderPayload = {
  first_name: string
  last_name: string
  fax_number: string
  tax_number: string
  pin: string
  locations: Array<{
    id?: string
    location_name: string
    state_code: string
    is_primary: boolean
  }>
}

export async function updateProvider(
  providerId: string,
  payload: UpdateProviderPayload
): Promise<Record<string, unknown>> {
  return apiJsonRequest<Record<string, unknown>>(`/providers/${providerId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteProvider(providerId: string): Promise<Record<string, unknown>> {
  return apiJsonRequest<Record<string, unknown>>(`/providers/${providerId}`, {
    method: 'DELETE',
  })
}

export async function createProvider(
  payload: CreateProviderPayload
): Promise<CreateProviderResponse> {
  return apiJsonRequest<CreateProviderResponse>('/providers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type SetDefaultLocationResponse = {
  message?: string
} & Record<string, unknown>

export async function setDefaultProviderLocation(
  providerId: string
): Promise<SetDefaultLocationResponse> {
  return apiJsonRequest<SetDefaultLocationResponse>(
    `/providers/${providerId}/set-default-provider`,
    {
      method: 'POST',
    }
  )
}
