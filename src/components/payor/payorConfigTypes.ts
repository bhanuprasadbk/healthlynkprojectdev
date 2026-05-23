import type {
  PayorCappedRentalsForm,
  PayorFeeScheduleRow,
  PayorOwnershipTransferForm,
  PayorPolicyRulesForm,
  PayorPriorAuthForm,
  PayorStatus,
  Plan,
} from '../../data/payorData'

export type {
  PayorCappedRentalsForm,
  PayorFeeScheduleRow,
  PayorOwnershipTransferForm,
  PayorPolicyRulesForm,
  PayorPriorAuthForm,
}

export type PayorConfigTabId =
  | 'overview'
  | 'plans'
  | 'fee-schedules'
  | 'capped-rentals'
  | 'ownership-transfer'
  | 'prior-auth'

export const PAYOR_CONFIG_TABS: { id: PayorConfigTabId; label: string }[] = [
  { id: 'overview', label: 'Payor Details' },
  { id: 'plans', label: 'Plans & Policies' },
  { id: 'fee-schedules', label: 'Fee schedules' },
  { id: 'capped-rentals', label: 'Capped rentals' },
  { id: 'ownership-transfer', label: 'Ownership transfer' },
  { id: 'prior-auth', label: 'Prior auth' },
]

export interface PayorOverviewForm {
  payorName: string
  payorId: string
  npiTaxId: string
  contractType: string
  effectiveDate: string
  terminationDate: string
  contactName: string
  contactPhone: string
  claimsMailingAddress: string
  billingState: string
  submissionMethod: string
  providerPortalUrl: string
  ediSubmitterId: string
  status: PayorStatus
  activePayor: boolean
  electronicRemittance: boolean
  realTimeEligibility: boolean
  autoPostEraPayments: boolean
  contractNotes: string
}

export interface PayorConfigDraft {
  overview: PayorOverviewForm
  plans: Plan[]
  policyRules: PayorPolicyRulesForm
  feeSchedules: PayorFeeScheduleRow[]
  cappedRentals: PayorCappedRentalsForm
  ownershipTransfer: PayorOwnershipTransferForm
  priorAuth: PayorPriorAuthForm
}

export interface PayorOverviewErrors {
  payorName?: string
  payorId?: string
  contractType?: string
  effectiveDate?: string
}

export const fieldClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'

export const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5'
