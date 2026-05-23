import { ChangeEvent } from 'react'
import type {
  PayorOwnershipTransferForm,
  TransferWorkflowStepType,
} from '../../../data/payorData'
import {
  documentationRequiredOptions,
  ownershipTransferModifierOptions,
  ownershipTransferWorkflowSteps,
  transferTriggerOptions,
} from '../../../data/payorData'
import { fieldClass, labelClass } from '../payorConfigTypes'
import { emptyOwnershipTransfer } from '../payorConfigUtils'

type PayorOwnershipTransferTabProps = {
  form?: PayorOwnershipTransferForm
  onChange: (form: PayorOwnershipTransferForm) => void
}

const stepTypeStyles: Record<
  TransferWorkflowStepType,
  { label: string; className: string }
> = {
  automated: {
    label: 'Automated',
    className: 'bg-green-100 text-green-700',
  },
  manual: {
    label: 'Manual',
    className: 'bg-blue-100 text-blue-700',
  },
  conditional: {
    label: 'Conditional',
    className: 'bg-amber-100 text-amber-700',
  },
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  )
}

function ToggleRow({
  title,
  checked,
  onChange,
}: {
  title: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <label className="inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
          aria-label={title}
        />
        <span
          className={`relative h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 ${
            checked ? 'bg-green-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </span>
      </label>
    </div>
  )
}

const PayorOwnershipTransferTab = ({
  form: formProp,
  onChange,
}: PayorOwnershipTransferTabProps) => {
  const form = formProp ?? emptyOwnershipTransfer()

  const setField = <K extends keyof PayorOwnershipTransferForm>(
    field: K,
    value: PayorOwnershipTransferForm[K]
  ) => {
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="transferTrigger" className={labelClass}>
              Transfer trigger
            </label>
            <select
              id="transferTrigger"
              value={form.transferTrigger}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setField('transferTrigger', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select trigger</option>
              {transferTriggerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ownershipTransferModifier" className={labelClass}>
              Ownership transfer modifier
            </label>
            <select
              id="ownershipTransferModifier"
              value={form.ownershipTransferModifier}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setField('ownershipTransferModifier', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select modifier</option>
              {ownershipTransferModifierOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lumpSumPurchaseAmount" className={labelClass}>
              Lump-sum purchase amount
            </label>
            <input
              id="lumpSumPurchaseAmount"
              value={form.lumpSumPurchaseAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField('lumpSumPurchaseAmount', e.target.value)
              }
              className={fieldClass}
              placeholder="Leave blank to use fee schedule"
            />
          </div>
          <div>
            <label htmlFor="documentationRequired" className={labelClass}>
              Documentation required
            </label>
            <select
              id="documentationRequired"
              value={form.documentationRequired}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setField('documentationRequired', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select documentation</option>
              {documentationRequiredOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="Transfer workflow" />
        <ol className="mt-4 divide-y divide-gray-100">
          {ownershipTransferWorkflowSteps.map((step) => {
            const badge = stepTypeStyles[step.stepType]
            return (
              <li
                key={step.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                    {step.stepNumber}
                  </span>
                  <p className="text-sm text-gray-900 pt-0.5">{step.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section>
        <ToggleRow
          title="Require payor pre-approval for transfer"
          checked={form.requirePayorPreApproval}
          onChange={(checked) => setField('requirePayorPreApproval', checked)}
        />
        <ToggleRow
          title="Allow patient buyout before cap"
          checked={form.allowPatientBuyoutBeforeCap}
          onChange={(checked) => setField('allowPatientBuyoutBeforeCap', checked)}
        />
        <ToggleRow
          title="Send patient ownership letter automatically"
          checked={form.sendPatientOwnershipLetter}
          onChange={(checked) => setField('sendPatientOwnershipLetter', checked)}
        />
      </section>
    </div>
  )
}

export default PayorOwnershipTransferTab
