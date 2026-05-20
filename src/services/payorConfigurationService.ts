import { apiJsonRequest, apiRequest } from './apiClient'

export type ApiPayorPlan = {
  id?: string
  plan_name?: string
  planName?: string
  plan_type?: string
  planType?: string
  auto_check_frequency?: string
  autoCheckFrequency?: string
  status?: string
  created_at?: string
  createdAt?: string
}

export type ApiPayor = {
  id?: string
  name?: string
  payor_name?: string
  payorName?: string
  status?: string
  created_at?: string
  createdAt?: string
  plans?: ApiPayorPlan[]
}

export type ApiPayorsResponse = {
  data?: ApiPayor[] | { payors?: ApiPayor[] }
}

export type CreatePayorResponse = {
  data?: {
    id?: string
    name?: string
    status?: string
    created_at?: string
    createdAt?: string
  }
  message?: string
}

export type UpdatePayorResponse = {
  data?: {
    id?: string
    name?: string
    status?: string
    created_at?: string
    createdAt?: string
  }
  message?: string
}

export type CreatePlanResponse = {
  data?: {
    id?: string
    plan_name?: string
    plan_type?: string
    auto_check_frequency?: string
    status?: string
    created_at?: string
    createdAt?: string
  }
  message?: string
}

export type UpdatePlanResponse = {
  data?: {
    id?: string
    plan_name?: string
    plan_type?: string
    auto_check_frequency?: string
    status?: string
    created_at?: string
    createdAt?: string
  }
  message?: string
}

export async function fetchPayors() {
  return apiJsonRequest<ApiPayorsResponse | ApiPayor[]>('/payors', {
    method: 'GET',
  })
}

export async function createPayor(payload: { name: string; status: string }) {
  return apiJsonRequest<CreatePayorResponse>('/payors', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePayor(payorId: string, payload: { name: string; status: string }) {
  return apiJsonRequest<UpdatePayorResponse>(`/payors/${payorId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function createPlan(
  payorId: string,
  payload: {
    plan_name: string
    plan_type: string
    auto_check_frequency: string
    status: string
  }
) {
  return apiJsonRequest<CreatePlanResponse>(`/payors/${payorId}/plans`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePlan(
  planId: string,
  payload: {
    plan_name: string
    plan_type: string
    auto_check_frequency: string
    status: string
  }
) {
  return apiJsonRequest<UpdatePlanResponse>(`/payor-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

function parseDeleteErrorMessage(text: string, fallback: string): string {
  if (!text) return fallback
  try {
    const parsed = JSON.parse(text) as { message?: string }
    return parsed?.message || fallback
  } catch {
    return fallback
  }
}

export async function deletePayor(payorId: string) {
  const response = await apiRequest(`/payors/${payorId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(parseDeleteErrorMessage(text, `Failed to delete payor (${response.status}).`))
  }
}

export async function deletePlan(planId: string) {
  const response = await apiRequest(`/payor-plans/${planId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(parseDeleteErrorMessage(text, `Failed to delete plan (${response.status}).`))
  }
}
