import { useEffect, useMemo, useRef, useState } from 'react'

type StediEligibilityResultPanelProps = {
  raw: Record<string, unknown>
  colors: {
    textPrimary: string
    textSecondary: string
    primary: string
    border: string
    cardBackground: string
  }
  surfaceCard: {
    backgroundColor: string
    border: string
    boxShadow: string
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function text(v: unknown, fallback = '—'): string {
  if (v == null) return fallback
  const s = String(v).trim()
  return s === '' ? fallback : s
}

function networkCodeLabel(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper === 'Y') return 'In Network (Y)'
  if (upper === 'N') return 'Out of Network (N)'
  if (upper === 'W') return 'Not Applicable (W)'
  return upper
}

function isStatusTypeLabel(value: string): boolean {
  return value.trim().toLowerCase().includes('status')
}

const DEFAULT_TYPE_FILTERS = [
  'Co-Insurance',
  'Co-Payment',
  'Deductible',
  'Limitations',
  'Non Covered',
  'Out of Pocket',
  'Out of Pocket (Stop Loss)',
]
const EXCLUDED_TYPE_FILTER_VALUES = new Set([
  normalizeFilterLabel('Other source of data'),
  normalizeFilterLabel('Unlimited'),
])

function normalizeFilterLabel(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function coverageLevelPriority(value: string): number {
  const normalized = normalizeFilterLabel(value)
  if (normalized === 'individual') return 0
  if (normalized === 'family') return 1
  return 2
}

function toNumber(raw: unknown): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

type SortField = 'code' | 'benefitAmount' | 'benefitPercent'
type SortDirection = 'asc' | 'desc'

function formatPercent(raw: unknown): string {
  const s = text(raw, '')
  if (!s) return '—'
  if (s.includes('%')) return s
  const n = toNumber(s)
  if (n == null) return s
  if (Math.abs(n) <= 1) return `${(n * 100).toFixed(0)}%`
  return `${n.toFixed(0)}%`
}

function formatAmount(raw: unknown): string {
  const s = text(raw, '')
  if (!s) return '—'
  const n = toNumber(s)
  if (n == null) return s
  return `$${Number.isInteger(n) ? `${n}` : `${n.toFixed(2)}`}`
}

function renderAddress(record: Record<string, unknown> | null): string {
  if (!record) return '—'
  const parts = [record.address1, record.city, record.state, record.postalCode]
    .map((v) => text(v, ''))
    .filter((v) => v !== '')
  return parts.length > 0 ? parts.join(', ') : '—'
}

function KeyValueGrid({
  rows,
  colors,
}: {
  rows: Array<{ label: string; value: unknown }>
  colors: StediEligibilityResultPanelProps['colors']
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt
            className="mb-1 text-[11px] font-semibold uppercase tracking-wide sm:text-xs"
            style={{ color: colors.textSecondary }}
          >
            {row.label}
          </dt>
          <dd
            className="break-words text-sm font-medium leading-snug sm:text-base"
            style={{ color: colors.textPrimary }}
          >
            {text(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  colors,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
  colors: StediEligibilityResultPanelProps['colors']
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectedSet = useMemo(() => new Set(selected), [selected])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const toggle = (value: string) => {
    if (selectedSet.has(value)) onChange(selected.filter((x) => x !== value))
    else onChange([...selected, value])
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
          color: colors.textPrimary,
        }}
      >
        <span>{label}</span>
        {selected.length > 0 ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px]"
            style={{ backgroundColor: 'rgba(148,163,184,0.2)', color: colors.textSecondary }}
          >
            {selected.length} selected
          </span>
        ) : null}
      </button>
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-20 w-56 rounded-md border p-2 shadow-xl"
          style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}
        >
          <p className="mb-2 px-1 text-[11px]" style={{ color: colors.textSecondary }}>
            Filter by {label.toLowerCase()}
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs"
                style={{ color: colors.textPrimary }}
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(option)}
                  onChange={() => toggle(option)}
                  style={{ accentColor: colors.primary }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StediEligibilityResultPanel({
  raw,
  colors,
  surfaceCard,
}: StediEligibilityResultPanelProps) {
  const tableTextPrimary = colors.textPrimary
  const tableTextSecondary = colors.textSecondary
  const tableHeaderText = colors.textPrimary
  const meta = asRecord(raw.meta)
  const provider = asRecord(raw.provider)
  const subscriber = asRecord(raw.subscriber)
  const payer = asRecord(raw.payer)
  const planInfo = asRecord(raw.planInformation)
  const planDates = asRecord(raw.planDateInformation)
  const planStatus = asArray(raw.planStatus)
    .map(asRecord)
    .filter((x): x is Record<string, unknown> => x !== null)
  const benefits = asArray(raw.benefitsInformation)
    .map(asRecord)
    .filter((x): x is Record<string, unknown> => x !== null)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [coverageLevelFilter, setCoverageLevelFilter] = useState<string[]>([])
  const [networkFilter, setNetworkFilter] = useState<string[]>([])
  const [financialOnly, setFinancialOnly] = useState(false)
  const [withNotesOnly, setWithNotesOnly] = useState(false)
  const [sortField, setSortField] = useState<SortField>('code')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const defaultFiltersAppliedRef = useRef(false)
  const coverageStatus = planStatus[0] ? text(planStatus[0].status) : '—'
  const totalBenefits = benefits.length
  const uniqueTypes = useMemo(
    () =>
      Array.from(
        new Set(
          benefits
            .map((row) => text(row.name, '') || text(row.code, ''))
            .filter((v) => v !== '')
        )
      )
        .filter((value) => !EXCLUDED_TYPE_FILTER_VALUES.has(normalizeFilterLabel(value)))
        .sort(),
    [benefits]
  )
  const uniqueCoverageLevels = useMemo(
    () =>
      Array.from(new Set(benefits.map((row) => text(row.coverageLevel, '')).filter((v) => v !== '')))
        .filter((value) => normalizeFilterLabel(value) !== 'notset')
        .sort((a, b) => {
          const p = coverageLevelPriority(a) - coverageLevelPriority(b)
          return p !== 0 ? p : a.localeCompare(b)
        }),
    [benefits]
  )
  const uniqueNetworks = useMemo(
    () =>
      Array.from(
        new Set(
          benefits
            .map((row) => networkCodeLabel(text(row.inPlanNetworkIndicatorCode, '')))
            .filter((v) => v !== '')
        )
      )
        .filter((value) => normalizeFilterLabel(value) !== 'notset')
        .sort(),
    [benefits]
  )
  useEffect(() => {
    if (defaultFiltersAppliedRef.current) return
    if (benefits.length === 0) return

    const typeOptionsNormalized = new Map(
      uniqueTypes.map((option) => [normalizeFilterLabel(option), option])
    )
    const resolvedTypeDefaults = DEFAULT_TYPE_FILTERS.map((option) =>
      typeOptionsNormalized.get(normalizeFilterLabel(option))
    ).filter((option): option is string => Boolean(option))

    const individualCoverage = uniqueCoverageLevels.find(
      (option) => normalizeFilterLabel(option) === 'individual'
    )

    setTypeFilter(resolvedTypeDefaults)
    setCoverageLevelFilter(individualCoverage ? [individualCoverage] : [])
    defaultFiltersAppliedRef.current = true
  }, [benefits.length, uniqueCoverageLevels, uniqueTypes])

  const filteredBenefits = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return benefits.filter((row) => {
      const rowType = text(row.name, '') || text(row.code, '')
      const rowCoverageLevel = text(row.coverageLevel, '')
      const rowNetwork = networkCodeLabel(text(row.inPlanNetworkIndicatorCode, ''))
      if (typeFilter.length > 0 && !typeFilter.includes(rowType)) return false
      if (coverageLevelFilter.length > 0 && !coverageLevelFilter.includes(rowCoverageLevel)) {
        return false
      }
      if (networkFilter.length > 0 && !networkFilter.includes(rowNetwork)) return false
      if (financialOnly) {
        const hasFinancialValue =
          text(row.benefitAmount, '') !== '' || text(row.benefitPercent, '') !== ''
        if (!hasFinancialValue) return false
      }
      if (withNotesOnly) {
        const hasNotes = asArray(row.additionalInformation).some((entry) => {
          const rec = asRecord(entry)
          return rec != null && text(rec.description, '') !== ''
        })
        if (!hasNotes) return false
      }
      if (!q) return true
      const additional = asArray(row.additionalInformation)
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => text(entry.description, ''))
        .filter((v) => v !== '')
        .join(' ')
      const haystack = [
        text(row.code, ''),
        text(row.name, ''),
        text(row.coverageLevel, ''),
        asArray(row.serviceTypes).map((v) => String(v)).join(' '),
        text(row.inPlanNetworkIndicator, ''),
        text(row.timeQualifier, ''),
        text(row.benefitAmount, ''),
        text(row.benefitPercent, ''),
        additional,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [benefits, coverageLevelFilter, financialOnly, networkFilter, searchText, typeFilter, withNotesOnly])
  const hasActiveFilters =
    searchText.trim() !== '' ||
    typeFilter.length > 0 ||
    coverageLevelFilter.length > 0 ||
    networkFilter.length > 0 ||
    financialOnly ||
    withNotesOnly
  const sortedBenefits = useMemo(() => {
    const rows = [...filteredBenefits]
    rows.sort((a, b) => {
      if (sortField === 'benefitAmount') {
        const av = toNumber(a.benefitAmount) ?? Number.NEGATIVE_INFINITY
        const bv = toNumber(b.benefitAmount) ?? Number.NEGATIVE_INFINITY
        return sortDirection === 'asc' ? av - bv : bv - av
      }
      if (sortField === 'benefitPercent') {
        const av = toNumber(a.benefitPercent) ?? Number.NEGATIVE_INFINITY
        const bv = toNumber(b.benefitPercent) ?? Number.NEGATIVE_INFINITY
        return sortDirection === 'asc' ? av - bv : bv - av
      }
      const av = text(a.code, '')
      const bv = text(b.code, '')
      return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return rows
  }, [filteredBenefits, sortDirection, sortField])
  const topFinancial = useMemo(() => {
    const amountRows = sortedBenefits
      .filter((row) => toNumber(row.benefitAmount) != null)
      .sort(
        (a, b) =>
          (toNumber(b.benefitAmount) ?? Number.NEGATIVE_INFINITY) -
          (toNumber(a.benefitAmount) ?? Number.NEGATIVE_INFINITY)
      )
    const percentRows = sortedBenefits
      .filter((row) => toNumber(row.benefitPercent) != null)
      .sort(
        (a, b) =>
          (toNumber(b.benefitPercent) ?? Number.NEGATIVE_INFINITY) -
          (toNumber(a.benefitPercent) ?? Number.NEGATIVE_INFINITY)
      )
    return {
      topAmount: amountRows[0] ?? null,
      topPercent: percentRows[0] ?? null,
      totalWithAmount: amountRows.length,
    }
  }, [sortedBenefits])
  const defaultInsuranceType = useMemo(
    () =>
      text(
        benefits.find((row) => String(row.code ?? '').trim() === '1')?.insuranceType,
        ''
      ),
    [benefits]
  )
  const serviceTypeHeading = useMemo(() => {
    const first = sortedBenefits[0]
    const serviceType = first ? asArray(first.serviceTypes)[0] : null
    const textValue = serviceType != null ? String(serviceType).trim() : ''
    return textValue || '30'
  }, [sortedBenefits])
  const groupedBenefitRows = useMemo(() => {
    const mapped = sortedBenefits.map((row) => {
      const type = text(row.name, '') || text(row.code, '')
      const coverageLevel = text(row.coverageLevel, 'Not set')
      const network = text(row.inPlanNetworkIndicatorCode, '') !== ''
        ? networkCodeLabel(text(row.inPlanNetworkIndicatorCode, ''))
        : text(row.inPlanNetworkIndicator, 'Not set')
      const additionalInfoItems = asArray(row.additionalInformation)
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => text(entry.description, ''))
        .filter((v) => v !== '—')
      const coverage = isStatusTypeLabel(type)
        ? coverageStatus.toLowerCase().includes('active')
          ? 'Active coverage'
          : 'Coverage needs review'
        : [formatAmount(row.benefitAmount), formatPercent(row.benefitPercent)]
            .filter((v) => v && v !== '—')
            .join(' · ') || '—'
      const benefit = isStatusTypeLabel(type)
        ? `Insurance type : ${defaultInsuranceType || '—'}`
        : additionalInfoItems.length > 0
          ? additionalInfoItems.join(' | ')
          : text(row.timeQualifier, 'Not set')
      return { type, coverageLevel, network, coverage, benefit }
    })

    return mapped.map((row, index, rows) => {
      const prev = index > 0 ? rows[index - 1] : null
      const showType = !prev || prev.type !== row.type
      const typeRowSpan = showType ? rows.slice(index).filter((r) => r.type === row.type).length : 0
      const showCoverageLevel = !prev || prev.type !== row.type || prev.coverageLevel !== row.coverageLevel
      const coverageLevelRowSpan = showCoverageLevel
        ? rows
            .slice(index)
            .filter((r) => r.type === row.type && r.coverageLevel === row.coverageLevel).length
        : 0
      return { row, showType, typeRowSpan, showCoverageLevel, coverageLevelRowSpan }
    })
  }, [sortedBenefits, coverageStatus, defaultInsuranceType])

  const updateSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }
  const sortMarker = (field: SortField): string => {
    if (sortField !== field) return ''
    return sortDirection === 'asc' ? ' \u2191' : ' \u2193'
  }
  const handleExportCsv = () => {
    const rows = sortedBenefits.map((row) => {
      const additional = asArray(row.additionalInformation)
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => text(entry.description, ''))
        .filter((v) => v !== '')
        .join(' | ')
      return {
        Code: text(row.code, ''),
        Name: text(row.name, ''),
        Coverage: text(row.coverageLevel, ''),
        ServiceTypes: asArray(row.serviceTypes).map((v) => String(v)).join(' | '),
        Network: text(row.inPlanNetworkIndicator, ''),
        TimeQualifier: text(row.timeQualifier, ''),
        Amount: text(row.benefitAmount, ''),
        Percent: text(row.benefitPercent, ''),
        AdditionalInformation: additional,
      }
    })
    const header = [
      'Code',
      'Name',
      'Coverage',
      'ServiceTypes',
      'Network',
      'TimeQualifier',
      'Amount',
      'Percent',
      'AdditionalInformation',
    ]
    const esc = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = [
      header.join(','),
      ...rows.map((row) =>
        header.map((col) => esc(String(row[col as keyof typeof row] ?? ''))).join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = `stedi-benefits-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl p-5 sm:p-8" style={surfaceCard}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold sm:text-xl" style={{ color: colors.textPrimary }}>
            Stedi eligibility response
          </h2>
          <span
            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `color-mix(in srgb, ${colors.primary} 16%, transparent)`,
              color: colors.textPrimary,
            }}
          >
            {coverageStatus}
          </span>
        </div>
        <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
          Table view based on payer response. Filters can be added next on top of this layout.
        </p>
        <div className="mt-5">
          <KeyValueGrid
            colors={colors}
            rows={[
              { label: 'Trading Partner Service ID', value: raw.tradingPartnerServiceId },
              { label: 'Control Number', value: raw.controlNumber },
              { label: 'Eligibility Search ID', value: raw.eligibilitySearchId },
              { label: 'Trace ID', value: meta?.traceId },
              { label: 'Sender ID', value: meta?.senderId },
              { label: 'Application Mode', value: meta?.applicationMode },
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl p-5 sm:p-8" style={surfaceCard}>
        <h3 className="mb-4 text-base font-semibold sm:text-lg" style={{ color: colors.textPrimary }}>
          Parties and plan context
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border p-4" style={{ borderColor: colors.border }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
              Provider
            </p>
            <KeyValueGrid
              colors={colors}
              rows={[
                { label: 'Name', value: provider?.providerName },
                { label: 'NPI', value: provider?.npi },
                { label: 'Entity Type', value: provider?.entityType },
              ]}
            />
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: colors.border }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
              Subscriber
            </p>
            <KeyValueGrid
              colors={colors}
              rows={[
                { label: 'Name', value: `${text(subscriber?.firstName, '')} ${text(subscriber?.lastName, '')}`.trim() || '—' },
                { label: 'Member ID', value: subscriber?.memberId },
                { label: 'Date of Birth', value: subscriber?.dateOfBirth },
                { label: 'Group Number', value: subscriber?.groupNumber },
                { label: 'Address', value: renderAddress(asRecord(subscriber?.address)) },
              ]}
            />
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: colors.border }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
              Payer
            </p>
            <KeyValueGrid
              colors={colors}
              rows={[
                { label: 'Name', value: payer?.name },
                { label: 'Payer ID', value: payer?.payorIdentification },
                { label: 'Entity Type', value: payer?.entityType },
              ]}
            />
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: colors.border }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textSecondary }}>
              Plan information
            </p>
            <KeyValueGrid
              colors={colors}
              rows={[
                { label: 'Plan Number', value: planInfo?.planNumber },
                { label: 'Group Number', value: planInfo?.groupNumber },
                { label: 'Group Description', value: planInfo?.groupDescription },
                { label: 'Plan Begin', value: planDates?.planBegin },
                { label: 'Eligibility Begin', value: planDates?.eligibilityBegin },
                { label: 'Service Date', value: planDates?.service },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-5 sm:p-8" style={surfaceCard}>
        <h3 className="mb-4 text-base font-semibold sm:text-lg" style={{ color: colors.textPrimary }}>
          Plan status
        </h3>
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: colors.border }}>
          <table className="min-w-full text-left text-sm" style={{ color: tableTextPrimary }}>
            <thead>
              <tr style={{ backgroundColor: 'color-mix(in srgb, #64748b 10%, transparent)' }}>
                <th className="px-3 py-2 font-semibold" style={{ color: tableHeaderText }}>Status</th>
                <th className="px-3 py-2 font-semibold" style={{ color: tableHeaderText }}>Status Code</th>
                <th className="px-3 py-2 font-semibold" style={{ color: tableHeaderText }}>Plan Details</th>
                <th className="px-3 py-2 font-semibold" style={{ color: tableHeaderText }}>Service Type Codes</th>
              </tr>
            </thead>
            <tbody>
              {planStatus.length === 0 ? (
                <tr>
                  <td className="px-3 py-3" colSpan={4} style={{ color: tableTextSecondary }}>
                    No plan status rows returned.
                  </td>
                </tr>
              ) : (
                planStatus.map((row, idx) => (
                  <tr key={idx} className="border-t" style={{ borderColor: colors.border }}>
                    <td className="px-3 py-2">{text(row.status)}</td>
                    <td className="px-3 py-2">{text(row.statusCode)}</td>
                    <td className="px-3 py-2">{text(row.planDetails)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {asArray(row.serviceTypeCodes).length === 0 ? (
                          <span>—</span>
                        ) : (
                          asArray(row.serviceTypeCodes).map((v) => (
                            <span
                              key={`${idx}-${String(v)}`}
                              className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${colors.primary} 14%, transparent)`,
                                color: colors.textPrimary,
                              }}
                            >
                              {String(v)}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl p-5 sm:p-8" style={surfaceCard}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold sm:text-lg" style={{ color: colors.textPrimary }}>
            Benefits information
          </h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium" style={{ color: tableTextSecondary }}>
              Showing {filteredBenefits.length} of {totalBenefits}
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-md border px-2.5 py-1 text-xs font-semibold"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
              }}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div
          className="sticky top-0 z-10 mb-4 rounded-xl border p-3 md:p-4"
          style={{
            borderColor: colors.border,
            backgroundColor: `color-mix(in srgb, ${colors.cardBackground} 92%, #0f172a 8%)`,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search benefits..."
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.cardBackground,
              color: colors.textPrimary,
            }}
          />
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-3">
            <MultiSelectFilter
              label="Type"
              options={uniqueTypes}
              selected={typeFilter}
              onChange={setTypeFilter}
              colors={colors}
            />
            <MultiSelectFilter
              label="Coverage level"
              options={uniqueCoverageLevels}
              selected={coverageLevelFilter}
              onChange={setCoverageLevelFilter}
              colors={colors}
            />
            <MultiSelectFilter
              label="Network"
              options={uniqueNetworks}
              selected={networkFilter}
              onChange={setNetworkFilter}
              colors={colors}
            />
          </div>
            <button
              type="button"
              onClick={() => {
                setSearchText('')
                setTypeFilter([])
                setCoverageLevelFilter([])
                setNetworkFilter([])
                setFinancialOnly(false)
                setWithNotesOnly(false)
              }}
              disabled={!hasActiveFilters}
              className="rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.cardBackground,
                color: colors.textPrimary,
              }}
            >
              Clear filters
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm" style={{ color: tableTextSecondary }}>
              <input
                type="checkbox"
                checked={financialOnly}
                onChange={(e) => setFinancialOnly(e.target.checked)}
                style={{ accentColor: colors.primary }}
              />
              Financial rows only
            </label>
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm" style={{ color: tableTextSecondary }}>
              <input
                type="checkbox"
                checked={withNotesOnly}
                onChange={(e) => setWithNotesOnly(e.target.checked)}
                style={{ accentColor: colors.primary }}
              />
              Rows with notes only
            </label>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-lg border p-3" style={{ borderColor: colors.border }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: tableTextSecondary }}>
              Top Amount
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tableTextPrimary }}>
              {topFinancial.topAmount
                ? `${text(topFinancial.topAmount.name)} - ${formatAmount(topFinancial.topAmount.benefitAmount)}`
                : '—'}
            </p>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: colors.border }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: tableTextSecondary }}>
              Top Percent
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tableTextPrimary }}>
              {topFinancial.topPercent
                ? `${text(topFinancial.topPercent.name)} - ${text(topFinancial.topPercent.benefitPercent)}`
                : '—'}
            </p>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: colors.border }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: tableTextSecondary }}>
              Financial Rows
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tableTextPrimary }}>
              {topFinancial.totalWithAmount}
            </p>
          </div>
        </div>
        <div className="mb-3">
          <h4 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
            STC {serviceTypeHeading} Health Benefit Plan Coverage
          </h4>
        </div>
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: colors.border }}>
          <div className="max-h-[560px] overflow-auto">
          <table
            className="min-w-[900px] table-fixed text-left text-xs sm:text-sm"
            style={{ color: tableTextPrimary }}
          >
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '320px' }} />
            </colgroup>
            <thead>
              <tr
                className="sticky top-0 z-[1]"
                style={{ backgroundColor: 'color-mix(in srgb, #64748b 14%, transparent)' }}
              >
                <th className="whitespace-nowrap border-r px-3 py-2 font-semibold" style={{ color: tableHeaderText, borderColor: colors.border }}>Type</th>
                <th className="whitespace-nowrap border-r px-3 py-2 font-semibold" style={{ color: tableHeaderText, borderColor: colors.border }}>Coverage level</th>
                <th className="whitespace-nowrap border-r px-3 py-2 font-semibold" style={{ color: tableHeaderText, borderColor: colors.border }}>Network indicator</th>
                <th className="whitespace-nowrap border-r px-3 py-2 font-semibold" style={{ color: tableHeaderText, borderColor: colors.border }}>Coverage</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold" style={{ color: tableHeaderText }}>Benefit</th>
              </tr>
            </thead>
            <tbody>
              {groupedBenefitRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3" colSpan={5} style={{ color: tableTextSecondary }}>
                    No benefit rows match the selected filters.
                  </td>
                </tr>
              ) : (
                groupedBenefitRows.map(({ row, showType, typeRowSpan, showCoverageLevel, coverageLevelRowSpan }, idx) => {
                  return (
                    <tr
                      key={idx}
                      className="border-t align-top transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      style={{
                        borderColor: colors.border,
                        backgroundColor:
                          idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, #64748b 5%, transparent)',
                      }}
                    >
                      {showType ? (
                        <td rowSpan={typeRowSpan} className="break-words border-r px-3 py-2 align-top leading-5" style={{ borderColor: colors.border }}>
                          {row.type}
                        </td>
                      ) : null}
                      {showCoverageLevel ? (
                        <td rowSpan={coverageLevelRowSpan} className="break-words border-r px-3 py-2 align-top leading-5" style={{ borderColor: colors.border }}>
                          {row.coverageLevel}
                        </td>
                      ) : null}
                      <td className="break-words border-r px-3 py-2 align-top leading-5" style={{ borderColor: colors.border }}>{row.network}</td>
                      <td className="break-words border-r px-3 py-2 align-top leading-5" style={{ borderColor: colors.border }}>{row.coverage}</td>
                      <td className="break-words px-3 py-2 align-top leading-5">{row.benefit}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </div>
  )
}
