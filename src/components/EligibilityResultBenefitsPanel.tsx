import { useMemo } from 'react'
import { Bot, Send, UserRound } from 'lucide-react'
import Button from './forms/Button'
import ServiceCodeCoverageCard from './ServiceCodeCoverageCard'
import { useTheme } from '../contexts/ThemeContext'
import { eligibilityResultUi } from '../theme/eligibilityResultUi'
import { providerIntakeChatUi } from '../theme/intakeChatUi'
import type { EligibilityServiceResult } from '../utils/getEligibilityByProductSlugs'
import type { BenefitDetailTableRow } from './BenefitDetailsTableSection'
import type { NppesProviderTableRow } from '../services/npiRegistry'

export type BenefitChatMessage = {
  role: 'assistant' | 'user'
  text: string
}

export type ServiceCodeOption = {
  value: string
  label: string
}

export type ServiceCoverageResultItem = {
  result: EligibilityServiceResult
  additionalRows: BenefitDetailTableRow[]
}

type BenefitsCoverageSectionProps = {
  showBenefitDetails: boolean
  serviceCodeCoverageResults: ServiceCoverageResultItem[]
  providerMode?: boolean
}

export function EligibilityBenefitsCoverageSection({
  showBenefitDetails,
  serviceCodeCoverageResults,
  providerMode = false,
}: BenefitsCoverageSectionProps) {
  const { theme } = useTheme()
  const ui = useMemo(
    () => eligibilityResultUi(providerMode, theme.colors),
    [providerMode, theme.colors]
  )

  if (!showBenefitDetails || serviceCodeCoverageResults.length === 0) {
    return null
  }

  return (
    <section className="space-y-4 py-1">
      <div className="flex items-center gap-3 pb-2">
        <h2
          className="text-[11px] font-medium uppercase tracking-[0.15em]"
          style={ui.sectionTitleStyle}
        >
          Benefits
        </h2>
        <div className="h-px min-w-[2rem] flex-1" style={ui.dividerStyle} />
      </div>
      <div className="space-y-5">
        {serviceCodeCoverageResults.map(({ result, additionalRows }) => (
          <ServiceCodeCoverageCard
            key={`benefit-grid-${result.serviceCode}`}
            result={result}
            additionalRows={additionalRows}
            providerMode={providerMode}
          />
        ))}
      </div>
    </section>
  )
}

type BenefitServiceChatSectionProps = {
  cptOptionPrefix: string
  coordinateRadioName?: string
  isBenefitChatOpen: boolean
  isCoordinateModalOpen: boolean
  benefitChatMessages: BenefitChatMessage[]
  benefitServiceSuggestions: ServiceCodeOption[]
  benefitChatDraft: string
  onBenefitChatDraftChange: (value: string) => void
  selectedProcedureCpts: { optionValue: string }[]
  selectedServiceCodes: string[]
  coordFirstName: string
  coordStep: 'first' | 'last' | 'results'
  coordSearchError: string
  coordRows: NppesProviderTableRow[]
  selectedCoordRowKey: string
  onResetBenefitChat: () => void
  onOpenBenefitChat: () => void
  onDismissCoordinate: () => void
  onOpenCoordinate: () => void
  onBenefitServiceSelect: (option: ServiceCodeOption) => void
  onSubmitBenefitQuestion: () => void
  onCoordFirstName: (value: string) => void
  onCoordLastName: (value: string) => void
  onCoordStep: (step: 'first' | 'last' | 'results') => void
  onCoordSearchError: (value: string) => void
  onClearBenefitChatDraft: () => void
  onSelectCoordRow: (rowKey: string) => void
  onRunCoordinateSearch: (firstName?: string, lastName?: string) => void
  onProceedCoordinate: () => void
  providerMode?: boolean
  /** When true, only the prescription coordination prompts are shown (pVerify path). */
  coordinateOnly?: boolean
}

export function EligibilityBenefitServiceChatSection({
  cptOptionPrefix,
  coordinateRadioName = 'coordinate-provider',
  isBenefitChatOpen,
  isCoordinateModalOpen,
  benefitChatMessages,
  benefitServiceSuggestions,
  benefitChatDraft,
  onBenefitChatDraftChange,
  selectedProcedureCpts,
  selectedServiceCodes,
  coordFirstName,
  coordStep,
  coordSearchError,
  coordRows,
  selectedCoordRowKey,
  onResetBenefitChat,
  onOpenBenefitChat,
  onDismissCoordinate,
  onOpenCoordinate,
  onBenefitServiceSelect,
  onSubmitBenefitQuestion,
  onCoordFirstName,
  onCoordLastName,
  onCoordStep,
  onCoordSearchError,
  onClearBenefitChatDraft,
  onSelectCoordRow,
  onRunCoordinateSearch,
  onProceedCoordinate,
  providerMode = false,
  coordinateOnly = false,
}: BenefitServiceChatSectionProps) {
  const { theme } = useTheme()
  const ui = useMemo(
    () => eligibilityResultUi(providerMode, theme.colors),
    [providerMode, theme.colors]
  )
  const chatUi = useMemo(
    () => (providerMode ? providerIntakeChatUi(theme.colors) : null),
    [providerMode, theme.colors]
  )

  const handleCoordEnter = (value: string) => {
    if (!value) return
    if (coordStep === 'first') {
      onCoordFirstName(value)
      onCoordStep('last')
      onCoordSearchError('')
      onClearBenefitChatDraft()
      return
    }
    if (coordStep === 'last') {
      onCoordLastName(value)
      onCoordStep('results')
      onCoordSearchError('')
      onClearBenefitChatDraft()
      onRunCoordinateSearch(coordFirstName, value)
    }
  }

  const handleSendClick = () => {
    if (isCoordinateModalOpen) {
      const value = benefitChatDraft.trim()
      if (!value) return
      if (coordStep === 'first') {
        onCoordFirstName(value)
        onCoordStep('last')
        onCoordSearchError('')
        onClearBenefitChatDraft()
        return
      }
      if (coordStep === 'last') {
        onCoordLastName(value)
        onCoordStep('results')
        onCoordSearchError('')
        onClearBenefitChatDraft()
        onRunCoordinateSearch(coordFirstName, value)
        return
      }
      if (coordStep === 'results' && value.toLowerCase() === 'search again') {
        onRunCoordinateSearch()
        onClearBenefitChatDraft()
      }
      return
    }
    onSubmitBenefitQuestion()
  }

  return (
    <section
      className={providerMode ? ui.cardClass : 'rounded-2xl border border-slate-800 bg-slate-900 p-5'}
      style={providerMode ? ui.cardStyle : undefined}
    >
      <div className="space-y-3">
        {!coordinateOnly && (
          <>
            <div
              className={
                providerMode
                  ? 'max-w-2xl rounded-2xl border px-4 py-3 text-sm shadow-sm'
                  : 'max-w-2xl rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-200'
              }
              style={
                providerMode
                  ? {
                      backgroundColor: theme.colors.primaryLight,
                      borderColor: theme.colors.cardBorder,
                      color: theme.colors.textPrimary,
                    }
                  : undefined
              }
            >
              Would you like to learn about a specific service?
            </div>
            <div
              className={
                providerMode && chatUi
                  ? chatUi.choicePanelClass
                  : 'rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4'
              }
              style={providerMode && chatUi ? chatUi.choicePanelStyle : undefined}
            >
              <p
                className={providerMode && chatUi ? chatUi.choiceHintClass : 'text-xs text-slate-300'}
                style={providerMode && chatUi ? chatUi.choiceHintStyle : undefined}
              >
                Choose one option to continue
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onResetBenefitChat}>
                  Not now
                </Button>
                <Button type="button" variant="primary" onClick={onOpenBenefitChat}>
                  Yes, learn specific service
                </Button>
              </div>
            </div>
          </>
        )}
        <div
          className={
            providerMode
              ? 'max-w-2xl rounded-2xl border px-4 py-3 text-sm shadow-sm'
              : 'max-w-2xl rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-200'
          }
          style={
            providerMode
              ? {
                  backgroundColor: theme.colors.primaryLight,
                  borderColor: theme.colors.cardBorder,
                  color: theme.colors.textPrimary,
                }
              : undefined
          }
        >
          Would you like us to coordinate your prescription request?
        </div>
        <div
          className={
            providerMode && chatUi
              ? chatUi.choicePanelClass
              : 'rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4'
          }
          style={providerMode && chatUi ? chatUi.choicePanelStyle : undefined}
        >
          <p
            className={providerMode && chatUi ? chatUi.choiceHintClass : 'text-xs text-slate-300'}
            style={providerMode && chatUi ? chatUi.choiceHintStyle : undefined}
          >
            Choose one option to continue
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onDismissCoordinate}>
              Not now
            </Button>
            <Button type="button" variant="primary" onClick={onOpenCoordinate}>
              Coordinate Prescription Request
            </Button>
          </div>
        </div>
        {(isBenefitChatOpen || isCoordinateModalOpen) && (
          <div className={providerMode ? ui.chatPanelClass : 'rounded-2xl border border-slate-700 bg-slate-900/70 p-3'} style={providerMode ? ui.chatPanelStyle : undefined}>
            <div className="space-y-3">
              {isBenefitChatOpen &&
                benefitChatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={
                        providerMode && chatUi
                          ? `inline-flex max-w-[92%] items-start gap-2 rounded-2xl px-3 py-2 text-sm ${
                              message.role === 'user' ? chatUi.userBubbleClass : chatUi.botBubbleClass
                            }`
                          : `inline-flex max-w-[92%] items-start gap-2 rounded-2xl px-3 py-2 text-sm ${
                              message.role === 'user'
                                ? 'border border-violet-400/30 bg-violet-500/20 text-violet-100'
                                : 'border border-slate-700 bg-slate-800/80 text-slate-200'
                            }`
                      }
                      style={
                        providerMode && chatUi
                          ? message.role === 'user'
                            ? chatUi.userBubbleStyle
                            : chatUi.botBubbleStyle
                          : undefined
                      }
                    >
                      {message.role === 'assistant' ? (
                        <Bot
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={providerMode ? { color: theme.colors.textSecondary } : undefined}
                        />
                      ) : (
                        <UserRound
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={providerMode ? { color: theme.colors.primary } : undefined}
                        />
                      )}
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))}
              {isCoordinateModalOpen && (
                <div
                  className={
                    providerMode && chatUi
                      ? `rounded-xl border px-3 py-2 text-sm ${chatUi.botBubbleClass}`
                      : 'rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200'
                  }
                  style={providerMode && chatUi ? chatUi.botBubbleStyle : undefined}
                >
                  {coordStep === 'first' && 'Enter provider first name.'}
                  {coordStep === 'last' && 'Enter provider last name.'}
                  {coordStep === 'results' && 'Select one provider address and proceed.'}
                </div>
              )}
              {isBenefitChatOpen && benefitServiceSuggestions.length > 0 && (
                <div
                  className={
                    providerMode
                      ? 'rounded-xl border p-3 shadow-sm'
                      : 'rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3'
                  }
                  style={
                    providerMode
                      ? {
                          backgroundColor: theme.colors.primaryLight,
                          borderColor: theme.colors.cardBorder,
                        }
                      : undefined
                  }
                >
                  <p
                    className="mb-2 text-xs font-medium"
                    style={providerMode ? ui.valueStyle : { color: '#a5f3fc' }}
                  >
                    Tap a result to filter benefit details to that service
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {benefitServiceSuggestions.map((option) => {
                      const isCpt = option.value.startsWith(cptOptionPrefix)
                      const isSelected = isCpt
                        ? selectedProcedureCpts.some((p) => p.optionValue === option.value)
                        : selectedServiceCodes.includes(option.value)
                      return (
                        <button
                          key={`chat-suggestion-${option.value}`}
                          type="button"
                          onClick={() => onBenefitServiceSelect(option)}
                          className={`rounded-full border px-2 py-1 text-[11px] ${
                            providerMode
                              ? isSelected
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                : 'border-sky-300 bg-white text-sky-800 hover:bg-sky-50'
                              : isSelected
                                ? 'border-emerald-300/50 bg-emerald-500/20 text-emerald-100'
                                : 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                          }`}
                        >
                          {isSelected ? `Selected — ${option.label}` : option.label}
                        </button>
                      )
                    })}
                  </div>
                  <p
                    className="mt-2 text-[11px]"
                    style={providerMode ? ui.mutedStyle : { color: '#cbd5e1' }}
                  >
                    {benefitServiceSuggestions.some((o) => o.value.startsWith(cptOptionPrefix))
                      ? `Selected services: ${selectedProcedureCpts.length}`
                      : `Selected: ${selectedServiceCodes.filter((code) => code !== '30').length} additional service code(s)`}
                  </p>
                </div>
              )}
              {isCoordinateModalOpen && coordSearchError ? (
                <p className="text-sm" style={providerMode ? { color: '#dc2626' } : { color: '#fda4af' }}>
                  {coordSearchError}
                </p>
              ) : null}
              {isCoordinateModalOpen && coordRows.length > 0 && (
                <div
                  className={
                    providerMode
                      ? `overflow-x-auto rounded-xl border ${ui.benefitSectionClass}`
                      : 'overflow-x-auto rounded-xl border border-slate-700'
                  }
                  style={providerMode ? ui.benefitSectionStyle : undefined}
                >
                  <table className="w-full min-w-[900px] text-left text-xs sm:text-sm">
                    <thead className={providerMode ? '' : 'bg-slate-800/80'} style={providerMode ? ui.benefitTableHeaderStyle : undefined}>
                      <tr>
                        {['Select', 'Provider', 'NPI', 'Address', 'Phone', 'Fax'].map((label) => (
                          <th
                            key={label}
                            className={`px-3 py-2 text-xs uppercase tracking-wide ${providerMode ? '' : 'text-slate-300'}`}
                            style={providerMode ? ui.labelStyle : undefined}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {coordRows.map((row) => (
                        <tr
                          key={row.rowKey}
                          className={providerMode ? ui.benefitTableRowClass : 'border-t border-slate-800'}
                          style={providerMode ? ui.benefitTableRowStyle : undefined}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="radio"
                              name={coordinateRadioName}
                              checked={selectedCoordRowKey === row.rowKey}
                              onChange={() => onSelectCoordRow(row.rowKey)}
                            />
                          </td>
                          <td className="px-3 py-2" style={providerMode ? ui.benefitTableCellStyle : { color: '#e2e8f0' }}>
                            {row.name || '—'}
                          </td>
                          <td className="px-3 py-2" style={providerMode ? ui.benefitTableCellStyle : { color: '#e2e8f0' }}>
                            {row.npi || '—'}
                          </td>
                          <td className="px-3 py-2" style={providerMode ? ui.benefitTableCellStyle : { color: '#e2e8f0' }}>
                            {row.address || '—'}
                          </td>
                          <td className="px-3 py-2" style={providerMode ? ui.benefitTableCellStyle : { color: '#e2e8f0' }}>
                            {row.phone || '—'}
                          </td>
                          <td className="px-3 py-2" style={providerMode ? ui.benefitTableCellStyle : { color: '#e2e8f0' }}>
                            {row.fax || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div
                className={
                  providerMode && chatUi
                    ? 'flex items-center gap-2 rounded-3xl border px-3 py-2 shadow-sm'
                    : 'flex items-center gap-2 rounded-2xl border border-slate-600 bg-slate-950/80 px-3 py-2'
                }
                style={providerMode && chatUi ? chatUi.inputBarInnerStyle : undefined}
              >
                <input
                  type="text"
                  value={benefitChatDraft}
                  onChange={(e) => onBenefitChatDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    if (isCoordinateModalOpen) {
                      handleCoordEnter(benefitChatDraft.trim())
                      return
                    }
                    onSubmitBenefitQuestion()
                  }}
                  placeholder={
                    isCoordinateModalOpen
                      ? coordStep === 'first'
                        ? 'Type provider first name'
                        : coordStep === 'last'
                          ? 'Type provider last name'
                          : 'Type search again to re-run lookup'
                      : 'Type a service code or description, or "All" for the full list'
                  }
                  className={
                    providerMode && chatUi
                      ? chatUi.inputClass
                      : 'w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500'
                  }
                  style={
                    providerMode
                      ? { color: theme.colors.textPrimary, caretColor: theme.colors.primary }
                      : undefined
                  }
                />
                <button
                  type="button"
                  onClick={handleSendClick}
                  className={
                    providerMode && chatUi
                      ? chatUi.sendBtnClass
                      : 'inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500'
                  }
                  style={providerMode && chatUi ? chatUi.sendBtnStyle : undefined}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {isCoordinateModalOpen && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onProceedCoordinate}
                    disabled={!selectedCoordRowKey}
                  >
                    Proceed
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
