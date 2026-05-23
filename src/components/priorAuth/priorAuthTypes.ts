import type { PriorAuthorizationStatus } from '../../services/priorAuthorizationService'
import type { PriorAuthDmeDocumentTemplate, PriorAuthDmeSeedRow } from '../../data/priorAuthDmeSeed'

export type PriorAuthDisplayRow = {
  id: string
  requestNumber: string
  patientId: string
  patientName: string
  memberId: string
  dateOfBirth: string
  gender: string
  planName: string
  groupId: string
  prescriberName: string
  payorId: string
  payorName: string
  serviceCode: string
  serviceDescription: string
  equipmentLabel: string
  diagnosisCode: string
  diagnosisDescription: string
  subscriberId: string
  requestedServiceDate: string
  submittedDate: string
  status: PriorAuthorizationStatus
  statusLabel: string
  providerName: string
  providerNpi: string
  providerAddress: string
  ptan: string
  orderingPhysician: string
  faceToFaceDate: string
  placeOfService: string
  rentalPurchase: string
  quantityLength: string
  medicalNecessity: string
  urgency: 'routine' | 'urgent' | 'stat'
  isDemo?: boolean
}

export type PriorAuthDetailDocument = PriorAuthDmeDocumentTemplate & {
  fileName?: string
}

export type PriorAuthActivityItem = {
  id: string
  message: string
  time: string
  tone?: 'default' | 'green' | 'amber'
}

export type PriorAuthClinicalForm = {
  serviceCode: string
  serviceDescription: string
  diagnosisCode: string
  diagnosisDescription: string
  quantityLength: string
  requestedServiceDate: string
  placeOfService: string
  rentalPurchase: string
  medicalNecessity: string
  orderingPhysician: string
  faceToFaceDate: string
  urgency: 'routine' | 'urgent' | 'stat'
}

export const emptyClinicalForm = (): PriorAuthClinicalForm => ({
  serviceCode: '',
  serviceDescription: '',
  diagnosisCode: '',
  diagnosisDescription: '',
  quantityLength: '',
  requestedServiceDate: '',
  placeOfService: '12 — Home',
  rentalPurchase: 'Rental (monthly)',
  medicalNecessity: '',
  orderingPhysician: '',
  faceToFaceDate: '',
  urgency: 'routine',
})

export const clinicalFormFromRow = (row: PriorAuthDisplayRow): PriorAuthClinicalForm => ({
  serviceCode: row.serviceCode && row.serviceCode !== '-' ? row.serviceCode : '',
  serviceDescription:
    row.serviceDescription && row.serviceDescription !== '-' ? row.serviceDescription : '',
  diagnosisCode: row.diagnosisCode && row.diagnosisCode !== '-' ? row.diagnosisCode : '',
  diagnosisDescription:
    row.diagnosisDescription && row.diagnosisDescription !== '-'
      ? row.diagnosisDescription
      : '',
  quantityLength: row.quantityLength ?? '',
  requestedServiceDate: row.requestedServiceDate ?? '',
  placeOfService: row.placeOfService ?? '12 — Home',
  rentalPurchase: row.rentalPurchase ?? 'Rental (monthly)',
  medicalNecessity: row.medicalNecessity ?? '',
  orderingPhysician: row.orderingPhysician ?? '',
  faceToFaceDate: row.faceToFaceDate ?? '',
  urgency: row.urgency ?? 'routine',
})

export const seedToDisplayRow = (seed: PriorAuthDmeSeedRow): PriorAuthDisplayRow => ({
  id: seed.id,
  requestNumber: seed.requestNumber,
  patientId: seed.patientId,
  patientName: seed.patientName,
  dateOfBirth: seed.dateOfBirth,
  gender: seed.gender,
  memberId: seed.memberId,
  planName: seed.planName,
  groupId: seed.groupId,
  prescriberName: seed.prescriberName,
  payorId: seed.payorId,
  payorName: seed.payorName,
  serviceCode: seed.serviceCode,
  serviceDescription: seed.serviceDescription,
  equipmentLabel: seed.equipmentLabel,
  diagnosisCode: seed.diagnosisCode,
  diagnosisDescription: seed.diagnosisDescription,
  subscriberId: seed.subscriberId,
  requestedServiceDate: seed.requestedServiceDate,
  submittedDate: seed.submittedDate,
  status: seed.status,
  statusLabel: seed.statusLabel,
  providerName: seed.providerName,
  providerNpi: seed.providerNpi,
  providerAddress: seed.providerAddress,
  ptan: seed.ptan,
  orderingPhysician: seed.orderingPhysician,
  faceToFaceDate: seed.faceToFaceDate,
  placeOfService: seed.placeOfService,
  rentalPurchase: seed.rentalPurchase,
  quantityLength: seed.quantityLength,
  medicalNecessity: seed.medicalNecessity,
  urgency: seed.urgency,
  isDemo: true,
})
