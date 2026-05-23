import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from '../forms/Button'
import type { Payor } from '../../data/payorData'
import {
  PAYOR_CONFIG_TABS,
  type PayorConfigDraft,
  type PayorConfigTabId,
  type PayorOverviewErrors,
} from './payorConfigTypes'
import {
  createDraftFromPayor,
  draftToPayor,
  emptyCappedRentals,
  validateOverview,
} from './payorConfigUtils'
import PayorOverviewTab from './tabs/PayorOverviewTab'
import PayorPlansPoliciesTab from './tabs/PayorPlansPoliciesTab'
import PayorFeeSchedulesTab from './tabs/PayorFeeSchedulesTab'
import PayorCappedRentalsTab from './tabs/PayorCappedRentalsTab'
import PayorOwnershipTransferTab from './tabs/PayorOwnershipTransferTab'
import PayorPriorAuthTab from './tabs/PayorPriorAuthTab'

type PayorConfigurationDrawerProps = {
  open: boolean
  mode: 'create' | 'edit'
  payor: Payor | null
  onClose: () => void
  onSave: (payor: Payor) => void
}

const PayorConfigurationDrawer = ({
  open,
  mode,
  payor,
  onClose,
  onSave,
}: PayorConfigurationDrawerProps) => {
  const [activeTab, setActiveTab] = useState<PayorConfigTabId>('overview')
  const [draft, setDraft] = useState<PayorConfigDraft>(() => createDraftFromPayor(payor))
  const [overviewErrors, setOverviewErrors] = useState<PayorOverviewErrors>({})

  useEffect(() => {
    if (open) {
      setDraft(createDraftFromPayor(payor))
      setActiveTab('overview')
      setOverviewErrors({})
    }
  }, [open, payor])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const close = () => {
    setActiveTab('overview')
    setOverviewErrors({})
    onClose()
  }

  const handleSave = () => {
    const errors = validateOverview(draft.overview)
    if (Object.keys(errors).length > 0) {
      setOverviewErrors(errors)
      setActiveTab('overview')
      return
    }
    onSave(draftToPayor(draft, payor))
    close()
  }

  const updateOverview = (
    field: keyof PayorConfigDraft['overview'],
    value: string | boolean
  ) => {
    setDraft((prev) => {
      const nextOverview = { ...prev.overview, [field]: value }
      if (field === 'activePayor') {
        nextOverview.status = value ? 'active' : 'inactive'
      }
      return { ...prev, overview: nextOverview }
    })
    if (overviewErrors[field as keyof PayorOverviewErrors]) {
      setOverviewErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const title = mode === 'edit' ? 'Edit payor' : 'Add payor'
  const subtitle =
    mode === 'edit' && payor
      ? payor.payorName
      : 'Configure payor details, plans, and billing rules'

  if (!open) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 top-0 bg-slate-900/35 z-[200] transition-opacity opacity-100 pointer-events-auto"
        onClick={close}
        aria-hidden={false}
      />
      <div
        className="fixed top-0 right-0 bottom-0 w-full sm:w-3/4 bg-white border-l border-gray-200 z-[201] flex flex-col shadow-[-8px_0_32px_rgba(15,23,42,0.1)] transition-transform duration-300 translate-x-0"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-gray-200 bg-white shrink-0 overflow-x-auto">
          <div className="flex min-w-max px-6 sm:px-8">
            {PAYOR_CONFIG_TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 bg-gray-50/40">
          {activeTab === 'overview' && (
            <PayorOverviewTab
              overview={draft.overview}
              errors={overviewErrors}
              onChange={updateOverview}
            />
          )}
          {activeTab === 'plans' && (
            <PayorPlansPoliciesTab
              plans={draft.plans}
              policyRules={draft.policyRules}
              onPlansChange={(plans) => setDraft((prev) => ({ ...prev, plans }))}
              onPolicyRulesChange={(policyRules) =>
                setDraft((prev) => ({ ...prev, policyRules }))
              }
            />
          )}
          {activeTab === 'fee-schedules' && (
            <PayorFeeSchedulesTab
              rows={draft.feeSchedules}
              onChange={(feeSchedules) => setDraft((prev) => ({ ...prev, feeSchedules }))}
            />
          )}
          {activeTab === 'capped-rentals' && (
            <PayorCappedRentalsTab
              form={draft.cappedRentals ?? emptyCappedRentals()}
              onChange={(cappedRentals) => setDraft((prev) => ({ ...prev, cappedRentals }))}
            />
          )}
          {activeTab === 'ownership-transfer' && (
            <PayorOwnershipTransferTab
              form={draft.ownershipTransfer}
              onChange={(ownershipTransfer) =>
                setDraft((prev) => ({ ...prev, ownershipTransfer }))
              }
            />
          )}
          {activeTab === 'prior-auth' && (
            <PayorPriorAuthTab
              form={draft.priorAuth}
              onChange={(priorAuth) => setDraft((prev) => ({ ...prev, priorAuth }))}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 border-t border-gray-200 bg-white shrink-0">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave}>
            {mode === 'edit' ? 'Save changes' : 'Create payor'}
          </Button>
        </div>
      </div>
    </>,
    document.body
  )
}

export default PayorConfigurationDrawer
