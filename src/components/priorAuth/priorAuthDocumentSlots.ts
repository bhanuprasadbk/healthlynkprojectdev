import type { PriorAuthDetailDocument } from './priorAuthTypes'

export const PRIOR_AUTH_DOCUMENT_SLOTS: PriorAuthDetailDocument[] = [
  {
    id: 'doc-referral',
    name: 'Referral / prescription',
    meta: 'PDF, JPG, PNG, DOC · max 10MB',
    required: true,
    uploaded: false,
  },
  {
    id: 'doc-records',
    name: 'Medical records / chart notes',
    meta: 'PDF, JPG, PNG, DOC · max 10MB',
    required: true,
    uploaded: false,
  },
  {
    id: 'doc-insurance',
    name: 'Insurance card (front & back)',
    meta: 'PDF, JPG, PNG · max 5MB',
    required: true,
    uploaded: false,
  },
  {
    id: 'doc-prior-treatment',
    name: 'Prior treatment history',
    meta: 'PDF, JPG, PNG, DOC · max 10MB',
    required: false,
    uploaded: false,
  },
  {
    id: 'doc-lab-imaging',
    name: 'Lab / imaging results',
    meta: 'PDF, JPG, PNG, DOC · max 10MB',
    required: false,
    uploaded: false,
  },
  {
    id: 'doc-lmn',
    name: 'Letter of medical necessity',
    meta: 'PDF, DOC · max 10MB',
    required: false,
    uploaded: false,
  },
]

const slotMatchers: Record<string, (text: string) => boolean> = {
  'doc-referral': (t) =>
    /referral|prescription|physician.?order|order\.pdf/i.test(t) &&
    !/cmn|certificate|necessity/i.test(t),
  'doc-records': (t) =>
    /medical record|chart note|clinical.?note|pft|spirometry/i.test(t) &&
    !/insurance|lab|imaging|abg|oximetry|sleep/i.test(t),
  'doc-insurance': (t) => /insurance.?card|member.?card/i.test(t),
  'doc-prior-treatment': (t) => /prior treatment|conservative|treatment history/i.test(t),
  'doc-lab-imaging': (t) =>
    /lab|imaging|x-?ray|abg|oximetry|sleep study|mri|pft/i.test(t),
  'doc-lmn': (t) => /medical necessity|lmn|cmn|certificate/i.test(t),
}

const docSearchText = (doc: PriorAuthDetailDocument): string =>
  `${doc.id} ${doc.name} ${doc.fileName ?? ''} ${doc.meta}`.toLowerCase()

export const defaultPriorAuthDocuments = (): PriorAuthDetailDocument[] =>
  PRIOR_AUTH_DOCUMENT_SLOTS.map((slot) => ({ ...slot }))

export const normalizePriorAuthDocuments = (
  existing?: PriorAuthDetailDocument[]
): PriorAuthDetailDocument[] => {
  const slots = defaultPriorAuthDocuments()
  if (!existing?.length) return slots

  const used = new Set<string>()

  for (const slot of slots) {
    const matcher = slotMatchers[slot.id]
    const match = existing.find((doc) => {
      if (used.has(doc.id)) return false
      const text = docSearchText(doc)
      return matcher ? matcher(text) : false
    })
    if (match?.uploaded) {
      used.add(match.id)
      slot.uploaded = true
      slot.fileName = match.fileName || match.name
      slot.meta = match.uploaded
        ? `Uploaded · ${match.fileName || match.name}`
        : slot.meta
    }
  }

  return slots
}

export const requiredPriorAuthDocsComplete = (documents: PriorAuthDetailDocument[]): boolean =>
  documents.filter((d) => d.required).every((d) => d.uploaded)

export type PriorAuthSubmissionChecklistItem = {
  id: string
  label: string
  done: boolean
}

const documentUploadItems = (
  documents: PriorAuthDetailDocument[]
): PriorAuthSubmissionChecklistItem[] => {
  const byId = (id: string) => documents.find((d) => d.id === id)?.uploaded ?? false
  return [
    {
      id: 'referral',
      label: 'Referral / prescription uploaded',
      done: byId('doc-referral'),
    },
    {
      id: 'records',
      label: 'Medical records uploaded',
      done: byId('doc-records'),
    },
    {
      id: 'insurance',
      label: 'Insurance card uploaded',
      done: byId('doc-insurance'),
    },
  ]
}

export const buildDocumentUploadChecklist = (
  documents: PriorAuthDetailDocument[]
): PriorAuthSubmissionChecklistItem[] => documentUploadItems(documents)

export const buildSubmissionChecklist = (input: {
  patientComplete: boolean
  clinicalComplete: boolean
  documents: PriorAuthDetailDocument[]
}): PriorAuthSubmissionChecklistItem[] => [
  { id: 'patient', label: 'Patient information complete', done: input.patientComplete },
  { id: 'clinical', label: 'Clinical details filled in', done: input.clinicalComplete },
  ...documentUploadItems(input.documents),
]

export const submissionChecklistComplete = (
  checklist: PriorAuthSubmissionChecklistItem[]
): boolean => checklist.every((item) => item.done)
