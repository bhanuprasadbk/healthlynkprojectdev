import { Check } from 'lucide-react'
import type { PriorAuthorizationStatus } from '../../services/priorAuthorizationService'
import { statusBadgeClass } from './priorAuthUtils'

type PriorAuthStatusBadgeProps = {
  status: PriorAuthorizationStatus
  statusLabel: string
}

const PriorAuthStatusBadge = ({ status, statusLabel }: PriorAuthStatusBadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(status, statusLabel)}`}
  >
    {status === 'approved' && <Check size={10} strokeWidth={2.5} />}
    {statusLabel}
  </span>
)

export default PriorAuthStatusBadge
