export type PlanStatus = 'active' | 'pending' | 'draft'

export interface Plan {
  id: string
  planName: string
  planId?: string
  planType: string
  groupNumber?: string
  network?: string
  autoCheckFrequency: string
  status: PlanStatus | string
  createdAt: string
}

export interface PayorPolicyRulesForm {
  timelyFilingLimit: string
  correctedClaimDeadline: string
  coordinationOfBenefits: string
  assignmentOfBenefits: string
  claimFrequencyType: string
  renderingProviderRequired: string
  requireMemberId: boolean
  acceptCrossoverClaims: boolean
  allowBundledBilling: boolean
  sendClaimStatusInquiry: boolean
}

export type PayorStatus = 'active' | 'pending' | 'inactive'

export interface PayorFeeScheduleRow {
  id: string
  hcpcsCode: string
  description: string
  modifier: string
  allowedAmount: string
  feeBasis: string
  percentOfMedicare: string
  effectiveDate: string
  isDraft?: boolean
}

export interface PayorCappedRentalsForm {
  rentalCapPeriod: string
  capResetsOn: string
  months1To3Rate: string
  months4To13Rate: string
  postCapMsRate: string
  equipmentCategories: string[]
  notifyProviderAtMonth10: boolean
  autoConvertToPurchaseAtCap: boolean
  maintenanceServicingPostCap: boolean
  pauseBillingDuringHospitalStay: boolean
}

export type TransferWorkflowStepType = 'automated' | 'manual' | 'conditional'

export interface TransferWorkflowStep {
  id: string
  stepNumber: number
  description: string
  stepType: TransferWorkflowStepType
}

export interface PayorOwnershipTransferForm {
  transferTrigger: string
  ownershipTransferModifier: string
  lumpSumPurchaseAmount: string
  documentationRequired: string
  requirePayorPreApproval: boolean
  allowPatientBuyoutBeforeCap: boolean
  sendPatientOwnershipLetter: boolean
}

export interface PayorClinicalDocItem {
  id: string
  title: string
  description: string
  checked: boolean
}

export interface PayorPriorAuthForm {
  paSubmissionMethod: string
  standardTurnaroundTime: string
  paPortalUrl: string
  paFaxNumber: string
  clinicalDocChecklist: PayorClinicalDocItem[]
}

export interface Payor {
  id: string
  payorName: string
  payorId: string
  contractType: string
  effectiveDate: string
  status: PayorStatus
  plans: Plan[]
  createdAt: string
  npiTaxId?: string
  terminationDate?: string
  contactName?: string
  contactPhone?: string
  claimsMailingAddress?: string
  billingState?: string
  submissionMethod?: string
  providerPortalUrl?: string
  ediSubmitterId?: string
  activePayor?: boolean
  electronicRemittance?: boolean
  realTimeEligibility?: boolean
  autoPostEraPayments?: boolean
  contractNotes?: string
  feeSchedules?: PayorFeeScheduleRow[]
  cappedRentals?: PayorCappedRentalsForm
  ownershipTransfer?: PayorOwnershipTransferForm
  priorAuth?: PayorPriorAuthForm
  policyRules?: PayorPolicyRulesForm
}

export const initialPayors: Payor[] = [
  {
    id: '1',
    payorName: 'BlueCross BlueShield of Texas',
    payorId: 'BCBSTX-001',
    contractType: 'In-network PPO',
    effectiveDate: '2025-01-01',
    terminationDate: '2025-12-31',
    status: 'active',
    createdAt: '2024-01-01',
    billingState: 'TX — Texas',
    submissionMethod: 'Electronic (EDI 837)',
    providerPortalUrl: 'https://provider.bcbstx.com',
    activePayor: true,
    electronicRemittance: true,
    realTimeEligibility: false,
    autoPostEraPayments: true,
    plans: [
      {
        id: '1-1',
        planName: 'PPO Select Plus',
        planId: 'BX-PPO-401',
        planType: 'PPO',
        groupNumber: 'GRP-88421',
        network: 'In-network',
        autoCheckFrequency: 'monthly',
        status: 'active',
        createdAt: '2024-01-01',
      },
      {
        id: '1-2',
        planName: 'HMO Basic',
        planId: 'BX-HMO-100',
        planType: 'HMO',
        groupNumber: 'GRP-88422',
        network: 'In-network',
        autoCheckFrequency: '3months',
        status: 'active',
        createdAt: '2024-01-01',
      },
      {
        id: '1-3',
        planName: 'Medicare Advantage',
        planId: 'BX-MA-250',
        planType: 'Medicare Adv',
        groupNumber: 'GRP-88430',
        network: 'Preferred',
        autoCheckFrequency: 'monthly',
        status: 'pending',
        createdAt: '2024-01-01',
      },
    ],
    policyRules: {
      timelyFilingLimit: '365 days',
      correctedClaimDeadline: '60 days from denial',
      coordinationOfBenefits: 'Primary',
      assignmentOfBenefits: 'Pay provider directly',
      claimFrequencyType: 'Original (1)',
      renderingProviderRequired: 'Yes — always',
      requireMemberId: true,
      acceptCrossoverClaims: false,
      allowBundledBilling: true,
      sendClaimStatusInquiry: true,
    },
    feeSchedules: [
      {
        id: 'fs-1',
        hcpcsCode: 'E1390',
        description: 'Oxygen concentrator, single delivery',
        modifier: 'RR',
        allowedAmount: '$142.40',
        feeBasis: 'Per month',
        percentOfMedicare: '105%',
        effectiveDate: '2025-01-01',
      },
      {
        id: 'fs-2',
        hcpcsCode: 'E0601',
        description: 'Continuous positive airway pressure device',
        modifier: 'NU',
        allowedAmount: '$0.87',
        feeBasis: 'Per month',
        percentOfMedicare: '100%',
        effectiveDate: '2025-01-01',
      },
      {
        id: 'fs-3',
        hcpcsCode: 'K0001',
        description: 'Standard manual wheelchair',
        modifier: 'NU',
        allowedAmount: '$142.40',
        feeBasis: 'Purchase',
        percentOfMedicare: '98%',
        effectiveDate: '2025-01-01',
      },
    ],
    cappedRentals: {
      rentalCapPeriod: '13 months (Medicare standard)',
      capResetsOn: 'Date of service',
      months1To3Rate: '100',
      months4To13Rate: '75',
      postCapMsRate: '50',
      equipmentCategories: ['Oxygen equipment', 'CPAP / BiPAP', 'Ventilators'],
      notifyProviderAtMonth10: true,
      autoConvertToPurchaseAtCap: false,
      maintenanceServicingPostCap: true,
      pauseBillingDuringHospitalStay: true,
    },
    ownershipTransfer: {
      transferTrigger: 'After rental cap period ends',
      ownershipTransferModifier: 'KH — first claim, NU intent',
      lumpSumPurchaseAmount: '',
      documentationRequired: 'CMN / Letter of medical necessity',
      requirePayorPreApproval: true,
      allowPatientBuyoutBeforeCap: false,
      sendPatientOwnershipLetter: true,
    },
    priorAuth: {
      paSubmissionMethod: 'Online portal',
      standardTurnaroundTime: '3 business days',
      paPortalUrl: 'https://provider.bcbstx.com/auth',
      paFaxNumber: '(800) 000-0000',
      clinicalDocChecklist: defaultClinicalDocChecklist(),
    },
  },
  {
    id: '2',
    payorName: 'Aetna Texas',
    payorId: 'AETNA-TX02',
    contractType: 'In-network HMO',
    effectiveDate: '2025-03-01',
    status: 'pending',
    createdAt: '2024-01-02',
    plans: [
      {
        id: '2-1',
        planName: 'Aetna HMO',
        planType: 'HMO',
        autoCheckFrequency: '6months',
        status: 'active',
        createdAt: '2024-01-02',
      },
      {
        id: '2-2',
        planName: 'Aetna PPO',
        planType: 'PPO',
        autoCheckFrequency: 'monthly',
        status: 'active',
        createdAt: '2024-01-02',
      },
    ],
  },
  {
    id: '3',
    payorName: 'Humana Medicare Advantage',
    payorId: 'HUM-MCR01',
    contractType: 'Medicare Advantage',
    effectiveDate: '2024-06-01',
    status: 'active',
    createdAt: '2024-01-03',
    plans: [
      {
        id: '3-1',
        planName: 'Humana Gold Plus',
        planType: 'Medicare',
        autoCheckFrequency: 'yearly',
        status: 'active',
        createdAt: '2024-01-03',
      },
      {
        id: '3-2',
        planName: 'Humana Choice',
        planType: 'Medicare',
        autoCheckFrequency: 'yearly',
        status: 'active',
        createdAt: '2024-01-03',
      },
      {
        id: '3-3',
        planName: 'Humana Honor',
        planType: 'Medicare',
        autoCheckFrequency: 'yearly',
        status: 'active',
        createdAt: '2024-01-03',
      },
      {
        id: '3-4',
        planName: 'Humana Value',
        planType: 'Medicare',
        autoCheckFrequency: 'yearly',
        status: 'active',
        createdAt: '2024-01-03',
      },
    ],
  },
  {
    id: '4',
    payorName: 'Molina Healthcare TX',
    payorId: 'MOL-84301',
    contractType: 'Managed Medicaid',
    effectiveDate: '2024-11-15',
    status: 'active',
    createdAt: '2024-01-04',
    plans: [
      {
        id: '4-1',
        planName: 'Molina Medicaid',
        planType: 'Medicaid',
        autoCheckFrequency: 'monthly',
        status: 'active',
        createdAt: '2024-01-04',
      },
    ],
  },
  {
    id: '5',
    payorName: 'UnitedHealthcare Choice Plus',
    payorId: 'UHC-CP01',
    contractType: 'In-network PPO',
    effectiveDate: '2025-01-01',
    status: 'active',
    createdAt: '2024-01-05',
    plans: [
      {
        id: '5-1',
        planName: 'UHC EPO',
        planType: 'EPO',
        autoCheckFrequency: 'yearly',
        status: 'active',
        createdAt: '2024-01-05',
      },
      {
        id: '5-2',
        planName: 'UHC PPO',
        planType: 'PPO',
        autoCheckFrequency: 'monthly',
        status: 'active',
        createdAt: '2024-01-05',
      },
      {
        id: '5-3',
        planName: 'UHC HMO',
        planType: 'HMO',
        autoCheckFrequency: '3months',
        status: 'active',
        createdAt: '2024-01-05',
      },
    ],
  },
  {
    id: '6',
    payorName: 'Cigna Open Access',
    payorId: 'CIG-OA01',
    contractType: 'In-network PPO',
    effectiveDate: '2024-09-01',
    status: 'inactive',
    createdAt: '2024-01-06',
    plans: [
      {
        id: '6-1',
        planName: 'Cigna PPO',
        planType: 'PPO',
        autoCheckFrequency: 'monthly',
        status: 'inactive',
        createdAt: '2024-01-06',
      },
      {
        id: '6-2',
        planName: 'Cigna OAP',
        planType: 'PPO',
        autoCheckFrequency: 'monthly',
        status: 'inactive',
        createdAt: '2024-01-06',
      },
    ],
  },
  {
    id: '7',
    payorName: 'WellCare of Texas',
    payorId: 'WLCR-TX01',
    contractType: 'Medicare Advantage',
    effectiveDate: '2025-05-01',
    status: 'pending',
    createdAt: '2024-01-07',
    plans: [
      {
        id: '7-1',
        planName: 'WellCare Medicare',
        planType: 'Medicare',
        autoCheckFrequency: 'yearly',
        status: 'active',
        createdAt: '2024-01-07',
      },
    ],
  },
  {
    id: '8',
    payorName: 'Scott & White Health Plan',
    payorId: 'SWHP-001',
    contractType: 'In-network HMO',
    effectiveDate: '2025-01-01',
    status: 'active',
    createdAt: '2024-01-08',
    plans: [
      {
        id: '8-1',
        planName: 'SWHP HMO',
        planType: 'HMO',
        autoCheckFrequency: '3months',
        status: 'active',
        createdAt: '2024-01-08',
      },
      {
        id: '8-2',
        planName: 'SWHP PPO',
        planType: 'PPO',
        autoCheckFrequency: 'monthly',
        status: 'active',
        createdAt: '2024-01-08',
      },
    ],
  },
]

export interface Option {
  value: string
  label: string
}

export const planTypes: Option[] = [
  { value: 'PPO', label: 'PPO' },
  { value: 'HMO', label: 'HMO' },
  { value: 'EPO', label: 'EPO' },
  { value: 'POS', label: 'POS' },
  { value: 'Medicare Adv', label: 'Medicare Adv' },
  { value: 'Medicare', label: 'Medicare' },
  { value: 'Medicaid', label: 'Medicaid' },
]

export const planNetworkOptions: Option[] = [
  { value: 'In-network', label: 'In-network' },
  { value: 'Preferred', label: 'Preferred' },
  { value: 'Out-of-network', label: 'Out-of-network' },
]

export const planStatusOptions: Option[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
]

export const contractTypes: Option[] = [
  { value: 'In-network PPO', label: 'In-network PPO' },
  { value: 'In-network HMO', label: 'In-network HMO' },
  { value: 'Medicare Advantage', label: 'Medicare Advantage' },
  { value: 'Managed Medicaid', label: 'Managed Medicaid' },
]

export const autoCheckFrequencies: Option[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: 'yearly', label: 'Yearly' },
]

export const statusOptions: Option[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
]

export const billingStateOptions: Option[] = [
  { value: 'TX — Texas', label: 'TX — Texas' },
  { value: 'CA — California', label: 'CA — California' },
  { value: 'FL — Florida', label: 'FL — Florida' },
  { value: 'NY — New York', label: 'NY — New York' },
]

export const submissionMethodOptions: Option[] = [
  { value: 'Electronic (EDI 837)', label: 'Electronic (EDI 837)' },
  { value: 'Paper CMS-1500', label: 'Paper CMS-1500' },
  { value: 'Portal upload', label: 'Portal upload' },
]

export const timelyFilingLimitOptions: Option[] = [
  { value: '90 days', label: '90 days' },
  { value: '120 days', label: '120 days' },
  { value: '180 days', label: '180 days' },
  { value: '365 days', label: '365 days' },
]

export const correctedClaimDeadlineOptions: Option[] = [
  { value: '30 days from denial', label: '30 days from denial' },
  { value: '60 days from denial', label: '60 days from denial' },
  { value: '90 days from denial', label: '90 days from denial' },
]

export const coordinationOfBenefitsOptions: Option[] = [
  { value: 'Primary', label: 'Primary' },
  { value: 'Secondary', label: 'Secondary' },
  { value: 'Tertiary', label: 'Tertiary' },
]

export const assignmentOfBenefitsOptions: Option[] = [
  { value: 'Pay provider directly', label: 'Pay provider directly' },
  { value: 'Pay member', label: 'Pay member' },
]

export const claimFrequencyTypeOptions: Option[] = [
  { value: 'Original (1)', label: 'Original (1)' },
  { value: 'Replacement (7)', label: 'Replacement (7)' },
  { value: 'Void (8)', label: 'Void (8)' },
]

export const renderingProviderRequiredOptions: Option[] = [
  { value: 'Yes — always', label: 'Yes — always' },
  { value: 'No', label: 'No' },
  { value: 'Only for professional claims', label: 'Only for professional claims' },
]

export const feeBasisOptions: Option[] = [
  { value: 'Per month', label: 'Per month' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Per unit', label: 'Per unit' },
]

export const feeScheduleModifierOptions: Option[] = [
  { value: '', label: '—' },
  { value: 'RR', label: 'RR' },
  { value: 'NU', label: 'NU' },
  { value: 'UE', label: 'UE' },
]

export const feeScheduleYearOptions: Option[] = [
  { value: '2024', label: '2024 schedule' },
  { value: '2025', label: '2025 schedule' },
  { value: '2026', label: '2026 schedule' },
]

export const rentalCapPeriodOptions: Option[] = [
  { value: '13 months (Medicare standard)', label: '13 months (Medicare standard)' },
  { value: '10 months', label: '10 months' },
  { value: '12 months', label: '12 months' },
  { value: 'Custom', label: 'Custom' },
]

export const capResetsOnOptions: Option[] = [
  { value: 'Date of service', label: 'Date of service' },
  { value: 'Calendar year', label: 'Calendar year' },
  { value: 'Plan year', label: 'Plan year' },
]

export const transferTriggerOptions: Option[] = [
  { value: 'After rental cap period ends', label: 'After rental cap period ends' },
  { value: 'Patient request', label: 'Patient request' },
  { value: 'Clinical determination', label: 'Clinical determination' },
  { value: 'Payor approval only', label: 'Payor approval only' },
]

export const ownershipTransferModifierOptions: Option[] = [
  { value: 'KH — first claim, NU intent', label: 'KH — first claim, NU intent' },
  { value: 'KI — months 2–3', label: 'KI — months 2–3' },
  { value: 'KJ — months 4–13', label: 'KJ — months 4–13' },
  { value: 'NU — new equipment purchase', label: 'NU — new equipment purchase' },
]

export const documentationRequiredOptions: Option[] = [
  { value: 'CMN / Letter of medical necessity', label: 'CMN / Letter of medical necessity' },
  { value: 'Physician order only', label: 'Physician order only' },
  { value: 'None required', label: 'None required' },
]

export const paSubmissionMethodOptions: Option[] = [
  { value: 'Online portal', label: 'Online portal' },
  { value: 'Fax', label: 'Fax' },
  { value: 'Phone', label: 'Phone' },
  { value: 'EDI 278', label: 'EDI 278' },
]

export const standardTurnaroundTimeOptions: Option[] = [
  { value: '3 business days', label: '3 business days' },
  { value: '5 business days', label: '5 business days' },
  { value: '7 business days', label: '7 business days' },
  { value: '14 calendar days', label: '14 calendar days' },
]

export function defaultClinicalDocChecklist(): PayorClinicalDocItem[] {
  return [
    {
      id: 'cmn',
      title: 'Certificate of medical necessity (CMN)',
      description: 'Signed by ordering physician within last 12 months',
      checked: true,
    },
    {
      id: 'f2f',
      title: 'Face-to-face evaluation',
      description: 'Must be within 6 months of order date for DME',
      checked: true,
    },
    {
      id: 'dwo',
      title: 'Detailed written order (DWO)',
      description: 'Includes quantity, frequency, and duration of need',
      checked: true,
    },
    {
      id: 'home-assessment',
      title: 'Home assessment / sleep study results',
      description: 'Required for CPAP, BiPAP, and ventilator orders',
      checked: false,
    },
    {
      id: 'therapy-records',
      title: 'Previous therapy records',
      description: 'Proof of conservative treatment failure where applicable',
      checked: false,
    },
    {
      id: 'lab-results',
      title: 'Lab results / diagnostic imaging',
      description: 'ABG, SpO2, or X-ray within required window',
      checked: false,
    },
  ]
}

export const ownershipTransferWorkflowSteps: TransferWorkflowStep[] = [
  {
    id: 'ot-1',
    stepNumber: 1,
    description: 'Rental cap reached — system flags for transfer review',
    stepType: 'automated',
  },
  {
    id: 'ot-2',
    stepNumber: 2,
    description: 'Clinical staff confirms continued medical necessity',
    stepType: 'manual',
  },
  {
    id: 'ot-3',
    stepNumber: 3,
    description: 'Payor notified; transfer authorization requested if required',
    stepType: 'conditional',
  },
  {
    id: 'ot-4',
    stepNumber: 4,
    description: 'Purchase order generated; title transferred to patient',
    stepType: 'automated',
  },
  {
    id: 'ot-5',
    stepNumber: 5,
    description: 'Maintenance & servicing agreement offered if applicable',
    stepType: 'manual',
  },
]

export const cappedRentalEquipmentCategories: string[] = [
  'Oxygen equipment',
  'CPAP / BiPAP',
  'Ventilators',
  'Suction pumps',
  'Hospital beds',
  'Wheelchairs',
  'Patient lifts',
  'Infusion pumps',
  'Nebulizers',
]

export function formatPayorDate(isoDate: string): string {
  if (!isoDate) return '—'
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${month}/${day}/${year}`
}
