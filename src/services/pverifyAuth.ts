/**
 * pVerify eligibility PDF via HealthLynk backend (secrets stay server-side).
 */
import { apiRequest } from './apiClient'

/**
 * GET Eligibility PDF for RequestID from EligibilitySummary.
 */
export async function fetchEligibilityPdfReport(
  requestId: number
): Promise<Blob> {
  const safeId = encodeURIComponent(String(requestId).trim())
  const res = await apiRequest(`/integrations/pverify/eligibility-pdf/${safeId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/pdf, application/json, */*',
    },
  })

  const ct = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text) as { Error?: string; message?: string }
      msg = (j.message || j.Error || text).trim()
    } catch {
      /* keep */
    }
    throw new Error(msg || `PDF request failed (${res.status})`)
  }

  if (ct.includes('application/json')) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text) as { Error?: string }
      msg = (j.Error || text).trim()
    } catch {
      /* keep */
    }
    throw new Error(msg || 'PDF request returned JSON instead of a file')
  }

  return res.blob()
}
