import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCcw } from 'lucide-react'
import Input from '../components/forms/Input'
import Modal from '../components/Modal'
import Select from '../components/forms/Select'
import Toast from '../components/Toast'
import PriorAuthCreateDrawer from '../components/priorAuth/PriorAuthCreateDrawer'
import PriorAuthDetailPanel from '../components/priorAuth/PriorAuthDetailPanel'
import PriorAuthRequestList from '../components/priorAuth/PriorAuthRequestList'
import {
  clinicalFormFromRow,
  emptyClinicalForm,
  type PriorAuthActivityItem,
  type PriorAuthClinicalForm,
  type PriorAuthDetailDocument,
  type PriorAuthDisplayRow,
} from '../components/priorAuth/priorAuthTypes'
import {
  apiToDisplayRow,
  demoDisplayRows,
  findSeedForRow,
  formatPaDate,
  normalizeStatus,
  normalizeStatusFromText,
} from '../components/priorAuth/priorAuthUtils'
import {
  defaultPriorAuthDocuments,
  normalizePriorAuthDocuments,
} from '../components/priorAuth/priorAuthDocumentSlots'
import { useTheme } from '../contexts/ThemeContext'
import {
  createPriorAuthorization,
  listPriorAuthorizationActivity,
  listPriorAuthorizationDocuments,
  listPriorAuthorizations,
  patchPriorAuthorizationStatus,
  type ApiPriorAuthorization,
  type ApiPriorAuthorizationActivity,
  type ApiPriorAuthorizationDocument,
  type CreatePriorAuthorizationPayload,
  type PatchPriorAuthorizationStatusPayload,
} from '../services/priorAuthorizationService'

type StatusFormState = PatchPriorAuthorizationStatusPayload

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'cancelled', label: 'Cancelled' },
]

const initialCreateFormState = (): CreatePriorAuthorizationPayload => {
  const today = new Date().toISOString().slice(0, 10)
  return {
    request_number: '',
    patient_id: '',
    payor_id: '',
    service_code: '',
    service_description: '',
    diagnosis_code: '',
    diagnosis_description: '',
    subscriber_id: '',
    requested_service_date: today,
    submitted_date: today,
    status: 'pending',
    provider_name: '',
    provider_npi: '',
    provider_address: '',
  }
}

const initialStatusFormState = (): StatusFormState => ({
  status: 'pending',
  status_label: 'Pending',
  description: '',
  performed_by_label: '',
})

const toSizeLabel = (value: unknown): string => {
  if (typeof value === 'number') {
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
    return `${Math.round(value / 1024)} KB`
  }
  if (typeof value === 'string' && value.trim()) return value
  return ''
}

const PriorAuthorization = () => {
  const { theme } = useTheme()
  const primaryColor = theme.colors.primary ?? '#0ea5e9'

  const [rows, setRows] = useState<PriorAuthDisplayRow[]>([])
  const [useDemoData, setUseDemoData] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<PriorAuthDetailDocument[]>(() =>
    defaultPriorAuthDocuments()
  )
  const [activity, setActivity] = useState<PriorAuthActivityItem[]>([])
  const [clinical, setClinical] = useState<PriorAuthClinicalForm | null>(null)

  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [createForm, setCreateForm] = useState(initialCreateFormState())
  const [statusForm, setStatusForm] = useState<StatusFormState>(initialStatusFormState())
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [showToast, setShowToast] = useState(false)

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId]
  )

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToastType(type)
    setToastMessage(message)
    setShowToast(true)
  }

  const showErrorToast = (error: unknown, fallback: string) => {
    showToastMsg(error instanceof Error ? error.message : fallback, 'error')
  }

  const loadSeedDetails = (row: PriorAuthDisplayRow) => {
    const seed = findSeedForRow(row.requestNumber, row.id)
    if (seed) {
      setDocuments(normalizePriorAuthDocuments(seed.documents))
      setActivity(seed.activity)
    } else {
      setDocuments(defaultPriorAuthDocuments())
      setActivity([])
    }
  }

  const mapApiDocuments = (items: ApiPriorAuthorizationDocument[]): PriorAuthDetailDocument[] =>
    items.map((item, index) => ({
      id: (typeof item.id === 'string' && item.id) || `doc-api-${index}`,
      name:
        (typeof item.name === 'string' && item.name) ||
        (typeof item.file_name === 'string' && item.file_name) ||
        'Document',
      meta: [
        toSizeLabel(item.size),
        formatPaDate(
          (typeof item.uploaded_at === 'string' && item.uploaded_at) ||
            (typeof item.created_at === 'string' && item.created_at) ||
            ''
        ),
        (typeof item.uploaded_by === 'string' && item.uploaded_by) || 'System',
      ]
        .filter(Boolean)
        .join(' · '),
      required: false,
      uploaded: true,
      fileName:
        (typeof item.file_name === 'string' && item.file_name) ||
        (typeof item.name === 'string' && item.name),
    }))

  const mapApiActivity = (items: ApiPriorAuthorizationActivity[]): PriorAuthActivityItem[] =>
    items.map((item, index) => {
      const resolvedStatus =
        typeof item.status === 'string' && item.status.trim()
          ? normalizeStatus(item.status)
          : normalizeStatusFromText(item.status_label ?? item.action ?? item.event)
      const tone: PriorAuthActivityItem['tone'] =
        resolvedStatus === 'approved'
          ? 'green'
          : resolvedStatus === 'pending'
            ? 'amber'
            : 'default'
      return {
        id: (typeof item.id === 'string' && item.id) || `act-${index}`,
        message:
          (typeof item.description === 'string' && item.description) ||
          (typeof item.details === 'string' && item.details) ||
          (typeof item.action === 'string' && item.action) ||
          'Activity update',
        time: formatPaDate(
          (typeof item.created_at === 'string' && item.created_at) ||
            (typeof item.timestamp === 'string' && item.timestamp) ||
            (typeof item.date === 'string' && item.date) ||
            ''
        ),
        tone,
      }
    })

  const loadPriorAuthorizations = async () => {
    setIsLoadingList(true)
    const demo = demoDisplayRows()
    try {
      const list = await listPriorAuthorizations()
      const apiMapped = list.map((item, i) => apiToDisplayRow(item as ApiPriorAuthorization, i))
      const demoNumbers = new Set(demo.map((r) => r.requestNumber))
      const apiOnly = apiMapped.filter((r) => !demoNumbers.has(r.requestNumber))
      const merged = [...apiOnly, ...demo]
      setUseDemoData(true)
      setRows(merged)
      setSelectedId((prev) => {
        if (prev && merged.some((r) => r.id === prev)) return prev
        return merged[0]?.id ?? null
      })
    } catch {
      setUseDemoData(true)
      setRows(demo)
      setSelectedId((prev) => (prev && demo.some((r) => r.id === prev) ? prev : demo[0]?.id ?? null))
    } finally {
      setIsLoadingList(false)
    }
  }

  const loadPriorAuthDetails = async (priorAuthId: string, row: PriorAuthDisplayRow) => {
    const seed = findSeedForRow(row.requestNumber, row.id)
    if (seed) {
      loadSeedDetails(row)
      return
    }
    if (useDemoData || row.isDemo) {
      loadSeedDetails(row)
      return
    }
    setIsLoadingDetails(true)
    try {
      const [docList, activityList] = await Promise.all([
        listPriorAuthorizationDocuments(priorAuthId),
        listPriorAuthorizationActivity(priorAuthId),
      ])
      const apiDocs = mapApiDocuments(docList)
      const seed = findSeedForRow(row.requestNumber, row.id)
      const mergedSource =
        apiDocs.length > 0 ? apiDocs : seed?.documents.map((d) => ({ ...d })) ?? []
      setDocuments(normalizePriorAuthDocuments(mergedSource))
      const apiAct = mapApiActivity(activityList)
      setActivity(apiAct.length > 0 ? apiAct : seed?.activity ?? [])
    } catch {
      loadSeedDetails(row)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  useEffect(() => {
    loadPriorAuthorizations()
  }, [])

  useEffect(() => {
    if (!selectedRow) {
      setClinical(null)
      setDocuments(defaultPriorAuthDocuments())
      setActivity([])
      return
    }
    setClinical(clinicalFormFromRow(selectedRow))
    loadPriorAuthDetails(selectedRow.id, selectedRow)
  }, [selectedId, useDemoData])

  const handleCreateInput =
    (field: keyof CreatePriorAuthorizationPayload) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setCreateForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!createForm.request_number.trim() || !createForm.patient_id.trim()) {
      showToastMsg('Request number and patient ID are required.', 'error')
      return
    }
    setIsCreating(true)
    try {
      await createPriorAuthorization({
        ...createForm,
        request_number: createForm.request_number.trim(),
        patient_id: createForm.patient_id.trim(),
        payor_id: createForm.payor_id.trim(),
        provider_name: createForm.provider_name.trim(),
        provider_npi: createForm.provider_npi.trim(),
        provider_address: createForm.provider_address.trim(),
      })
      await loadPriorAuthorizations()
      setIsCreateOpen(false)
      setCreateForm(initialCreateFormState())
      showToastMsg('Prior authorization created successfully.')
    } catch (error) {
      showErrorToast(error, 'Unable to create prior authorization.')
    } finally {
      setIsCreating(false)
    }
  }

  const openStatusModal = () => {
    if (!selectedRow) return
    setStatusForm({
      status: selectedRow.status,
      status_label: selectedRow.statusLabel,
      description: '',
      performed_by_label: '',
    })
    setIsStatusOpen(true)
  }

  const handleStatusInput =
    (field: keyof StatusFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setStatusForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const handleStatusUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedRow) return
    if (!statusForm.status_label.trim() || !statusForm.performed_by_label.trim()) {
      showToastMsg('Status label and performed by are required.', 'error')
      return
    }
    if (useDemoData || selectedRow.isDemo) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedRow.id
            ? { ...r, status: statusForm.status, statusLabel: statusForm.status_label.trim() }
            : r
        )
      )
      setIsStatusOpen(false)
      showToastMsg('Status updated (demo).')
      return
    }
    setIsUpdatingStatus(true)
    try {
      await patchPriorAuthorizationStatus(selectedRow.id, {
        status: statusForm.status,
        status_label: statusForm.status_label.trim(),
        description: statusForm.description.trim(),
        performed_by_label: statusForm.performed_by_label.trim(),
      })
      setIsStatusOpen(false)
      await loadPriorAuthorizations()
      if (selectedRow) await loadPriorAuthDetails(selectedRow.id, selectedRow)
      showToastMsg('Prior authorization status updated successfully.')
    } catch (error) {
      showErrorToast(error, 'Unable to update prior authorization status.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <div
      className="flex flex-col w-full min-h-[calc(100vh-8rem)]"
      style={{ backgroundColor: '#f0f4f8' }}
    >
      <div className="bg-white border-b border-slate-200 px-6 sm:px-7 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl sm:text-[22px] font-semibold text-slate-800">
            Prior Authorizations
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Manage DME request lifecycle from creation through payor decision.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadPriorAuthorizations}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Create Prior Auth
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 px-6 sm:px-7 py-5 flex-1 min-h-[28rem] lg:min-h-[calc(100vh-14rem)]">
        <PriorAuthRequestList
          rows={rows}
          selectedId={selectedId}
          isLoading={isLoadingList}
          primaryColor={primaryColor}
          onSelect={setSelectedId}
        />
        <PriorAuthDetailPanel
          row={selectedRow}
          clinical={clinical ?? (selectedRow ? clinicalFormFromRow(selectedRow) : emptyClinicalForm())}
          documents={documents}
          activity={activity}
          isLoadingDetails={isLoadingDetails}
          primaryColor={primaryColor}
          onClinicalChange={(patch) =>
            setClinical((prev) => ({ ...(prev ?? clinicalFormFromRow(selectedRow!)), ...patch }))
          }
          onDocumentsChange={setDocuments}
          onUpdateStatus={openStatusModal}
          onSaveDraft={() => showToastMsg('Draft saved.')}
          onToast={showToastMsg}
        />
      </div>

      <PriorAuthCreateDrawer
        open={isCreateOpen}
        primaryColor={primaryColor}
        createForm={createForm}
        isCreating={isCreating}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        onFormChange={handleCreateInput}
      />

      <Modal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        title="Update Prior Authorization Status"
        size="lg"
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <Select
            label="Status"
            name="status"
            required
            value={statusForm.status}
            options={statusOptions}
            onChange={handleStatusInput('status')}
          />
          <Input
            label="Status Label"
            name="status_label"
            required
            value={statusForm.status_label}
            onChange={handleStatusInput('status_label')}
          />
          <Input
            label="Performed By"
            name="performed_by_label"
            required
            value={statusForm.performed_by_label}
            onChange={handleStatusInput('performed_by_label')}
          />
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: theme.colors.textSecondary }}
            >
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              value={statusForm.description}
              onChange={handleStatusInput('description')}
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsStatusOpen(false)}
              className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingStatus}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {isUpdatingStatus ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </form>
      </Modal>

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  )
}

export default PriorAuthorization
