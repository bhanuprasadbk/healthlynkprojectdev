import { useMemo, type ReactNode } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import type { ThemeColors } from '../contexts/ThemeContext'
import { eligibilityResultUi } from '../theme/eligibilityResultUi'

export type BenefitDetailTableRow = {
  service: string
  network: string
  coinsurance: string
  copay: string
}

type NetworkPillTone = 'yes' | 'no' | 'in' | 'out' | 'neutral'

const PROVIDER_NETWORK_PILL: Record<NetworkPillTone, string> = {
  yes: 'border-emerald-500/50 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80',
  no: 'border-rose-500/50 bg-rose-100 text-rose-900 ring-1 ring-rose-200/80',
  in: 'border-sky-500/50 bg-sky-100 text-sky-900 ring-1 ring-sky-200/80',
  out: 'border-amber-600/45 bg-amber-50 text-amber-950 ring-1 ring-amber-200/80',
  neutral: 'border-slate-300 bg-slate-100 text-slate-800 ring-1 ring-slate-200/80',
}

function networkPillTone(value: string): NetworkPillTone {
  const lower = value.trim().toLowerCase()
  if (lower === 'yes' || lower === 'y') return 'yes'
  if (lower === 'no' || lower === 'n') return 'no'
  if (lower.includes('in network') || lower === 'in-network') return 'in'
  if (lower.includes('out of network') || lower === 'out-of-network') return 'out'
  return 'neutral'
}

function NetworkCell({ value, providerMode = false }: { value: string; providerMode?: boolean }) {
  const lower = value.trim().toLowerCase()
  const display =
    lower === 'yes' || lower === 'y'
      ? 'Yes'
      : lower === 'no' || lower === 'n'
        ? 'No'
        : value

  if (!providerMode) {
    const tone = networkPillTone(value)
    const darkClass =
      tone === 'yes'
        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
        : tone === 'no' || tone === 'out'
          ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
          : tone === 'in'
            ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
            : 'border-slate-600 text-slate-300'
    return (
      <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] ${darkClass}`}>
        {display}
      </span>
    )
  }

  const tone = networkPillTone(value)
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${PROVIDER_NETWORK_PILL[tone]}`}
    >
      {display}
    </span>
  )
}

function providerTableColors(colors: ThemeColors) {
  return {
    headerBg: colors.tableHeaderBackground,
    headerText: colors.tableHeaderText,
    border: colors.tableBorder,
    rowEven: colors.tableRowBackground,
    rowOdd: colors.tableRowHover,
    text: colors.textPrimary,
    muted: colors.textSecondary,
  }
}

export function BenefitDetailsTable({
  rows,
  emptyMessage,
  providerMode = false,
}: {
  rows: BenefitDetailTableRow[]
  emptyMessage?: string
  providerMode?: boolean
}) {
  const { theme } = useTheme()
  const ui = useMemo(
    () => eligibilityResultUi(providerMode, theme.colors),
    [providerMode, theme.colors]
  )
  const tableColors = providerMode ? providerTableColors(theme.colors) : null

  const thClass = providerMode
    ? 'border-b-2 border-r px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] last:border-r-0'
    : 'whitespace-nowrap px-3 py-2 text-[11px] uppercase tracking-wide text-slate-400'

  const tdClass = providerMode
    ? 'border-r border-b px-4 py-3 align-middle last:border-r-0'
    : 'px-3 py-2'

  return (
    <div className={providerMode ? 'overflow-x-auto bg-white' : 'overflow-x-auto'}>
      <table
        className={`w-full min-w-[760px] text-left ${providerMode ? 'border-collapse text-sm' : 'text-xs sm:text-sm'}`}
        style={providerMode && tableColors ? { borderColor: tableColors.border } : undefined}
      >
        <thead
          className={providerMode ? '' : 'bg-slate-900/80'}
          style={
            providerMode && tableColors
              ? {
                  backgroundColor: tableColors.headerBg,
                  borderColor: tableColors.border,
                }
              : providerMode
                ? ui.benefitTableHeaderStyle
                : undefined
          }
        >
          <tr>
            {['Service', 'Network', 'Co-insurance', 'Copay'].map((label) => (
              <th
                key={label}
                className={thClass}
                style={
                  providerMode && tableColors
                    ? {
                        color: tableColors.headerText,
                        borderColor: tableColors.border,
                      }
                    : providerMode
                      ? ui.labelStyle
                      : undefined
                }
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr
              className={providerMode ? '' : 'border-t border-slate-800'}
              style={providerMode && tableColors ? { borderColor: tableColors.border } : undefined}
            >
              <td
                colSpan={4}
                className={providerMode ? 'px-4 py-4 text-sm' : 'px-3 py-3 text-sm'}
                style={providerMode ? ui.mutedStyle : { color: '#94a3b8' }}
              >
                {emptyMessage ?? 'No benefit rows available.'}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={`benefit-row-${idx}`}
                className={
                  providerMode
                    ? 'transition-colors hover:bg-sky-50/60'
                    : 'border-t border-slate-800'
                }
                style={
                  providerMode && tableColors
                    ? {
                        backgroundColor: idx % 2 === 0 ? tableColors.rowEven : tableColors.rowOdd,
                        borderColor: tableColors.border,
                      }
                    : providerMode
                      ? ui.benefitTableRowStyle
                      : undefined
                }
              >
                <td
                  className={`${tdClass} ${providerMode ? 'font-medium' : ''}`}
                  style={
                    providerMode && tableColors
                      ? { borderColor: tableColors.border, color: tableColors.text }
                      : { color: '#e2e8f0' }
                  }
                >
                  {row.service}
                </td>
                <td
                  className={tdClass}
                  style={providerMode && tableColors ? { borderColor: tableColors.border } : undefined}
                >
                  <NetworkCell value={row.network} providerMode={providerMode} />
                </td>
                <td
                  className={tdClass}
                  style={
                    providerMode && tableColors
                      ? { borderColor: tableColors.border, color: tableColors.text }
                      : { color: '#e2e8f0' }
                  }
                >
                  {row.coinsurance}
                </td>
                <td
                  className={tdClass}
                  style={
                    providerMode && tableColors
                      ? { borderColor: tableColors.border, color: tableColors.text }
                      : { color: '#e2e8f0' }
                  }
                >
                  {row.copay}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function ProviderBenefitCardHeader({
  title,
  badge,
  subtitle,
  footerNote,
  ui,
  colors,
}: {
  title: ReactNode
  badge?: string
  subtitle?: string
  footerNote?: string
  ui: ReturnType<typeof eligibilityResultUi>
  colors: ThemeColors
}) {
  return (
    <div className={ui.benefitSectionHeaderClass} style={ui.benefitSectionHeaderStyle}>
      <div
        className="h-9 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: colors.primary }}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          {typeof title === 'string' ? (
            <h3
              className="text-[15px] font-semibold leading-snug tracking-tight"
              style={{ color: colors.textPrimary }}
            >
              {title}
            </h3>
          ) : (
            title
          )}
          {subtitle ? (
            <p className="mt-0.5 text-xs" style={ui.mutedStyle}>
              {subtitle}
            </p>
          ) : null}
          {footerNote ? (
            <p className="mt-1 text-[11px]" style={ui.mutedStyle}>
              {footerNote}
            </p>
          ) : null}
        </div>
        {badge ? (
          <span
            className="shrink-0 rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{
              backgroundColor: colors.primaryLight,
              borderColor: colors.primary,
              color: colors.primary,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export type BenefitDetailsSectionProps = {
  title: ReactNode
  badge?: string
  badgeTone?: 'stc' | 'cpt' | 'hcpc'
  subtitle?: string
  footerNote?: string
  rows: BenefitDetailTableRow[]
  emptyMessage?: string
  providerMode?: boolean
}

export function BenefitDetailsSection({
  title,
  badge,
  badgeTone = 'stc',
  subtitle,
  footerNote,
  rows,
  emptyMessage,
  providerMode = false,
}: BenefitDetailsSectionProps) {
  const { theme } = useTheme()
  const ui = useMemo(
    () => eligibilityResultUi(providerMode, theme.colors),
    [providerMode, theme.colors]
  )

  const badgeClass =
    badgeTone === 'hcpc'
      ? providerMode
        ? 'border border-purple-300 bg-purple-100 font-semibold text-purple-900 ring-1 ring-purple-200'
        : 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-400/30'
      : badgeTone === 'cpt'
        ? providerMode
          ? 'border border-sky-300 bg-sky-100 font-semibold text-sky-900 ring-1 ring-sky-200'
          : 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/30'
        : providerMode
          ? 'border border-slate-300 bg-slate-100 font-semibold text-slate-800'
          : 'border-slate-600 text-slate-300'

  return (
    <div
      className={providerMode ? ui.benefitSectionClass : 'overflow-hidden rounded-xl border border-slate-700'}
      style={providerMode ? ui.benefitSectionStyle : undefined}
    >
      {providerMode ? (
        <ProviderBenefitCardHeader
          title={title}
          badge={badge}
          subtitle={subtitle}
          footerNote={footerNote}
          ui={ui}
          colors={theme.colors}
        />
      ) : (
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 bg-slate-800/80 px-4 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {typeof title === 'string' ? (
                <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
              ) : (
                title
              )}
              {badge && badgeTone !== 'stc' ? (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
                >
                  {badge}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
            {footerNote ? <p className="mt-1 text-[11px] text-slate-500">{footerNote}</p> : null}
          </div>
          {badge ? (
            <span
              className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] ${
                badgeTone === 'stc' ? 'border-slate-600 text-slate-300' : badgeClass
              }`}
            >
              {badge}
            </span>
          ) : null}
        </div>
      )}
      <BenefitDetailsTable rows={rows} emptyMessage={emptyMessage} providerMode={providerMode} />
    </div>
  )
}
