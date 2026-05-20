import { useState } from 'react'
import { fetchEligibilityPdfReport } from '../services/pverifyAuth'

type EligibilityPdfDownloadButtonProps = {
  /** Eligibility request id from pVerify (e.g. after EligibilitySummary). */
  requestId: number | string | null | undefined
  className?: string
}

export default function EligibilityPdfDownloadButton({
  requestId,
  className = '',
}: EligibilityPdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const disabled =
    loading ||
    requestId == null ||
    requestId === '' ||
    Number.isNaN(Number(requestId))

  const handleClick = async () => {
    if (requestId == null || requestId === '') return
    setLoading(true)

    try {
      const rid = Number(requestId)
      let blob: Blob | null = null
      let lastError: unknown = null

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
          blob = await fetchEligibilityPdfReport(rid)
          break
        } catch (error) {
          lastError = error
          if (attempt < 5) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
      }

      if (!blob) {
        throw lastError ?? new Error('Failed to fetch eligibility PDF')
      }

      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = 'EligibilityReport.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch (error) {
      console.error('PDF download failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500 ${className}`}
    >
      {loading ? 'Downloading...' : 'Download PDF'}
    </button>
  )
}
