import type { Payor, Plan } from '../../data/payorData'
import { defaultClinicalDocChecklist } from '../../data/payorData'
import type {
  PayorCappedRentalsForm,
  PayorConfigDraft,
  PayorFeeScheduleRow,
  PayorOverviewForm,
  PayorOwnershipTransferForm,
  PayorPolicyRulesForm,
  PayorPriorAuthForm,
} from './payorConfigTypes'

export function emptyOverviewForm(): PayorOverviewForm {
  return {
    payorName: '',
    payorId: '',
    npiTaxId: '',
    contractType: '',
    effectiveDate: '',
    terminationDate: '',
    contactName: '',
    contactPhone: '',
    claimsMailingAddress: '',
    billingState: '',
    submissionMethod: '',
    providerPortalUrl: '',
    ediSubmitterId: '',
    status: 'active',
    activePayor: true,
    electronicRemittance: true,
    realTimeEligibility: false,
    autoPostEraPayments: true,
    contractNotes: '',
  }
}

export function emptyOwnershipTransfer(): PayorOwnershipTransferForm {
  return {
    transferTrigger: 'After rental cap period ends',
    ownershipTransferModifier: 'KH — first claim, NU intent',
    lumpSumPurchaseAmount: '',
    documentationRequired: 'CMN / Letter of medical necessity',
    requirePayorPreApproval: true,
    allowPatientBuyoutBeforeCap: false,
    sendPatientOwnershipLetter: true,
  }
}

export function normalizeOwnershipTransfer(value: unknown): PayorOwnershipTransferForm {
  const defaults = emptyOwnershipTransfer()
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults
  }

  const form = value as Partial<PayorOwnershipTransferForm>
  return {
    ...defaults,
    ...form,
  }
}

export function emptyPolicyRules(): PayorPolicyRulesForm {
  return {
    timelyFilingLimit: '',
    correctedClaimDeadline: '',
    coordinationOfBenefits: '',
    assignmentOfBenefits: '',
    claimFrequencyType: '',
    renderingProviderRequired: '',
    requireMemberId: true,
    acceptCrossoverClaims: false,
    allowBundledBilling: true,
    sendClaimStatusInquiry: true,
  }
}

export function newDraftPlan(): Plan {
  return {
    id: `plan-${Date.now()}`,
    planName: '',
    planId: '',
    planType: '',
    groupNumber: '',
    network: '',
    autoCheckFrequency: '',
    status: 'draft',
    createdAt: new Date().toISOString().slice(0, 10),
  }
}

export function emptyCappedRentals(): PayorCappedRentalsForm {
  return {
    rentalCapPeriod: '13 months (Medicare standard)',
    capResetsOn: 'Date of service',
    months1To3Rate: '100',
    months4To13Rate: '75',
    postCapMsRate: '50',
    equipmentCategories: [],
    notifyProviderAtMonth10: true,
    autoConvertToPurchaseAtCap: false,
    maintenanceServicingPostCap: true,
    pauseBillingDuringHospitalStay: true,
  }
}

export function normalizeCappedRentals(value: unknown): PayorCappedRentalsForm {
  const defaults = emptyCappedRentals()
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return defaults
  }

  const form = value as Partial<PayorCappedRentalsForm>
  return {
    ...defaults,
    ...form,
    equipmentCategories: Array.isArray(form.equipmentCategories)
      ? [...form.equipmentCategories]
      : defaults.equipmentCategories,
  }
}
export function emptyPriorAuth(): PayorPriorAuthForm {
  return {
    paSubmissionMethod: 'Online portal',
    standardTurnaroundTime: '3 business days',
    paPortalUrl: '',
    paFaxNumber: '',
    clinicalDocChecklist: defaultClinicalDocChecklist(),
  }
}

export function normalizePriorAuth(value: unknown): PayorPriorAuthForm {
  const defaults = emptyPriorAuth()
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults
  }

  const form = value as Partial<PayorPriorAuthForm>
  const defaultItems = defaultClinicalDocChecklist()
  const savedById = new Map(
    (form.clinicalDocChecklist ?? []).map((item) => [item.id, item.checked])
  )

  return {
    ...defaults,
    ...form,
    clinicalDocChecklist: defaultItems.map((item) => ({
      ...item,
      checked: savedById.has(item.id) ? Boolean(savedById.get(item.id)) : item.checked,
    })),
  }
}

export function createDraftFromPayor(payor: Payor | null): PayorConfigDraft {
  if (!payor) {
    return {
      overview: emptyOverviewForm(),
      plans: [],
      policyRules: emptyPolicyRules(),
      feeSchedules: [],
      cappedRentals: emptyCappedRentals(),
      ownershipTransfer: emptyOwnershipTransfer(),
      priorAuth: emptyPriorAuth(),
    }
  }

  return {
    overview: {
      payorName: payor.payorName,
      payorId: payor.payorId,
      npiTaxId: payor.npiTaxId ?? '',
      contractType: payor.contractType,
      effectiveDate: payor.effectiveDate,
      terminationDate: payor.terminationDate ?? '',
      contactName: payor.contactName ?? '',
      contactPhone: payor.contactPhone ?? '',
      claimsMailingAddress: payor.claimsMailingAddress ?? '',
      billingState: payor.billingState ?? '',
      submissionMethod: payor.submissionMethod ?? '',
      providerPortalUrl: payor.providerPortalUrl ?? '',
      ediSubmitterId: payor.ediSubmitterId ?? '',
      status: payor.status,
      activePayor: payor.activePayor ?? payor.status !== 'inactive',
      electronicRemittance: payor.electronicRemittance ?? true,
      realTimeEligibility: payor.realTimeEligibility ?? false,
      autoPostEraPayments: payor.autoPostEraPayments ?? true,
      contractNotes: payor.contractNotes ?? '',
    },
    plans: [...payor.plans],
    policyRules: payor.policyRules ? { ...payor.policyRules } : emptyPolicyRules(),
    feeSchedules: (payor.feeSchedules ?? []).map((row) => ({
      modifier: '',
      feeBasis: 'Per month',
      percentOfMedicare: '100%',
      ...row,
    })),
    cappedRentals: normalizeCappedRentals(payor.cappedRentals),
    ownershipTransfer: normalizeOwnershipTransfer(payor.ownershipTransfer),
    priorAuth: normalizePriorAuth(payor.priorAuth),
  }
}

export function draftToPayor(draft: PayorConfigDraft, existing: Payor | null): Payor {
  const { overview } = draft
  const status: Payor['status'] = !overview.activePayor
    ? 'inactive'
    : existing?.status === 'pending'
      ? 'pending'
      : 'active'

  return {
    id: existing?.id ?? Date.now().toString(),
    payorName: overview.payorName.trim(),
    payorId: overview.payorId.trim(),
    contractType: overview.contractType,
    effectiveDate: overview.effectiveDate,
    status,
    plans: draft.plans.filter((plan) => plan.status !== 'draft' || plan.planName.trim()),
    policyRules: draft.policyRules,
    createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    npiTaxId: overview.npiTaxId.trim(),
    terminationDate: overview.terminationDate,
    contactName: overview.contactName.trim(),
    contactPhone: overview.contactPhone.trim(),
    claimsMailingAddress: overview.claimsMailingAddress.trim(),
    billingState: overview.billingState,
    submissionMethod: overview.submissionMethod,
    providerPortalUrl: overview.providerPortalUrl.trim(),
    ediSubmitterId: overview.ediSubmitterId.trim(),
    activePayor: overview.activePayor,
    electronicRemittance: overview.electronicRemittance,
    realTimeEligibility: overview.realTimeEligibility,
    autoPostEraPayments: overview.autoPostEraPayments,
    contractNotes: overview.contractNotes.trim(),
    feeSchedules: draft.feeSchedules.filter(
      (row) => !row.isDraft || row.hcpcsCode.trim()
    ).map(({ isDraft: _isDraft, ...row }) => row),
    cappedRentals: normalizeCappedRentals(draft.cappedRentals),
    ownershipTransfer: normalizeOwnershipTransfer(draft.ownershipTransfer),
    priorAuth: normalizePriorAuth(draft.priorAuth),
  }
}

export function validateOverview(overview: PayorOverviewForm) {
  const errors: Record<string, string> = {}
  if (!overview.payorName.trim()) errors.payorName = 'Payor name is required'
  if (!overview.payorId.trim()) errors.payorId = 'Payor ID is required'
  if (!overview.contractType) errors.contractType = 'Contract type is required'
  if (!overview.effectiveDate) errors.effectiveDate = 'Effective date is required'
  return errors
}

export function newFeeScheduleRow(): PayorFeeScheduleRow {
  return {
    id: `fs-${Date.now()}`,
    hcpcsCode: '',
    description: '',
    modifier: '',
    allowedAmount: '',
    feeBasis: 'Per month',
    percentOfMedicare: '100%',
    effectiveDate: '',
    isDraft: true,
  }
}
