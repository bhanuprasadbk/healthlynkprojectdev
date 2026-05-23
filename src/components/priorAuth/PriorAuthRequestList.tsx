import type { PriorAuthDisplayRow } from './priorAuthTypes'
import PriorAuthStatusBadge from './PriorAuthStatusBadge'

type PriorAuthRequestListProps = {
  rows: PriorAuthDisplayRow[]
  selectedId: string | null
  isLoading: boolean
  primaryColor: string
  onSelect: (id: string) => void
}

const PriorAuthRequestList = ({
  rows,
  selectedId,
  isLoading,
  primaryColor,
  onSelect,
}: PriorAuthRequestListProps) => (
  <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[24rem] lg:min-h-full lg:h-full">
    <div className="px-4 py-3.5 border-b border-slate-200 text-sm font-semibold text-slate-800">
      Requests
    </div>
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <p className="px-4 py-6 text-sm text-slate-500">Loading prior authorizations...</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">
          No prior authorizations found. Create the first request.
        </p>
      ) : (
        rows.map((row) => {
          const active = row.id === selectedId
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100 transition-colors border-l-[3px] ${
                active ? 'bg-sky-50' : 'border-l-transparent hover:bg-slate-50'
              }`}
              style={active ? { borderLeftColor: primaryColor } : undefined}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className="text-[13px] font-semibold truncate"
                  style={{ color: active ? primaryColor : '#1a2332' }}
                >
                  {row.requestNumber}
                </span>
                <PriorAuthStatusBadge status={row.status} statusLabel={row.statusLabel} />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {row.patientName}
                <br />
                {row.equipmentLabel}
              </p>
            </button>
          )
        })
      )}
    </div>
  </div>
)

export default PriorAuthRequestList
