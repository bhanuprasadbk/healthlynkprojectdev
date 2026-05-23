import { Check, Circle, ShieldCheck } from 'lucide-react'
import type { PriorAuthSubmissionChecklistItem } from './priorAuthDocumentSlots'

type PriorAuthSubmissionChecklistProps = {
  items: PriorAuthSubmissionChecklistItem[]
  primaryColor: string
  title?: string
  className?: string
}

const PriorAuthSubmissionChecklist = ({
  items,
  primaryColor,
  title = 'Submission checklist',
  className = '',
}: PriorAuthSubmissionChecklistProps) => (
  <div className={className}>
    <div className="flex items-center gap-2 mb-3">
      <ShieldCheck size={15} style={{ color: primaryColor }} />
      <h4 className="text-[13px] font-semibold text-slate-800">{title}</h4>
    </div>
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex items-center gap-2 text-[13px] ${
            item.done ? 'text-green-800' : 'text-slate-500'
          }`}
        >
          {item.done ? (
            <Check size={16} className="text-green-600 shrink-0" strokeWidth={2.5} />
          ) : (
            <Circle size={16} className="text-slate-300 shrink-0" />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  </div>
)

export default PriorAuthSubmissionChecklist
