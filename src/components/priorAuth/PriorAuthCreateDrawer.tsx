import { ChangeEvent, FormEvent, useMemo, useState } from 'react'
import {
  BookOpen,
  ClipboardList,
  PenLine,
  Printer,
  Search,
  Upload,
  X,
} from 'lucide-react'
import type { CreatePriorAuthorizationPayload } from '../../services/priorAuthorizationService'
import PriorAuthDocumentsSection from './PriorAuthDocumentsSection'
import PriorAuthSubmissionChecklist from './PriorAuthSubmissionChecklist'
import {
  buildDocumentUploadChecklist,
  buildSubmissionChecklist,
  defaultPriorAuthDocuments,
  submissionChecklistComplete,
} from './priorAuthDocumentSlots'
import type { PriorAuthDetailDocument } from './priorAuthTypes'

const STEP_LABELS = ['PA Request', 'Patient', 'Clinical', 'Documents', 'Review']

type SourceType = 'lookup' | 'manual' | 'fax' | 'ehr'

type PriorAuthCreateDrawerProps = {
  open: boolean
  primaryColor: string
  createForm: CreatePriorAuthorizationPayload
  isCreating: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  onFormChange: (
    field: keyof CreatePriorAuthorizationPayload
  ) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
}

const fieldClass =
  'w-full px-2.5 py-1.5 text-[13px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-sky-400 focus:ring-[3px] focus:ring-sky-400/10'
const labelClass = 'block text-[11px] font-medium text-slate-500 mb-1'

const PriorAuthCreateDrawer = ({
  open,
  primaryColor,
  createForm,
  isCreating,
  onClose,
  onSubmit,
  onFormChange,
}: PriorAuthCreateDrawerProps) => {
  const [step, setStep] = useState(0)
  const [source, setSource] = useState<SourceType>('lookup')
  const [lookupVisible, setLookupVisible] = useState(false)
  const [documents, setDocuments] = useState<PriorAuthDetailDocument[]>(() =>
    defaultPriorAuthDocuments()
  )

  const submissionChecklist = useMemo(
    () =>
      buildSubmissionChecklist({
        patientComplete: Boolean(
          createForm.patient_id.trim() &&
            createForm.payor_id.trim() &&
            createForm.subscriber_id.trim()
        ),
        clinicalComplete: Boolean(
          createForm.service_code.trim() &&
            createForm.diagnosis_code.trim() &&
            createForm.service_description.trim()
        ),
        documents,
      }),
    [createForm, documents]
  )

  const documentUploadChecklist = useMemo(
    () => buildDocumentUploadChecklist(documents),
    [documents]
  )

  const readyToSubmit = submissionChecklistComplete(submissionChecklist)

  const close = () => {
    setStep(0)
    setSource('lookup')
    setLookupVisible(false)
    setDocuments(defaultPriorAuthDocuments())
    onClose()
  }

  const next = () => setStep((s) => Math.min(4, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const subtitles = [
    "Select how you'd like to start this PA request",
    'Patient and coverage information',
    'Clinical and DME details',
    'Upload supporting documents',
    'Review and submit',
  ]

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/35 z-[100] transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden={!open}
      />
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[840px] bg-white border-l border-slate-200 z-[101] flex flex-col shadow-[-8px_0_32px_rgba(15,23,42,0.1)] transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Create Prior Authorization</h2>
            <p className="text-sm text-slate-500 mt-1">{subtitles[step]}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex px-8 py-4 border-b border-slate-200 bg-slate-50 shrink-0 gap-0">
          {STEP_LABELS.map((name, i) => (
            <div key={name} className="flex items-center flex-1 min-w-0">
              <div
                className={`flex items-center min-w-0 ${i > step ? 'opacity-40' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold shrink-0 ${
                    i < step
                      ? 'border-green-500 bg-green-500 text-white'
                      : i === step
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-slate-200 text-slate-400 bg-white'
                  }`}
                  style={
                    i === step
                      ? { borderColor: primaryColor, backgroundColor: primaryColor }
                      : undefined
                  }
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span
                  className={`ml-2.5 text-xs font-semibold whitespace-nowrap ${
                    i === step ? 'text-sky-600' : i < step ? 'text-green-800' : 'text-slate-400'
                  }`}
                  style={i === step ? { color: primaryColor } : undefined}
                >
                  {name}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-3 min-w-[16px] ${i < step ? 'bg-green-500' : 'bg-slate-200'}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {step === 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-slate-800 mb-3.5 flex items-center gap-2">
                <Search size={15} style={{ color: primaryColor }} />
                Prior authorization request source
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                {(
                  [
                    ['lookup', Search, 'Look up existing request', 'Search by patient name, member ID, or prior PA number'],
                    ['manual', PenLine, 'Enter manually', 'Create a new PA from scratch'],
                    ['fax', Printer, 'Import from fax / document', 'Upload a scanned referral or faxed order'],
                    ['ehr', BookOpen, 'Pull from EHR', 'Import patient record and orders from EHR'],
                  ] as const
                ).map(([id, Icon, title, desc]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSource(id)}
                    className={`text-left p-3.5 border-[1.5px] rounded-lg transition-colors ${
                      source === id
                        ? 'border-sky-400 bg-sky-50'
                        : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50'
                    }`}
                    style={source === id ? { borderColor: primaryColor, backgroundColor: '#eff6ff' } : undefined}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${
                        source === id ? 'text-white' : 'bg-sky-100 text-sky-600'
                      }`}
                      style={source === id ? { backgroundColor: primaryColor } : undefined}
                    >
                      <Icon size={18} />
                    </div>
                    <p className="text-[13px] font-semibold text-slate-800">{title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
                  </button>
                ))}
              </div>

              {(source === 'lookup' || source === 'ehr') && (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5">
                    Search for prior authorization request
                  </p>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className={labelClass}>Patient name, Member ID, or PA number</label>
                      <input
                        className={fieldClass}
                        placeholder="e.g. Rivera, MBR-4821983, or PA-2026-004821"
                        onInput={() => setLookupVisible(false)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLookupVisible(true)}
                      className="px-3.5 py-2 text-xs font-semibold text-white rounded-md h-[34px] shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Search
                    </button>
                  </div>
                  {lookupVisible && (
                    <div className="mt-2.5 flex items-center gap-3 p-3 bg-white border-[1.5px] border-sky-400 rounded-lg">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{ backgroundColor: '#eff6ff', color: primaryColor }}
                      >
                        MR
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-800">Margaret L. Rivera</p>
                        <p className="text-[11px] text-slate-500">
                          DOB: 03/14/1968 · MBR-4821983 · BlueCross BlueShield TX
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800 shrink-0">
                        ✓ Match found
                      </span>
                    </div>
                  )}
                </div>
              )}

              {source === 'manual' && (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5">
                    DME equipment type
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={labelClass}>Equipment category</label>
                      <select className={fieldClass}>
                        <option value="">Select</option>
                        <option>Oxygen therapy</option>
                        <option>CPAP / BiPAP</option>
                        <option>Hospital bed</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>HCPC/CPT Code</label>
                      <input className={fieldClass} placeholder="e.g. E1390" />
                    </div>
                    <div>
                      <label className={labelClass}>Payor</label>
                      <select className={fieldClass}>
                        <option value="">Select payor</option>
                        <option>BlueCross BlueShield TX</option>
                        <option>Aetna</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {source === 'fax' && (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5">
                    Upload referral / faxed order
                  </p>
                  <div className="border-[1.5px] border-dashed border-slate-300 rounded-lg p-4 text-center">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      <span className="font-medium" style={{ color: primaryColor }}>
                        Click to browse
                      </span>{' '}
                      or drag your fax / referral document
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">PDF, JPG, PNG, TIFF — max 25 MB</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Request number *</label>
                <input
                  className={fieldClass}
                  name="request_number"
                  value={createForm.request_number}
                  onChange={onFormChange('request_number')}
                />
              </div>
              <div>
                <label className={labelClass}>Patient ID *</label>
                <input
                  className={fieldClass}
                  name="patient_id"
                  value={createForm.patient_id}
                  onChange={onFormChange('patient_id')}
                />
              </div>
              <div>
                <label className={labelClass}>Payor ID</label>
                <input
                  className={fieldClass}
                  name="payor_id"
                  value={createForm.payor_id}
                  onChange={onFormChange('payor_id')}
                />
              </div>
              <div>
                <label className={labelClass}>Subscriber ID</label>
                <input
                  className={fieldClass}
                  name="subscriber_id"
                  value={createForm.subscriber_id}
                  onChange={onFormChange('subscriber_id')}
                />
              </div>
              <div>
                <label className={labelClass}>Provider name</label>
                <input
                  className={fieldClass}
                  name="provider_name"
                  value={createForm.provider_name}
                  onChange={onFormChange('provider_name')}
                />
              </div>
              <div>
                <label className={labelClass}>Provider NPI</label>
                <input
                  className={fieldClass}
                  name="provider_npi"
                  value={createForm.provider_npi}
                  onChange={onFormChange('provider_npi')}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Provider address</label>
                <textarea
                  className={`${fieldClass} min-h-[72px]`}
                  name="provider_address"
                  rows={3}
                  value={createForm.provider_address}
                  onChange={onFormChange('provider_address')}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardList size={15} style={{ color: primaryColor }} />
                Clinical information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Service code</label>
                  <input
                    className={fieldClass}
                    name="service_code"
                    value={createForm.service_code}
                    onChange={onFormChange('service_code')}
                  />
                </div>
                <div>
                  <label className={labelClass}>Diagnosis code</label>
                  <input
                    className={fieldClass}
                    name="diagnosis_code"
                    value={createForm.diagnosis_code}
                    onChange={onFormChange('diagnosis_code')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Service description</label>
                  <input
                    className={fieldClass}
                    name="service_description"
                    value={createForm.service_description}
                    onChange={onFormChange('service_description')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Diagnosis description</label>
                  <input
                    className={fieldClass}
                    name="diagnosis_description"
                    value={createForm.diagnosis_description}
                    onChange={onFormChange('diagnosis_description')}
                  />
                </div>
                <div>
                  <label className={labelClass}>Requested service date</label>
                  <input
                    type="date"
                    className={fieldClass}
                    name="requested_service_date"
                    value={createForm.requested_service_date}
                    onChange={onFormChange('requested_service_date')}
                  />
                </div>
                <div>
                  <label className={labelClass}>Submitted date</label>
                  <input
                    type="date"
                    className={fieldClass}
                    name="submitted_date"
                    value={createForm.submitted_date}
                    onChange={onFormChange('submitted_date')}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <PriorAuthDocumentsSection
              documents={documents}
              checklist={documentUploadChecklist}
              checklistTitle="Document upload status"
              primaryColor={primaryColor}
              onDocumentsChange={setDocuments}
            />
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white p-4">
                <PriorAuthSubmissionChecklist
                  items={submissionChecklist}
                  primaryColor={primaryColor}
                  title="Submission checklist"
                />
                {!readyToSubmit && (
                  <p className="text-xs text-amber-700 mt-3 pt-3 border-t border-slate-200">
                    Complete all checklist items before submitting this prior authorization.
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Patient & coverage
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['Request #', createForm.request_number],
                    ['Patient', createForm.patient_id],
                    ['Payor', createForm.payor_id],
                    ['Subscriber', createForm.subscriber_id],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="bg-slate-50 border border-slate-200 rounded-md p-2">
                      <p className="text-[10px] text-slate-400">{k}</p>
                      <p className="text-xs font-medium text-slate-800">{v || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Clinical
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['HCPC/CPT Code', createForm.service_code],
                    ['ICD-10', createForm.diagnosis_code],
                    ['Service', createForm.service_description],
                    ['Diagnosis', createForm.diagnosis_description],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="bg-slate-50 border border-slate-200 rounded-md p-2">
                      <p className="text-[10px] text-slate-400">{k}</p>
                      <p className="text-xs font-medium text-slate-800 truncate">{v || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Documents
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-md p-2">
                      <p className="text-[10px] text-slate-400">{doc.name}</p>
                      <p
                        className={`text-xs font-medium truncate ${
                          doc.uploaded ? 'text-green-800' : 'text-slate-500'
                        }`}
                      >
                        {doc.uploaded ? doc.fileName ?? 'Uploaded' : 'Not uploaded'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-8 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Step {step + 1} of {STEP_LABELS.length}
          </span>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="px-4 py-2 text-[13px] font-medium border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                className="px-5 py-2 text-[13px] font-semibold text-white rounded-lg"
                style={{ backgroundColor: primaryColor }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={isCreating || !readyToSubmit}
                onClick={(e) => onSubmit(e as unknown as FormEvent)}
                className="px-5 py-2 text-[13px] font-semibold text-white rounded-lg bg-green-800 hover:bg-green-900 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Prior Auth'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default PriorAuthCreateDrawer
