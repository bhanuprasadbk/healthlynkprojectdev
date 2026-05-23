import type { ApiPriorAuthorization } from '../../services/priorAuthorizationService'
import type { PriorAuthDmeSeedRow } from '../../data/priorAuthDmeSeed'
import { PRIOR_AUTH_DME_SEED } from '../../data/priorAuthDmeSeed'
import type { PriorAuthDisplayRow } from './priorAuthTypes'
import { seedToDisplayRow } from './priorAuthTypes'
import type { PriorAuthorizationStatus } from '../../services/priorAuthorizationService'

export const fallbackLabel = (status: string): string =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'

export const normalizeStatus = (status: unknown): PriorAuthorizationStatus => {
  if (typeof status !== 'string') return 'pending'
  const value = status.toLowerCase().trim()
  if (
    value === 'approved' ||
    value === 'denied' ||
    value === 'cancelled' ||
    value === 'canceled'
  ) {
    return value === 'canceled' ? 'cancelled' : value
  }
  return 'pending'
}

export const normalizeStatusFromText = (value: unknown): PriorAuthorizationStatus => {
  if (typeof value !== 'string') return 'pending'
  const text = value.toLowerCase().trim()
  if (text.includes('approved')) return 'approved'
  if (text.includes('denied') || text.includes('reject')) return 'denied'
  if (text.includes('cancel')) return 'cancelled'
  if (text.includes('pending') || text.includes('review')) return 'pending'
  return 'pending'
}

const str = (item: ApiPriorAuthorization, ...keys: string[]): string => {
  for (const key of keys) {
    const v = item[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

export const findSeedForRow = (
  requestNumber: string,
  id: string
): PriorAuthDmeSeedRow | undefined =>
  PRIOR_AUTH_DME_SEED.find(
    (s) => s.requestNumber === requestNumber || s.id === id
  )

export const apiToDisplayRow = (
  item: ApiPriorAuthorization,
  index: number
): PriorAuthDisplayRow => {
  const status =
    typeof item.status === 'string' && item.status.trim()
      ? normalizeStatus(item.status)
      : normalizeStatusFromText(item.status_label)
  const id =
    (typeof item.id === 'string' && item.id) ||
    (typeof item.request_number === 'string' && item.request_number) ||
    `prior-auth-${index + 1}`
  const requestNumber =
    (typeof item.request_number === 'string' && item.request_number) || id
  const seed = findSeedForRow(requestNumber, id)
  const patientId = (typeof item.patient_id === 'string' && item.patient_id) || '-'
  const serviceCode = (typeof item.service_code === 'string' && item.service_code) || '-'
  const serviceDescription =
    (typeof item.service_description === 'string' && item.service_description) || '-'

  return {
    id,
    requestNumber,
    patientId,
    patientName: str(item, 'patient_name', 'patientName') || seed?.patientName || patientId,
    dateOfBirth: str(item, 'date_of_birth', 'dateOfBirth', 'dob') || seed?.dateOfBirth || '-',
    gender: str(item, 'gender', 'patient_gender') || seed?.gender || '-',
    memberId: str(item, 'member_id', 'memberId') || seed?.memberId || '-',
    payorId: (typeof item.payor_id === 'string' && item.payor_id) || seed?.payorId || '-',
    payorName: str(item, 'payor_name', 'payorName') || seed?.payorName || '-',
    planName: str(item, 'plan_name', 'planName') || seed?.planName || '-',
    groupId: str(item, 'group_id', 'groupId') || seed?.groupId || '-',
    prescriberName:
      str(item, 'prescriber_name', 'prescriberName', 'ordering_physician', 'orderingPhysician') ||
      seed?.prescriberName ||
      seed?.orderingPhysician ||
      '-',
    serviceCode,
    serviceDescription,
    equipmentLabel:
      str(item, 'equipment_label', 'equipmentLabel') ||
      seed?.equipmentLabel ||
      (serviceCode !== '-' ? `${serviceCode} — ${serviceDescription}` : serviceDescription),
    diagnosisCode:
      (typeof item.diagnosis_code === 'string' && item.diagnosis_code) || seed?.diagnosisCode || '-',
    diagnosisDescription:
      (typeof item.diagnosis_description === 'string' && item.diagnosis_description) ||
      seed?.diagnosisDescription ||
      '-',
    subscriberId:
      (typeof item.subscriber_id === 'string' && item.subscriber_id) || seed?.subscriberId || '-',
    requestedServiceDate:
      (typeof item.requested_service_date === 'string' && item.requested_service_date) ||
      seed?.requestedServiceDate ||
      '',
    submittedDate:
      (typeof item.submitted_date === 'string' && item.submitted_date) || seed?.submittedDate || '',
    status,
    statusLabel:
      (typeof item.status_label === 'string' && item.status_label) || seed?.statusLabel || fallbackLabel(status),
    providerName:
      (typeof item.provider_name === 'string' && item.provider_name) || seed?.providerName || '-',
    providerNpi: (typeof item.provider_npi === 'string' && item.provider_npi) || seed?.providerNpi || '-',
    providerAddress:
      (typeof item.provider_address === 'string' && item.provider_address) ||
      seed?.providerAddress ||
      '-',
    ptan: str(item, 'ptan') || seed?.ptan || '-',
    orderingPhysician: str(item, 'ordering_physician', 'orderingPhysician') || seed?.orderingPhysician || '-',
    faceToFaceDate: str(item, 'face_to_face_date', 'faceToFaceDate') || seed?.faceToFaceDate || '',
    placeOfService: str(item, 'place_of_service', 'placeOfService') || seed?.placeOfService || '12 — Home',
    rentalPurchase: str(item, 'rental_purchase', 'rentalPurchase') || seed?.rentalPurchase || 'Rental (monthly)',
    quantityLength: str(item, 'quantity_length', 'quantityLength') || seed?.quantityLength || '',
    medicalNecessity: str(item, 'medical_necessity', 'medicalNecessity') || seed?.medicalNecessity || '',
    urgency: (seed?.urgency as PriorAuthDisplayRow['urgency']) || 'routine',
    isDemo: false,
  }
}

export const demoDisplayRows = (): PriorAuthDisplayRow[] =>
  PRIOR_AUTH_DME_SEED.map(seedToDisplayRow)

export const formatPaDate = (date: string): string => {
  if (!date) return '-'
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return date
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const statusBadgeClass = (status: PriorAuthorizationStatus, statusLabel: string): string => {
  const label = statusLabel.toLowerCase()
  if (status === 'approved') return 'bg-green-100 text-green-800'
  if (status === 'denied') return 'bg-red-100 text-red-800'
  if (label.includes('review')) return 'bg-sky-100 text-sky-800'
  if (status === 'cancelled') return 'bg-slate-100 text-slate-600'
  return 'bg-yellow-100 text-yellow-800'
}

export const computeCompletion = (
  row: PriorAuthDisplayRow | null,
  clinical: { serviceCode: string; medicalNecessity: string },
  documents: { required: boolean; uploaded?: boolean }[],
  reviewed: boolean
): { percent: number; checks: { patient: boolean; provider: boolean; clinical: boolean; docs: boolean; review: boolean } } => {
  const patient = Boolean(row?.patientName && row.patientName !== '-')
  const provider = Boolean(row?.providerName && row.providerName !== '-')
  const clinicalOk = Boolean(
    (clinical.serviceCode ?? '').trim() && (clinical.medicalNecessity ?? '').trim()
  )
  const requiredDocs = documents.filter((d) => d.required)
  const docsOk =
    requiredDocs.length === 0 || requiredDocs.every((d) => d.uploaded)
  const checks = { patient, provider, clinical: clinicalOk, docs: docsOk, review: reviewed }
  const done = [patient, provider, clinicalOk, docsOk, reviewed].filter(Boolean).length
  const percent = Math.round((done / 5) * 100)
  return { percent, checks }
}
