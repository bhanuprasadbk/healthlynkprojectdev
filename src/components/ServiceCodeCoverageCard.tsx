import type { EligibilityBenefitDetail, EligibilityServiceResult } from '../utils/getEligibilityByProductSlugs'
import { findServiceTypeCodeName } from '../data/serviceTypeCodes'
import {
  BenefitDetailsSection,
  type BenefitDetailTableRow,
} from './BenefitDetailsTableSection'

function displayYesNo(raw: string | undefined): string {
  const s = (raw ?? '').trim().toUpperCase()
  if (s === 'YES' || s === 'Y') return 'Yes'
  if (s === 'NO' || s === 'N') return 'No'
  return raw?.trim() || '—'
}

function formatCoinsurance(raw: unknown): string {
  if (raw == null || String(raw).trim() === '') return '—'
  const n = Number.parseFloat(String(raw))
  if (!Number.isFinite(n)) return String(raw).trim()
  if (n > 0 && n <= 1) return String(n)
  return String(raw).trim()
}

function formatCopay(raw: unknown): string {
  if (raw == null || String(raw).trim() === '') return '—'
  const s = String(raw).trim()
  if (s.includes('$')) return s
  const n = Number.parseFloat(s.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(n)) return s
  return `$${n.toFixed(2)}`
}

function networkLabelFromCode(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper === 'Y') return 'In network'
  if (upper === 'N') return 'Out of network'
  return 'Not set'
}

function mapBenefitRecordToTableRow(raw: EligibilityBenefitDetail): BenefitDetailTableRow {
  const rec = raw
  const network = networkLabelFromCode(
    String(rec.inPlanNetworkIndicatorCode ?? rec.inPlanNetworkIndicator ?? '')
  )
  const additionalInfo = Array.isArray(rec.additionalInformation)
    ? rec.additionalInformation
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return ''
          return String((entry as Record<string, unknown>).description ?? '').trim()
        })
        .filter(Boolean)
    : []
  const service =
    additionalInfo[0] ||
    String(rec.name ?? '').trim() ||
    String(rec.code ?? '').trim() ||
    '—'
  const percent = rec.benefitPercent
  const amount = rec.benefitAmount
  return {
    service,
    network,
    coinsurance: percent != null && String(percent).trim() !== '' ? formatCoinsurance(percent) : '—',
    copay: amount != null && String(amount).trim() !== '' ? formatCopay(amount) : '—',
  }
}

function buildSummaryTableRows(result: EligibilityServiceResult): BenefitDetailTableRow[] {
  const rows: BenefitDetailTableRow[] = []

  if (result.coveredInNet != null && String(result.coveredInNet).trim() !== '') {
    rows.push({
      service: 'Covered in-network',
      network: displayYesNo(result.coveredInNet),
      coinsurance: '—',
      copay: '—',
    })
  }
  if (result.coveredOutNet != null && String(result.coveredOutNet).trim() !== '') {
    rows.push({
      service: 'Covered out-of-network',
      network: displayYesNo(result.coveredOutNet),
      coinsurance: '—',
      copay: '—',
    })
  }
  if (result.coInsInNet?.trim()) {
    rows.push({
      service: 'Co-insurance (in-network)',
      network: 'In network',
      coinsurance: result.coInsInNet,
      copay: '—',
    })
  }
  if (result.coInsOutNet?.trim()) {
    rows.push({
      service: 'Co-insurance (out-of-network)',
      network: 'Out of network',
      coinsurance: result.coInsOutNet,
      copay: '—',
    })
  }
  if (result.coPayInNet?.trim()) {
    rows.push({
      service: 'Co-pay (in-network)',
      network: 'In network',
      coinsurance: '—',
      copay: result.coPayInNet,
    })
  }
  if (result.description?.trim()) {
    rows.push({
      service: result.description.trim(),
      network: 'Not set',
      coinsurance: '—',
      copay: '—',
    })
  }

  return rows
}

export default function ServiceCodeCoverageCard({
  result,
  additionalRows = [],
  providerMode = false,
}: {
  result: EligibilityServiceResult
  additionalRows?: BenefitDetailTableRow[]
  providerMode?: boolean
}) {
  const summaryRows = buildSummaryTableRows(result)
  const benefitRows = (result.benefits ?? []).map(mapBenefitRecordToTableRow)
  const rows = [...summaryRows, ...benefitRows, ...additionalRows]
  const title = findServiceTypeCodeName(result.serviceCode)

  return (
    <BenefitDetailsSection
      title={title}
      badge={`STC ${result.serviceCode}`}
      badgeTone="stc"
      rows={rows}
      emptyMessage={`No benefit rows available for service code ${result.serviceCode}.`}
      providerMode={providerMode}
    />
  )
}
