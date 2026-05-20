import { apiJsonRequest } from './apiClient'

export type PriorAuthorizationStatus = 'pending' | 'approved' | 'denied' | 'cancelled'

export type ApiPriorAuthorization = {
  id?: string
  request_number?: string
  patient_id?: string
  payor_id?: string
  service_code?: string
  service_description?: string
  diagnosis_code?: string
  diagnosis_description?: string
  subscriber_id?: string
  requested_service_date?: string
  submitted_date?: string
  status?: string
  status_label?: string
  provider_name?: string
  provider_npi?: string
  provider_address?: string
} & Record<string, unknown>

export type CreatePriorAuthorizationPayload = {
  request_number: string
  patient_id: string
  payor_id: string
  service_code: string
  service_description: string
  diagnosis_code: string
  diagnosis_description: string
  subscriber_id: string
  requested_service_date: string
  submitted_date: string
  status: PriorAuthorizationStatus
  provider_name: string
  provider_npi: string
  provider_address: string
}

export type PatchPriorAuthorizationStatusPayload = {
  status: PriorAuthorizationStatus
  status_label: string
  description: string
  performed_by_label: string
}

export type ApiPriorAuthorizationDocument = {
  id?: string
  name?: string
  file_name?: string
  type?: string
  size?: string | number
  uploaded_at?: string
  uploaded_date?: string
  created_at?: string
  uploaded_by?: string
} & Record<string, unknown>

export type ApiPriorAuthorizationActivity = {
  id?: string
  status?: string
  status_label?: string
  action?: string
  event?: string
  description?: string
  details?: string
  performed_by_label?: string
  created_at?: string
  timestamp?: string
  date?: string
} & Record<string, unknown>

type ListResponse<T> = T[] | ({ data?: T[]; items?: T[] } & Record<string, unknown>)

function asArray<T>(value: ListResponse<T>): T[] {
  if (Array.isArray(value)) return value
  if (Array.isArray(value.data)) return value.data
  if (Array.isArray(value.items)) return value.items
  return []
}

export async function listPriorAuthorizations(): Promise<ApiPriorAuthorization[]> {
  const response = await apiJsonRequest<ListResponse<ApiPriorAuthorization>>(
    '/prior-authorizations',
    {
      method: 'GET',
    }
  )
  return asArray(response)
}

export async function createPriorAuthorization(
  payload: CreatePriorAuthorizationPayload
): Promise<ApiPriorAuthorization> {
  const response = await apiJsonRequest<ApiPriorAuthorization | { data?: ApiPriorAuthorization }>(
    '/prior-authorizations',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
  if (response && typeof response === 'object' && 'data' in response) {
    return (response.data ?? {}) as ApiPriorAuthorization
  }
  return response as ApiPriorAuthorization
}

export async function patchPriorAuthorizationStatus(
  priorAuthId: string,
  payload: PatchPriorAuthorizationStatusPayload
): Promise<Record<string, unknown>> {
  const primaryPath = `/prior-authorizations/${priorAuthId}/status`
  const fallbackPath = `/prior-authorizations/${priorAuthId}`
  try {
    return await apiJsonRequest<Record<string, unknown>>(primaryPath, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    if (error instanceof Error && /\(404\)/.test(error.message)) {
      return apiJsonRequest<Record<string, unknown>>(fallbackPath, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    }
    throw error
  }
}

export async function listPriorAuthorizationDocuments(
  priorAuthId: string
): Promise<ApiPriorAuthorizationDocument[]> {
  const response = await apiJsonRequest<ListResponse<ApiPriorAuthorizationDocument>>(
    `/prior-authorizations/${priorAuthId}/documents`,
    {
      method: 'GET',
    }
  )
  return asArray(response)
}

export async function listPriorAuthorizationActivity(
  priorAuthId: string
): Promise<ApiPriorAuthorizationActivity[]> {
  const response = await apiJsonRequest<ListResponse<ApiPriorAuthorizationActivity>>(
    `/prior-authorizations/${priorAuthId}/activity`,
    {
      method: 'GET',
    }
  )
  return asArray(response)
}
