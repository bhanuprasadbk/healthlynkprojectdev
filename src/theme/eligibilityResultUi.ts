import type { CSSProperties } from 'react'
import type { ThemeColors } from '../contexts/ThemeContext'

export type EligibilityResultUi = {
  cardClass: string
  cardStyle: CSSProperties
  cardHeaderStyle: CSSProperties
  labelStyle: CSSProperties
  valueStyle: CSSProperties
  mutedStyle: CSSProperties
  sectionTitleStyle: CSSProperties
  dividerStyle: CSSProperties
  patientNameClass: string
  patientNameStyle: CSSProperties
  coverageActiveClass: string
  coverageActiveStyle: CSSProperties
  coverageInactiveClass: string
  coverageInactiveStyle: CSSProperties
  coverageDotStyle: CSSProperties
  payorPillClass: string
  payorPillStyle: CSSProperties
  payorCardClass: string
  payorCardStyle: CSSProperties
  payorCardLabelStyle: CSSProperties
  payorCardPrimaryStyle: CSSProperties
  payorCardSecondaryStyle: CSSProperties
  amountInNetwork: string
  amountOutOfNetwork: string
  remainingAmount: string
  searchInputClass: string
  searchInputStyle: CSSProperties
  chatPanelClass: string
  chatPanelStyle: CSSProperties
  deductibleCardClass: string
  deductibleCardStyle: CSSProperties
  nestedCardClass: string
  nestedCardStyle: CSSProperties
  gridCellClass: string
  gridCellStyle: CSSProperties
  rowDividerClass: string
  rowDividerStyle: CSSProperties
  progressTrackStyle: CSSProperties
  benefitSectionClass: string
  benefitSectionStyle: CSSProperties
  benefitSectionHeaderClass: string
  benefitSectionHeaderStyle: CSSProperties
  benefitTableHeaderClass: string
  benefitTableHeaderStyle: CSSProperties
  benefitTableRowClass: string
  benefitTableRowStyle: CSSProperties
  benefitTableCellClass: string
  benefitTableCellStyle: CSSProperties
}

const darkUi: EligibilityResultUi = {
  cardClass: 'rounded-2xl border border-slate-700/70 bg-[#171f3a]/90 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]',
  cardStyle: {},
  cardHeaderStyle: {},
  labelStyle: { color: '#94a3b8' },
  valueStyle: { color: '#f1f5f9' },
  mutedStyle: { color: '#64748b' },
  sectionTitleStyle: { color: '#64748b' },
  dividerStyle: { backgroundColor: 'rgba(30, 41, 59, 0.8)' },
  patientNameClass: 'mt-3 text-[28px] font-bold tracking-tight text-slate-50',
  patientNameStyle: {},
  coverageActiveClass:
    'inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300',
  coverageActiveStyle: {},
  coverageInactiveClass:
    'inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-300',
  coverageInactiveStyle: {},
  coverageDotStyle: { backgroundColor: '#6ee7b7' },
  payorPillClass:
    'inline-flex items-center rounded-xl border border-indigo-400/30 bg-indigo-400/15 px-4 py-2 text-sm text-indigo-200',
  payorPillStyle: {},
  payorCardClass:
    'inline-flex max-w-full items-center rounded-xl border border-indigo-400/30 bg-indigo-400/15 px-4 py-2 text-sm text-indigo-200',
  payorCardStyle: {},
  payorCardLabelStyle: {},
  payorCardPrimaryStyle: {},
  payorCardSecondaryStyle: {},
  amountInNetwork: 'text-cyan-300',
  amountOutOfNetwork: 'text-rose-300',
  remainingAmount: 'font-bold text-rose-300',
  searchInputClass:
    'w-full rounded-lg border border-slate-700 bg-slate-900/80 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40',
  searchInputStyle: {},
  chatPanelClass: 'rounded-2xl border border-slate-700 bg-slate-900/70 p-3',
  chatPanelStyle: {},
  deductibleCardClass:
    'relative overflow-hidden rounded-2xl border border-slate-700/80 bg-[#182343] px-5 py-4 text-sm shadow-[0_10px_24px_rgba(2,6,23,0.3)]',
  deductibleCardStyle: {},
  nestedCardClass: 'overflow-hidden rounded-xl border border-slate-700/80 bg-[#121a33] shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
  nestedCardStyle: {},
  gridCellClass: 'border-b border-r border-slate-700 p-4 sm:[&:nth-child(2n)]:border-r-0',
  gridCellStyle: {},
  rowDividerClass: 'border-b border-slate-700 pb-3',
  rowDividerStyle: {},
  progressTrackStyle: { backgroundColor: '#334155' },
  benefitSectionClass: 'overflow-hidden rounded-xl border border-slate-700',
  benefitSectionStyle: {},
  benefitSectionHeaderClass: 'flex items-start justify-between gap-3 border-b border-slate-700 bg-slate-800/80 px-4 py-2',
  benefitSectionHeaderStyle: {},
  benefitTableHeaderClass: 'bg-slate-900/80',
  benefitTableHeaderStyle: {},
  benefitTableRowClass: 'border-t border-slate-800',
  benefitTableRowStyle: {},
  benefitTableCellClass: 'text-slate-200',
  benefitTableCellStyle: {},
}

/** Provider portal cards — same tokens as Patient Intake (`providerIntakeChatUi`). */
export function eligibilityResultUi(providerMode: boolean, colors: ThemeColors): EligibilityResultUi {
  if (!providerMode) return darkUi

  return {
    cardClass: 'rounded-2xl border p-6 shadow-sm',
    cardStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
    cardHeaderStyle: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.cardBorder,
    },
    labelStyle: { color: colors.textSecondary },
    valueStyle: { color: colors.textPrimary },
    mutedStyle: { color: colors.textSecondary },
    sectionTitleStyle: { color: colors.textSecondary },
    dividerStyle: { backgroundColor: colors.border },
    patientNameClass: 'mt-4 text-[26px] font-bold leading-tight tracking-tight sm:text-[28px]',
    patientNameStyle: { color: colors.textPrimary },
    coverageActiveClass:
      'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] shadow-sm',
    coverageActiveStyle: {
      backgroundColor: '#ecfdf5',
      borderColor: '#34d399',
      color: '#047857',
    },
    coverageInactiveClass:
      'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] shadow-sm',
    coverageInactiveStyle: {
      backgroundColor: '#fffbeb',
      borderColor: '#fbbf24',
      color: '#b45309',
    },
    coverageDotStyle: { backgroundColor: '#10b981' },
    payorPillClass: 'inline-flex items-center rounded-xl border px-4 py-2 text-sm',
    payorPillStyle: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
      color: colors.primary,
    },
    payorCardClass: 'w-full shrink-0 rounded-xl border px-4 py-3 shadow-sm sm:max-w-sm lg:w-auto lg:min-w-[240px]',
    payorCardStyle: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    payorCardLabelStyle: {
      color: colors.textSecondary,
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
    },
    payorCardPrimaryStyle: {
      color: colors.textPrimary,
    },
    payorCardSecondaryStyle: {},
    amountInNetwork: 'text-sky-600',
    amountOutOfNetwork: 'text-rose-600',
    remainingAmount: 'font-bold text-rose-600',
    searchInputClass:
      'w-full rounded-lg border py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2',
    searchInputStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    chatPanelClass: 'rounded-2xl border p-3 shadow-sm',
    chatPanelStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
    deductibleCardClass: 'relative overflow-hidden rounded-2xl border px-5 py-4 text-sm shadow-sm',
    deductibleCardStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
    nestedCardClass: 'overflow-hidden rounded-xl border shadow-sm',
    nestedCardStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
    gridCellClass: 'border-b border-r p-4 sm:[&:nth-child(2n)]:border-r-0',
    gridCellStyle: { borderColor: colors.border },
    rowDividerClass: 'border-b pb-3',
    rowDividerStyle: { borderColor: colors.border },
    progressTrackStyle: { backgroundColor: colors.border },
    benefitSectionClass: 'overflow-hidden rounded-xl border shadow-sm',
    benefitSectionStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
    benefitSectionHeaderClass: 'flex items-center gap-3 border-b px-5 py-4',
    benefitSectionHeaderStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.tableBorder,
    },
    benefitTableHeaderClass: '',
    benefitTableHeaderStyle: {
      backgroundColor: colors.tableHeaderBackground,
      color: colors.tableHeaderText,
    },
    benefitTableRowClass: 'border-t',
    benefitTableRowStyle: { borderColor: colors.border },
    benefitTableCellClass: '',
    benefitTableCellStyle: { color: colors.textPrimary },
  }
}
