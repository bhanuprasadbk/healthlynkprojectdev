import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, FileText, Plus, RefreshCcw, XCircle } from 'lucide-react'
import Button from '../components/forms/Button'
import Input from '../components/forms/Input'
import Modal from '../components/Modal'
import Select from '../components/forms/Select'
import Timeline from '../components/Timeline'
import Toast from '../components/Toast'
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
  type PriorAuthorizationStatus,
} from '../services/priorAuthorizationService'

type PriorAuthRow = {
  id: string
  requestNumber: string
  patientId: string
  payorId: string
  serviceCode: string
  serviceDescription: string
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
}

type PriorAuthDocument = {
  id: string
  name: string
  sizeLabel: string
  uploadedAt: string
  uploadedBy: string
}

type CreateFormState = CreatePriorAuthorizationPayload

type StatusFormState = PatchPriorAuthorizationStatusPayload

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'cancelled', label: 'Cancelled' },
]

const initialCreateFormState = (): CreateFormState => {
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

const fallbackLabel = (status: string): string =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'

const normalizeStatus = (status: unknown): PriorAuthorizationStatus => {
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
  if (value === 'pending_review' || value === 'pending review' || value === 'in_review') {
    return 'pending'
  }
  return 'pending'
}

const normalizeStatusFromText = (value: unknown): PriorAuthorizationStatus => {
  if (typeof value !== 'string') return 'pending'
  const text = value.toLowerCase().trim()
  if (text.includes('approved')) return 'approved'
  if (text.includes('denied') || text.includes('reject')) return 'denied'
  if (text.includes('cancel')) return 'cancelled'
  if (text.includes('pending') || text.includes('review')) return 'pending'
  return 'pending'
}

const formatDate = (date: string): string => {
  if (!date) return '-'
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return date
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const toSizeLabel = (value: unknown): string => {
  if (typeof value === 'number') {
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
    if (value >= 1024) return `${Math.round(value / 1024)} KB`
    return `${value} B`
  }
  if (typeof value === 'string' && value.trim()) return value
  return '-'
}

const PriorAuthorization = () => {
  const { theme } = useTheme()
  const [priorAuths, setPriorAuths] = useState<PriorAuthRow[]>([])
  const [selectedPriorAuthId, setSelectedPriorAuthId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<PriorAuthDocument[]>([])
  const [activity, setActivity] = useState<ApiPriorAuthorizationActivity[]>([])
  const [activeTab, setActiveTab] = useState<'documents' | 'activity'>('documents')
  const [isLoadingPriorAuths, setIsLoadingPriorAuths] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateFormState())
  const [statusForm, setStatusForm] = useState<StatusFormState>(initialStatusFormState())
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [showToast, setShowToast] = useState(false)

  const selectedPriorAuth = useMemo(
    () => priorAuths.find((row) => row.id === selectedPriorAuthId) ?? null,
    [priorAuths, selectedPriorAuthId]
  )

  const normalizedRows = (items: ApiPriorAuthorization[]): PriorAuthRow[] =>
    items.map((item, index) => {
      const status =
        typeof item.status === 'string' && item.status.trim()
          ? normalizeStatus(item.status)
          : normalizeStatusFromText(item.status_label)
      const id =
        (typeof item.id === 'string' && item.id) ||
        (typeof item.request_number === 'string' && item.request_number) ||
        `prior-auth-${index + 1}`
      return {
        id,
        requestNumber:
          (typeof item.request_number === 'string' && item.request_number) || id,
        patientId: (typeof item.patient_id === 'string' && item.patient_id) || '-',
        payorId: (typeof item.payor_id === 'string' && item.payor_id) || '-',
        serviceCode: (typeof item.service_code === 'string' && item.service_code) || '-',
        serviceDescription:
          (typeof item.service_description === 'string' && item.service_description) || '-',
        diagnosisCode:
          (typeof item.diagnosis_code === 'string' && item.diagnosis_code) || '-',
        diagnosisDescription:
          (typeof item.diagnosis_description === 'string' &&
            item.diagnosis_description) ||
          '-',
        subscriberId:
          (typeof item.subscriber_id === 'string' && item.subscriber_id) || '-',
        requestedServiceDate:
          (typeof item.requested_service_date === 'string' &&
            item.requested_service_date) ||
          '',
        submittedDate:
          (typeof item.submitted_date === 'string' && item.submitted_date) || '',
        status,
        statusLabel:
          (typeof item.status_label === 'string' && item.status_label) ||
          fallbackLabel(status),
        providerName:
          (typeof item.provider_name === 'string' && item.provider_name) || '-',
        providerNpi: (typeof item.provider_npi === 'string' && item.provider_npi) || '-',
        providerAddress:
          (typeof item.provider_address === 'string' && item.provider_address) || '-',
      }
    })

  const mapDocuments = (items: ApiPriorAuthorizationDocument[]): PriorAuthDocument[] =>
    items.map((item, index) => ({
      id:
        (typeof item.id === 'string' && item.id) ||
        `doc-${index + 1}-${Date.now().toString()}`,
      name:
        (typeof item.name === 'string' && item.name) ||
        (typeof item.file_name === 'string' && item.file_name) ||
        (typeof item.type === 'string' && item.type) ||
        'Document',
      sizeLabel: toSizeLabel(item.size),
      uploadedAt:
        (typeof item.uploaded_at === 'string' && item.uploaded_at) ||
        (typeof item.uploaded_date === 'string' && item.uploaded_date) ||
        (typeof item.created_at === 'string' && item.created_at) ||
        '',
      uploadedBy:
        (typeof item.uploaded_by === 'string' && item.uploaded_by) || 'System',
    }))

  const timelineItems = useMemo(
    () =>
      activity.map((item, index) => {
        const resolvedStatus =
          typeof item.status === 'string' && item.status.trim()
            ? normalizeStatus(item.status)
            : normalizeStatusFromText(item.status_label ?? item.action ?? item.event)
        return {
        id:
          (typeof item.id === 'string' && item.id) ||
          `act-${index + 1}-${Date.now().toString()}`,
        date:
          (typeof item.created_at === 'string' && item.created_at) ||
          (typeof item.timestamp === 'string' && item.timestamp) ||
          (typeof item.date === 'string' && item.date) ||
          new Date().toISOString(),
        status: resolvedStatus,
        action:
          (typeof item.action === 'string' && item.action) ||
          (typeof item.event === 'string' && item.event) ||
          'Activity',
        performedBy:
          (typeof item.performed_by_label === 'string' && item.performed_by_label) ||
          'System',
        details:
          (typeof item.description === 'string' && item.description) ||
          (typeof item.details === 'string' && item.details) ||
          'No description provided.',
        result:
          (typeof item.status_label === 'string' && item.status_label) ||
          fallbackLabel(resolvedStatus),
        }
      }),
    [activity]
  )

  const showErrorToast = (error: unknown, fallback: string) => {
    setToastType('error')
    setToastMessage(error instanceof Error ? error.message : fallback)
    setShowToast(true)
  }

  const loadPriorAuthorizations = async () => {
    setIsLoadingPriorAuths(true)
    try {
      const list = await listPriorAuthorizations()
      const rows = normalizedRows(list)
      setPriorAuths(rows)
      setSelectedPriorAuthId((prev) => {
        if (prev && rows.some((row) => row.id === prev)) return prev
        return rows[0]?.id ?? null
      })
    } catch (error) {
      showErrorToast(error, 'Unable to load prior authorizations.')
    } finally {
      setIsLoadingPriorAuths(false)
    }
  }

  const loadPriorAuthDetails = async (priorAuthId: string) => {
    setIsLoadingDetails(true)
    try {
      const [docList, activityList] = await Promise.all([
        listPriorAuthorizationDocuments(priorAuthId),
        listPriorAuthorizationActivity(priorAuthId),
      ])
      setDocuments(mapDocuments(docList))
      setActivity(activityList)
    } catch (error) {
      setDocuments([])
      setActivity([])
      showErrorToast(error, 'Unable to load prior authorization details.')
    } finally {
      setIsLoadingDetails(false)
    }
  }

  useEffect(() => {
    loadPriorAuthorizations()
  }, [])

  useEffect(() => {
    if (!selectedPriorAuthId) {
      setDocuments([])
      setActivity([])
      return
    }
    loadPriorAuthDetails(selectedPriorAuthId)
  }, [selectedPriorAuthId])

  const getStatusBadgeClass = (status: PriorAuthorizationStatus) => {
    if (status === 'approved') return 'bg-green-100 text-green-700'
    if (status === 'denied') return 'bg-red-100 text-red-700'
    if (status === 'cancelled') return 'bg-gray-200 text-gray-700'
    return 'bg-amber-100 text-amber-700'
  }

  const getStatusIcon = (status: PriorAuthorizationStatus) => {
    if (status === 'approved') return <CheckCircle2 size={16} />
    if (status === 'denied' || status === 'cancelled') return <XCircle size={16} />
    return <Clock3 size={16} />
  }

  const handleCreateInput =
    (field: keyof CreateFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setCreateForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!createForm.request_number.trim() || !createForm.patient_id.trim()) {
      setToastType('error')
      setToastMessage('Request number and patient ID are required.')
      setShowToast(true)
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
      setToastType('success')
      setToastMessage('Prior authorization created successfully.')
      setShowToast(true)
    } catch (error) {
      showErrorToast(error, 'Unable to create prior authorization.')
    } finally {
      setIsCreating(false)
    }
  }

  const openStatusModal = () => {
    if (!selectedPriorAuth) return
    setStatusForm({
      status: selectedPriorAuth.status,
      status_label: selectedPriorAuth.statusLabel,
      description: '',
      performed_by_label: '',
    })
    setIsStatusOpen(true)
  }

  const handleStatusInput =
    (field: keyof StatusFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setStatusForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleStatusUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedPriorAuth) return
    if (!statusForm.status_label.trim() || !statusForm.performed_by_label.trim()) {
      setToastType('error')
      setToastMessage('Status label and performed by are required.')
      setShowToast(true)
      return
    }
    setIsUpdatingStatus(true)
    try {
      await patchPriorAuthorizationStatus(selectedPriorAuth.id, {
        status: statusForm.status,
        status_label: statusForm.status_label.trim(),
        description: statusForm.description.trim(),
        performed_by_label: statusForm.performed_by_label.trim(),
      })
      setIsStatusOpen(false)
      await loadPriorAuthorizations()
      await loadPriorAuthDetails(selectedPriorAuth.id)
      setToastType('success')
      setToastMessage('Prior authorization status updated successfully.')
      setShowToast(true)
    } catch (error) {
      showErrorToast(error, 'Unable to update prior authorization status.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" style={{ backgroundColor: theme.colors.background }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
            Prior Authorizations
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
            Manage request lifecycle from creation through payor decision.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadPriorAuthorizations}>
            <span className="inline-flex items-center gap-2">
              <RefreshCcw size={16} />
              Refresh
            </span>
          </Button>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              Create Prior Auth
            </span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 rounded-xl border overflow-hidden" style={{ backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.border }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: theme.colors.border }}>
            <h2 className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
              Requests
            </h2>
          </div>
          <div className="max-h-[36rem] overflow-auto">
            {isLoadingPriorAuths ? (
              <p className="px-4 py-6 text-sm" style={{ color: theme.colors.textSecondary }}>
                Loading prior authorizations...
              </p>
            ) : priorAuths.length === 0 ? (
              <p className="px-4 py-6 text-sm" style={{ color: theme.colors.textSecondary }}>
                No prior authorizations found. Create the first request.
              </p>
            ) : (
              priorAuths.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedPriorAuthId(row.id)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors ${
                    row.id === selectedPriorAuthId ? 'bg-primary-50' : ''
                  }`}
                  style={{ borderColor: theme.colors.border }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
                      {row.requestNumber}
                    </p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(row.status)}`}>
                      {getStatusIcon(row.status)}
                      {row.statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                    Patient: {row.patientId} • Service: {row.serviceCode}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-2 rounded-xl border p-4 sm:p-5 space-y-4" style={{ backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.border }}>
          {!selectedPriorAuth ? (
            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
              Select a prior authorization to view details.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold break-all" style={{ color: theme.colors.textPrimary }}>
                    {selectedPriorAuth.requestNumber}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                    Submitted {formatDate(selectedPriorAuth.submittedDate)} • Requested {formatDate(selectedPriorAuth.requestedServiceDate)}
                  </p>
                </div>
                <Button variant="outline" onClick={openStatusModal}>
                  Update Status
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border }}>
                  <p className="font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Patient & Coverage</p>
                  <p style={{ color: theme.colors.textSecondary }}>Patient ID: {selectedPriorAuth.patientId}</p>
                  <p style={{ color: theme.colors.textSecondary }}>Subscriber ID: {selectedPriorAuth.subscriberId}</p>
                  <p style={{ color: theme.colors.textSecondary }}>Payor ID: {selectedPriorAuth.payorId}</p>
                </div>
                <div className="rounded-lg border p-3" style={{ borderColor: theme.colors.border }}>
                  <p className="font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Provider</p>
                  <p style={{ color: theme.colors.textSecondary }}>{selectedPriorAuth.providerName}</p>
                  <p style={{ color: theme.colors.textSecondary }}>NPI: {selectedPriorAuth.providerNpi}</p>
                  <p style={{ color: theme.colors.textSecondary }}>{selectedPriorAuth.providerAddress}</p>
                </div>
                <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: theme.colors.border }}>
                  <p className="font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Service & Diagnosis</p>
                  <p style={{ color: theme.colors.textSecondary }}>
                    Service: {selectedPriorAuth.serviceCode} - {selectedPriorAuth.serviceDescription}
                  </p>
                  <p style={{ color: theme.colors.textSecondary }}>
                    Diagnosis: {selectedPriorAuth.diagnosisCode} - {selectedPriorAuth.diagnosisDescription}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                <div className="flex border-b" style={{ borderColor: theme.colors.border }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('documents')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'documents' ? 'bg-primary-50' : ''}`}
                    style={{ color: theme.colors.textPrimary }}
                  >
                    Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'activity' ? 'bg-primary-50' : ''}`}
                    style={{ color: theme.colors.textPrimary }}
                  >
                    Activity
                  </button>
                </div>
                <div className="p-4">
                  {isLoadingDetails ? (
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      Loading {activeTab}...
                    </p>
                  ) : activeTab === 'documents' ? (
                    documents.length === 0 ? (
                      <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        No documents available for this request.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="rounded-lg border px-3 py-2 flex items-start justify-between gap-3"
                            style={{ borderColor: theme.colors.border }}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium break-all" style={{ color: theme.colors.textPrimary }}>
                                {doc.name}
                              </p>
                              <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                                {doc.sizeLabel} • {formatDate(doc.uploadedAt)} • {doc.uploadedBy}
                              </p>
                            </div>
                            <FileText size={16} style={{ color: theme.colors.textSecondary }} />
                          </div>
                        ))}
                      </div>
                    )
                  ) : timelineItems.length === 0 ? (
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      No activity available for this request.
                    </p>
                  ) : (
                    <Timeline items={timelineItems} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Prior Authorization"
        size="xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Input label="Request Number" name="request_number" required value={createForm.request_number} onChange={handleCreateInput('request_number')} />
            <Input label="Patient ID" name="patient_id" required value={createForm.patient_id} onChange={handleCreateInput('patient_id')} />
            <Input label="Payor ID" name="payor_id" required value={createForm.payor_id} onChange={handleCreateInput('payor_id')} />
            <Input label="Service Code" name="service_code" required value={createForm.service_code} onChange={handleCreateInput('service_code')} />
            <Input label="Diagnosis Code" name="diagnosis_code" required value={createForm.diagnosis_code} onChange={handleCreateInput('diagnosis_code')} />
            <Input label="Subscriber ID" name="subscriber_id" required value={createForm.subscriber_id} onChange={handleCreateInput('subscriber_id')} />
            <Input label="Requested Service Date" name="requested_service_date" type="date" required value={createForm.requested_service_date} onChange={handleCreateInput('requested_service_date')} />
            <Input label="Submitted Date" name="submitted_date" type="date" required value={createForm.submitted_date} onChange={handleCreateInput('submitted_date')} />
            <Select label="Status" name="status" required value={createForm.status} options={statusOptions} onChange={handleCreateInput('status')} />
            <Input label="Provider Name" name="provider_name" required value={createForm.provider_name} onChange={handleCreateInput('provider_name')} />
            <Input label="Provider NPI" name="provider_npi" required value={createForm.provider_npi} onChange={handleCreateInput('provider_npi')} />
          </div>

          <Input
            label="Service Description"
            name="service_description"
            required
            value={createForm.service_description}
            onChange={handleCreateInput('service_description')}
          />
          <Input
            label="Diagnosis Description"
            name="diagnosis_description"
            required
            value={createForm.diagnosis_description}
            onChange={handleCreateInput('diagnosis_description')}
          />
          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
              Provider Address <span style={{ color: theme.colors.formRequiredColor }}>*</span>
            </label>
            <textarea
              name="provider_address"
              required
              rows={3}
              value={createForm.provider_address}
              onChange={handleCreateInput('provider_address')}
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </Modal>

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
            <label className="mb-2 block text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
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
            <Button type="button" variant="secondary" onClick={() => setIsStatusOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isUpdatingStatus}>
              {isUpdatingStatus ? 'Updating...' : 'Save Status'}
            </Button>
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

