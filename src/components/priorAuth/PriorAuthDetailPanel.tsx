import { useMemo, useState } from 'react'
import {
  Check,
  Circle,
  ClipboardList,
  Clock,
  Eye,
  Save,
  Send,
} from 'lucide-react'
import PriorAuthDocumentsSection from './PriorAuthDocumentsSection'
import { buildSubmissionChecklist } from './priorAuthDocumentSlots'
import type {
  PriorAuthActivityItem,
  PriorAuthClinicalForm,
  PriorAuthDetailDocument,
  PriorAuthDisplayRow,
} from './priorAuthTypes'
import { computeCompletion, formatPaDate } from './priorAuthUtils'

type PriorAuthDetailPanelProps = {
  row: PriorAuthDisplayRow | null
  clinical: PriorAuthClinicalForm
  documents: PriorAuthDetailDocument[]
  activity: PriorAuthActivityItem[]
  isLoadingDetails: boolean
  primaryColor: string
  onClinicalChange: (patch: Partial<PriorAuthClinicalForm>) => void
  onDocumentsChange: (docs: PriorAuthDetailDocument[]) => void
  onUpdateStatus: () => void
  onSaveDraft: () => void
  onToast: (message: string, type: 'success' | 'error') => void
}

const fieldClass =
  'w-full px-2.5 py-1.5 text-[13px] border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-sky-400 focus:ring-[3px] focus:ring-sky-400/10'
const labelClass = 'block text-[11px] font-medium text-slate-500 mb-1'

type InfoField = {
  label: string
  value: string
  mono?: boolean
  wide?: boolean
}

const InfoCard = ({
  title,
  fields,
}: {
  title: string
  fields: InfoField[]
}) => (
  <div className="border border-slate-200 rounded-lg p-3.5 h-full flex flex-col">
    <h3 className="text-[13px] font-semibold text-slate-800 mb-2.5">{title}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 flex-1 content-start">
      {fields.map(({ label, value, mono, wide }) => (
        <div key={label} className={wide ? 'sm:col-span-2' : undefined}>
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">
            {label}
          </span>
          <p
            className={`text-[13px] text-slate-600 mt-0.5 ${mono ? 'font-mono text-xs text-slate-500' : ''}`}
          >
            {value || '-'}
          </p>
        </div>
      ))}
    </div>
  </div>
)

const PriorAuthDetailPanel = ({
  row,
  clinical,
  documents,
  activity,
  isLoadingDetails,
  primaryColor,
  onClinicalChange,
  onDocumentsChange,
  onUpdateStatus,
  onSaveDraft,
  onToast,
}: PriorAuthDetailPanelProps) => {
  const [reviewed, setReviewed] = useState(false)

  const { percent, checks } = useMemo(
    () => computeCompletion(row, clinical, documents, reviewed),
    [row, clinical, documents, reviewed]
  )

  const submissionChecklist = useMemo(
    () =>
      buildSubmissionChecklist({
        patientComplete: checks.patient && checks.provider,
        clinicalComplete: checks.clinical,
        documents,
      }),
    [checks.patient, checks.provider, checks.clinical, documents]
  )

  const canSubmit = checks.patient && checks.provider && checks.clinical && checks.docs && reviewed

  const urgencyClass = (level: PriorAuthClinicalForm['urgency']) => {
    if (clinical.urgency !== level) return 'border-slate-200 bg-white text-slate-500'
    if (level === 'routine') return 'bg-green-100 text-green-800 border-green-300'
    if (level === 'urgent') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  if (!row) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white border border-slate-200 rounded-xl p-8 min-h-[24rem] lg:min-h-full">
        <p className="text-sm text-slate-500">Select a prior authorization to view details.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[24rem] lg:min-h-full lg:h-full">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{row.requestNumber}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submitted {formatPaDate(row.submittedDate)} · Requested service by{' '}
            {formatPaDate(row.requestedServiceDate)}
          </p>
        </div>
        <button
          type="button"
          onClick={onUpdateStatus}
          className="px-4 py-1.5 text-[13px] font-semibold border-[1.5px] rounded-lg bg-white transition-colors hover:bg-sky-50 shrink-0"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Update Status
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
          <InfoCard
            title="Patient & Coverage"
            fields={[
              { label: 'Patient Name', value: row.patientName },
              {
                label: 'Date of Birth',
                value: row.dateOfBirth ? formatPaDate(row.dateOfBirth) : '-',
              },
              { label: 'Gender', value: row.gender },
              { label: 'Payor Name', value: row.payorName },
              { label: 'Plan Name', value: row.planName },
              { label: 'Subscriber ID', value: row.subscriberId, mono: true },
              { label: 'Group ID', value: row.groupId, mono: true },
              { label: 'Prescriber Name', value: row.prescriberName },
            ]}
          />
          <InfoCard
            title="Provider"
            fields={[
              { label: 'DME Supplier', value: row.providerName },
              { label: 'NPI', value: row.providerNpi, mono: true },
              { label: 'PTAN', value: row.ptan, mono: true },
              { label: 'Address', value: row.providerAddress, wide: true },
            ]}
          />
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[13px] font-semibold text-slate-800">
            <ClipboardList size={15} style={{ color: primaryColor }} />
            Clinical Details & Documents
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className={labelClass}>
                  HCPC/CPT Code <span className="text-red-600">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={clinical.serviceCode}
                  onChange={(e) => onClinicalChange({ serviceCode: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Description <span className="text-red-600">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={clinical.serviceDescription}
                  onChange={(e) => onClinicalChange({ serviceDescription: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              <div>
                <label className={labelClass}>
                  ICD-10 diagnosis <span className="text-red-600">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={clinical.diagnosisCode}
                  onChange={(e) => onClinicalChange({ diagnosisCode: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Diagnosis description</label>
                <input
                  className={fieldClass}
                  value={clinical.diagnosisDescription}
                  onChange={(e) => onClinicalChange({ diagnosisDescription: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Quantity / length of need <span className="text-red-600">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={clinical.quantityLength}
                  onChange={(e) => onClinicalChange({ quantityLength: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              <div>
                <label className={labelClass}>
                  Service start date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className={fieldClass}
                  value={clinical.requestedServiceDate}
                  onChange={(e) => onClinicalChange({ requestedServiceDate: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Place of service</label>
                <select
                  className={fieldClass}
                  value={clinical.placeOfService}
                  onChange={(e) => onClinicalChange({ placeOfService: e.target.value })}
                >
                  <option>12 — Home</option>
                  <option>11 — Office</option>
                  <option>31 — SNF</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Rental vs. purchase</label>
                <select
                  className={fieldClass}
                  value={clinical.rentalPurchase}
                  onChange={(e) => onClinicalChange({ rentalPurchase: e.target.value })}
                >
                  <option>Rental (monthly)</option>
                  <option>Purchase</option>
                  <option>Rent-to-own</option>
                </select>
              </div>
            </div>
            <div className="h-px bg-slate-100 my-3" />
            <div className="mb-3">
              <label className={labelClass}>
                Medical necessity / clinical justification <span className="text-red-600">*</span>
              </label>
              <textarea
                className={`${fieldClass} min-h-[60px] resize-y`}
                rows={3}
                value={clinical.medicalNecessity}
                onChange={(e) => onClinicalChange({ medicalNecessity: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className={labelClass}>
                  Prescribing physician <span className="text-red-600">*</span>
                </label>
                <input
                  className={fieldClass}
                  value={clinical.orderingPhysician}
                  onChange={(e) => onClinicalChange({ orderingPhysician: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Face-to-face exam date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className={fieldClass}
                  value={clinical.faceToFaceDate}
                  onChange={(e) => onClinicalChange({ faceToFaceDate: e.target.value })}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className={labelClass}>
                Urgency level <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['routine', 'urgent', 'stat'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onClinicalChange({ urgency: level })}
                    className={`px-3 py-1 text-xs font-medium border rounded-full capitalize transition-colors ${urgencyClass(level)}`}
                  >
                    {level === 'stat' ? 'STAT' : level}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100 my-3" />

            <div className="mb-3">
              <PriorAuthDocumentsSection
                documents={documents}
                checklist={submissionChecklist}
                primaryColor={primaryColor}
                isLoading={isLoadingDetails}
                onDocumentsChange={onDocumentsChange}
              />
            </div>

            <div className="h-px bg-slate-100 my-3" />

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                <Clock size={14} style={{ color: primaryColor }} />
                Activity
              </div>
              {isLoadingDetails ? (
                <p className="text-sm text-slate-500">Loading activity...</p>
              ) : activity.length === 0 ? (
                <p className="text-sm text-slate-500">No activity for this request.</p>
              ) : (
                <div>
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-2.5 py-2 border-b border-slate-100 last:border-0"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          item.tone === 'green'
                            ? 'bg-green-500'
                            : item.tone === 'amber'
                              ? 'bg-amber-500'
                              : 'bg-sky-500'
                        }`}
                      />
                      <div>
                        <p className="text-xs text-slate-600">{item.message}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Completion</span>
          <div className="flex-1 h-1.5 bg-slate-200 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-300"
              style={{ width: `${percent}%`, backgroundColor: primaryColor }}
            />
          </div>
          <span className="text-[11px] font-semibold min-w-[30px] text-right" style={{ color: primaryColor }}>
            {percent}%
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mb-2.5">
          {submissionChecklist.map((item) => (
            <span
              key={item.id}
              className={`text-[11px] flex items-center gap-1 ${item.done ? 'text-green-800' : 'text-slate-400'}`}
            >
              {item.done ? <Check size={13} strokeWidth={2.5} /> : <Circle size={13} />}
              {item.label}
            </span>
          ))}
          <span
            className={`text-[11px] flex items-center gap-1 ${reviewed ? 'text-green-800' : 'text-slate-400'}`}
          >
            {reviewed ? <Check size={13} strokeWidth={2.5} /> : <Circle size={13} />}
            Reviewed
          </span>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onSaveDraft}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-100"
          >
            <Save size={14} />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => {
              setReviewed(true)
              onToast('Request marked as reviewed.', 'success')
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium border rounded-lg transition-colors ${
              reviewed
                ? 'bg-green-100 border-green-300 text-green-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eye size={14} />
            Review
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onToast('Prior authorization submitted.', 'success')}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold border-none rounded-lg text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
            style={{ backgroundColor: canSubmit ? primaryColor : undefined }}
          >
            <Send size={14} />
            Submit PA
          </button>
        </div>
      </div>
    </div>
  )
}

export default PriorAuthDetailPanel
