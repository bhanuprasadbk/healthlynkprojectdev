import type { EligibilityResultUi } from '../theme/eligibilityResultUi'

export type PverifyFinancialLine = {
  label: string
  sublabel: string
  amount: string
  remaining: string
  remainingPct: number
  barTone?: 'rose' | 'amber'
}

type PverifyFinancialPanelProps = {
  title: string
  network: 'in' | 'out'
  lines: PverifyFinancialLine[]
  providerMode: boolean
  ui: EligibilityResultUi
}

function networkBadgeClass(network: 'in' | 'out', providerMode: boolean) {
  const inNet = network === 'in'
  if (providerMode) {
    return inNet
      ? 'rounded-md border border-sky-500/40 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-sky-900 shadow-sm'
      : 'rounded-md border border-rose-500/40 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-rose-900 shadow-sm'
  }
  return inNet
    ? 'rounded-md border border-sky-300/30 bg-sky-500/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-sky-300'
    : 'rounded-md border border-rose-300/30 bg-rose-500/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-rose-300'
}

function providerNetworkHeaderClass(network: 'in' | 'out') {
  return network === 'in'
    ? 'relative flex items-center justify-between border-b border-sky-300 bg-sky-100 px-4 py-3.5'
    : 'relative flex items-center justify-between border-b border-rose-300 bg-rose-100 px-4 py-3.5'
}

function providerNetworkAccentClass(network: 'in' | 'out') {
  return network === 'in' ? 'absolute inset-y-0 left-0 w-1 bg-sky-500' : 'absolute inset-y-0 left-0 w-1 bg-rose-500'
}

function providerTitleStyle(network: 'in' | 'out') {
  return { color: network === 'in' ? '#0c4a6e' : '#881337' }
}

function barColor(tone: 'rose' | 'amber' | undefined, providerMode: boolean) {
  if (tone === 'amber') return providerMode ? '#d97706' : '#fcd34d'
  return providerMode ? '#e11d48' : '#fda4af'
}

export function PverifyFinancialPanel({
  title,
  network,
  lines,
  providerMode,
  ui,
}: PverifyFinancialPanelProps) {
  const darkCard =
    'overflow-hidden rounded-xl border border-slate-700/80 bg-[#121a33] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
  const darkHeader =
    'flex items-center justify-between border-b border-slate-700/80 bg-[#1b2647] px-4 py-3'

  return (
    <div
      className={providerMode ? ui.nestedCardClass : darkCard}
      style={providerMode ? ui.nestedCardStyle : undefined}
    >
      <div
        className={
          providerMode ? providerNetworkHeaderClass(network) : darkHeader
        }
      >
        {providerMode ? <span className={providerNetworkAccentClass(network)} aria-hidden /> : null}
        <p
          className={
            providerMode
              ? 'pl-2 text-sm font-bold tracking-tight'
              : 'text-sm font-semibold text-slate-100'
          }
          style={providerMode ? providerTitleStyle(network) : undefined}
        >
          {title}
        </p>
        <span className={networkBadgeClass(network, providerMode)}>
          {network === 'in' ? 'In-Network' : 'Out-of-Network'}
        </span>
      </div>
      <div className="space-y-3 px-4 py-4">
        {lines.map((line, index) => (
          <div
            key={`${line.label}-${line.sublabel}`}
            className={`flex items-start justify-between ${
              index < lines.length - 1
                ? providerMode
                  ? ui.rowDividerClass
                  : 'border-b border-slate-700 pb-3'
                : ''
            }`}
            style={index < lines.length - 1 && providerMode ? ui.rowDividerStyle : undefined}
          >
            <div>
              <p
                className={providerMode ? 'text-sm font-medium' : 'text-sm text-slate-300'}
                style={providerMode ? ui.valueStyle : undefined}
              >
                {line.label}
              </p>
              <p
                className={providerMode ? 'text-xs' : 'text-xs text-slate-500'}
                style={providerMode ? ui.mutedStyle : undefined}
              >
                {line.sublabel}
              </p>
            </div>
            <div className="text-right">
              <p
                className={providerMode ? 'font-bold' : 'font-bold text-slate-100'}
                style={providerMode ? ui.valueStyle : undefined}
              >
                {line.amount}
              </p>
              <p
                className={providerMode ? 'text-xs' : 'text-xs text-slate-500'}
                style={providerMode ? ui.mutedStyle : undefined}
              >
                <span className={ui.remainingAmount}>{line.remaining}</span> remaining
              </p>
              <div
                className="mt-1 h-1 w-20 rounded"
                style={providerMode ? ui.progressTrackStyle : { backgroundColor: '#334155' }}
              >
                <div
                  className="h-full rounded"
                  style={{
                    width: `${line.remainingPct}%`,
                    backgroundColor: barColor(line.barTone, providerMode),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
