import { apiJsonRequest } from './apiClient'

/** Full-document text from Azure `analyzeResult` (REST shape). */
function getAnalyzeResultContent(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const root = payload as Record<string, unknown>
  const ar = root.analyzeResult
  if (!ar || typeof ar !== 'object') return undefined
  const content = (ar as Record<string, unknown>).content
  return typeof content === 'string' ? content : undefined
}

function logExtractedContentOnce(payload: unknown): void {
  const raw = getAnalyzeResultContent(payload)
  if (raw === undefined) {
    const ar = (payload as Record<string, unknown> | null)?.analyzeResult
    console.log('Azure Document Intelligence — analyzeResult.content:', {
      raw: undefined,
      parsed: undefined,
      note: 'No string `analyzeResult.content`; inspect full `analyzeResult` in prior logs.',
      analyzeResultKeys: ar && typeof ar === 'object' ? Object.keys(ar as object) : [],
    })
    return
  }
  try {
    const parsed = JSON.parse(raw.trim()) as unknown
    console.log('Azure Document Intelligence — analyzeResult.content (JSON.parse):', parsed)
  } catch (err) {
    console.error('Azure Document Intelligence — JSON.parse(raw) failed:', err)
    console.log('Azure Document Intelligence — raw string (not valid JSON):', raw)
  }
}

function unwrapApiSuccessEnvelope(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const record = payload as Record<string, unknown>
  if ('data' in record) return record.data
  return payload
}

/**
 * Analyze a public image URL (e.g. Cloudinary `secure_url`) via the backend proxy.
 * The backend holds the Azure key and handles polling; the browser never talks to Azure directly.
 */
export async function analyzeHealthInsuranceCardFromUrl(fileUrl: string): Promise<unknown> {
  const resultPayload = await apiJsonRequest<unknown>('/integrations/azure/health-insurance-card', {
    method: 'POST',
    body: JSON.stringify({
      url: fileUrl,
    }),
  })
  const normalizedPayload = unwrapApiSuccessEnvelope(resultPayload)
  logExtractedContentOnce(normalizedPayload)
  return normalizedPayload
}
