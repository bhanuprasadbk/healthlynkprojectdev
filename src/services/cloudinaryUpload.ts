import { API_BASE_URL, apiRequest } from './apiClient'

type UploadFileResponse = {
  file_url?: string
  file_name?: string
  filename?: string
  upload_file_name?: string
  name?: string
  data?: {
    file_url?: string
    file_name?: string
    filename?: string
    upload_file_name?: string
    name?: string
  }
}

const UPLOAD_ENDPOINT = '/integrations/uploads'

function resolveUploadedFileName(payload: UploadFileResponse): string {
  return (
    payload.file_name ||
    payload.filename ||
    payload.upload_file_name ||
    payload.name ||
    payload.data?.file_name ||
    payload.data?.filename ||
    payload.data?.upload_file_name ||
    payload.data?.name ||
    ''
  )
}

export function getUploadedFileUrl(uploadFileName: string): string {
  const safeName = encodeURIComponent(uploadFileName)
  return `${API_BASE_URL}/integrations/uploads/${safeName}`
}

/**
 * Uploads file via backend integrations API and returns retrievable file URL.
 */
export async function uploadIntegrationFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await apiRequest(UPLOAD_ENDPOINT, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`File upload failed (${res.status}): ${body}`)
  }

  const text = await res.text()
  let data: UploadFileResponse = {}
  try {
    data = text ? (JSON.parse(text) as UploadFileResponse) : {}
  } catch {
    throw new Error('Upload API returned invalid JSON.')
  }

  const uploadFileName = resolveUploadedFileName(data).trim()
  const uploadedFileUrl =
    (typeof data.file_url === 'string' && data.file_url.trim()) ||
    (typeof data.data?.file_url === 'string' && data.data.file_url.trim()) ||
    ''

  if (uploadedFileUrl) {
    return uploadedFileUrl
  }

  if (!uploadFileName) {
    throw new Error('Upload API response missing uploaded file URL/file name.')
  }

  return getUploadedFileUrl(uploadFileName)
}

// Backward-compatible alias (can be removed after all imports migrate).
export const uploadToCloudinary = uploadIntegrationFile
