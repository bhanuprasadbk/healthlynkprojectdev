import type { CSSProperties } from 'react'
import type { ThemeColors } from '../contexts/ThemeContext'
import {
  AI_ELIGIBILITY_FLOW_BG_CLASS,
  AI_ELIGIBILITY_FLOW_GRADIENT_CLASS,
} from './aiEligibilityFlowShell'

export type IntakeChatUi = {
  shellClass: string
  shellStyle?: CSSProperties
  showGradient: boolean
  titleClass: string
  subtitleClass: string
  subtitleStyle?: CSSProperties
  iconWrapClass: string
  iconWrapStyle?: CSSProperties
  iconClass: string
  sectionClass: string
  sectionStyle?: CSSProperties
  botBubbleClass: string
  botBubbleStyle?: CSSProperties
  userBubbleClass: string
  userBubbleStyle?: CSSProperties
  botAvatarClass: string
  botAvatarStyle?: CSSProperties
  userAvatarClass: string
  userAvatarStyle?: CSSProperties
  typingBubbleClass: string
  typingBubbleStyle?: CSSProperties
  actionPanelClass: string
  actionPanelStyle?: CSSProperties
  actionHintClass: string
  actionHintStyle?: CSSProperties
  optionBtnClass: string
  optionBtnStyle?: CSSProperties
  choicePanelClass: string
  choicePanelStyle?: CSSProperties
  choiceHintClass: string
  choiceHintStyle?: CSSProperties
  listOptionBtnClass: string
  listOptionBtnStyle?: CSSProperties
  listOptionMetaClass: string
  listOptionMetaStyle?: CSSProperties
  fieldInputClass: string
  fieldInputStyle?: CSSProperties
  statusPanelClass: string
  statusPanelStyle?: CSSProperties
  statusTextStyle?: CSSProperties
  statusSpinnerClass: string
  statusSpinnerStyle?: CSSProperties
  errorPanelClass: string
  errorPanelStyle?: CSSProperties
  errorTextStyle?: CSSProperties
  cardPersonRowClass: string
  cardPersonRowStyle?: CSSProperties
  providerSummaryClass: string
  providerSummaryStyle?: CSSProperties
  providerSummaryAvatarStyle?: CSSProperties
  providerSummaryMetaStyle?: CSSProperties
  completePanelClass: string
  completePanelStyle?: CSSProperties
  completeMessageClass: string
  completeMessageStyle?: CSSProperties
  inputBarWrapClass: string
  inputBarInnerClass: string
  inputBarInnerStyle?: CSSProperties
  inputClass: string
  sendBtnClass: string
  sendBtnStyle?: CSSProperties
  scrollAreaClass: string
}

export function darkIntakeChatUi(): IntakeChatUi {
  return {
    shellClass: 'h-screen overflow-hidden bg-slate-950 px-4 pb-28 pt-5 text-slate-100 sm:px-6',
    showGradient: true,
    titleClass: 'text-2xl font-semibold tracking-tight text-slate-100',
    subtitleClass: 'text-sm text-slate-300',
    iconWrapClass: 'rounded-xl bg-violet-500/20 p-2.5 text-violet-300',
    iconClass: 'text-violet-300',
    sectionClass:
      'flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-800/80 bg-slate-900/75 p-3 shadow-[0_20px_70px_rgba(2,6,23,0.45)] backdrop-blur sm:p-4',
    botBubbleClass:
      'border border-slate-700/70 bg-slate-800/55 text-slate-200',
    userBubbleClass: 'border border-violet-400/30 bg-violet-500/20 text-violet-100',
    botAvatarClass:
      'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-200',
    userAvatarClass:
      'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/30 text-violet-100',
    typingBubbleClass:
      'inline-flex max-w-[92%] items-start gap-2 rounded-2xl border border-slate-700/70 bg-slate-800/55 px-4 py-3 text-sm leading-relaxed text-slate-200 shadow-sm',
    actionPanelClass: 'max-w-[92%] space-y-2 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-3',
    actionHintClass: 'text-xs text-violet-200',
    optionBtnClass:
      'inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 transition hover:border-violet-400',
    choicePanelClass: 'max-w-[92%] space-y-2 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-3',
    choiceHintClass: 'text-xs text-violet-200',
    listOptionBtnClass:
      'block w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-left text-sm transition hover:border-violet-400',
    listOptionMetaClass: 'ml-2 text-xs text-slate-400',
    fieldInputClass:
      'w-full rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400 sm:max-w-sm sm:text-sm',
    statusPanelClass:
      'max-w-[92%] rounded-2xl border border-violet-400/25 bg-violet-500/10 p-3 text-xs text-violet-100',
    statusSpinnerClass: 'h-3.5 w-3.5 shrink-0 animate-spin',
    errorPanelClass: 'rounded-xl border border-rose-400/35 bg-rose-500/10 p-3',
    errorTextStyle: { color: '#fecaca' },
    cardPersonRowClass:
      'flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100',
    providerSummaryClass:
      'inline-flex max-w-[92%] items-start gap-2 rounded-2xl bg-slate-700/25 px-4 py-2.5 text-sm leading-relaxed text-slate-200',
    providerSummaryAvatarStyle: { backgroundColor: '#334155', color: '#e2e8f0' },
    providerSummaryMetaStyle: { color: '#cbd5e1' },
    completePanelClass: 'max-w-[92%] rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3',
    completeMessageClass: 'inline-flex items-center gap-2 text-sm text-emerald-300',
    inputBarWrapClass:
      'fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-3 pb-4 pt-5 sm:px-6',
    inputBarInnerClass:
      'mx-auto flex w-full max-w-6xl items-center gap-2 rounded-3xl border border-slate-700/80 bg-slate-900/95 px-3 py-2 shadow-[0_12px_40px_rgba(15,23,42,0.55)]',
    inputClass:
      'w-full bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500',
    sendBtnClass:
      'inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-900/40 transition hover:bg-violet-500',
    scrollAreaClass:
      'min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pr-1.5 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.7)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/70 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-content hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/80 sm:px-3 sm:pr-2',
  }
}

export function providerIntakeChatUi(colors: ThemeColors): IntakeChatUi {
  return {
    shellClass: 'relative h-full min-h-0 w-full overflow-hidden px-4 pb-28 pt-5 sm:px-6',
    shellStyle: { backgroundColor: colors.background, color: colors.textPrimary },
    showGradient: false,
    titleClass: 'text-2xl font-semibold tracking-tight',
    subtitleClass: 'text-sm',
    subtitleStyle: { color: colors.textSecondary },
    iconWrapClass: 'rounded-xl p-2.5',
    iconWrapStyle: { backgroundColor: colors.primaryLight, color: colors.primary },
    iconClass: '',
    sectionClass: 'flex min-h-0 flex-1 flex-col rounded-3xl border p-3 shadow-sm sm:p-4',
    sectionStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
    },
    botBubbleClass: 'border text-sm leading-relaxed',
    botBubbleStyle: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    userBubbleClass: 'border text-sm leading-relaxed',
    userBubbleStyle: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
      color: colors.textPrimary,
    },
    botAvatarClass:
      'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
    botAvatarStyle: { backgroundColor: colors.border, color: colors.textPrimary },
    userAvatarClass:
      'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
    userAvatarStyle: { backgroundColor: colors.primary, color: '#ffffff' },
    typingBubbleClass:
      'inline-flex max-w-[92%] items-start gap-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm',
    typingBubbleStyle: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    actionPanelClass: 'max-w-[92%] space-y-3 rounded-2xl border p-4',
    actionPanelStyle: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.cardBorder,
    },
    actionHintClass: 'text-xs font-medium',
    actionHintStyle: { color: colors.textSecondary },
    optionBtnClass:
      'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    optionBtnStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
      outlineColor: colors.primary,
    },
    choicePanelClass: 'max-w-[92%] space-y-3 rounded-2xl border p-4',
    choicePanelStyle: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.cardBorder,
    },
    choiceHintClass: 'text-xs font-medium',
    choiceHintStyle: { color: colors.textSecondary },
    listOptionBtnClass:
      'block w-full rounded-full border px-4 py-2.5 text-left text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    listOptionBtnStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
      outlineColor: colors.primary,
    },
    listOptionMetaClass: 'ml-2 text-xs font-normal',
    listOptionMetaStyle: { color: colors.textSecondary },
    fieldInputClass:
      'w-full rounded-full border px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 sm:max-w-sm',
    fieldInputStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    statusPanelClass: 'max-w-[92%] rounded-2xl border px-4 py-3 text-sm shadow-sm',
    statusPanelStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    statusTextStyle: { color: colors.textPrimary },
    statusSpinnerClass: 'h-4 w-4 shrink-0 animate-spin',
    statusSpinnerStyle: { color: colors.primary },
    errorPanelClass: 'rounded-2xl border p-4',
    errorPanelStyle: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
    },
    errorTextStyle: { color: '#b91c1c' },
    cardPersonRowClass:
      'flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50',
    cardPersonRowStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    providerSummaryClass:
      'inline-flex max-w-[92%] items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm',
    providerSummaryStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    providerSummaryAvatarStyle: {
      backgroundColor: colors.primaryLight,
      color: colors.primary,
    },
    providerSummaryMetaStyle: { color: colors.textSecondary },
    completePanelClass: 'max-w-[92%] rounded-2xl border p-4',
    completePanelStyle: {
      backgroundColor: '#ecfdf5',
      borderColor: '#86efac',
    },
    completeMessageClass: 'inline-flex items-center gap-2 text-sm font-medium',
    completeMessageStyle: { color: '#047857' },
    inputBarWrapClass: 'absolute bottom-0 left-0 right-0 z-20 px-3 pb-4 pt-5 sm:px-6',
    inputBarInnerClass: 'mx-auto flex w-full max-w-6xl items-center gap-2 rounded-3xl border px-3 py-2 shadow-sm',
    inputBarInnerStyle: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    inputClass: 'w-full bg-transparent px-2 py-2 text-sm outline-none',
    sendBtnClass:
      'inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90',
    sendBtnStyle: { backgroundColor: colors.primary },
    scrollAreaClass:
      'min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pr-1.5 sm:px-3 sm:pr-2',
  }
}

export function intakeChatGradientClass(): string {
  return AI_ELIGIBILITY_FLOW_GRADIENT_CLASS
}

export function intakeChatDarkBgClass(): string {
  return AI_ELIGIBILITY_FLOW_BG_CLASS
}
