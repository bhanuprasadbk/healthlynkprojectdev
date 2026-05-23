import { ChangeEvent, useState } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import type { PayorPriorAuthForm } from '../../../data/payorData'
import {
  paSubmissionMethodOptions,
  standardTurnaroundTimeOptions,
} from '../../../data/payorData'
import { fieldClass, labelClass } from '../payorConfigTypes'
import { emptyPriorAuth } from '../payorConfigUtils'

type PayorPriorAuthTabProps = {
  form?: PayorPriorAuthForm
  onChange: (form: PayorPriorAuthForm) => void
}

const PayorPriorAuthTab = ({ form: formProp, onChange }: PayorPriorAuthTabProps) => {
  const form = formProp ?? emptyPriorAuth()
  const [checklistOpen, setChecklistOpen] = useState(true)

  const setField = <K extends keyof PayorPriorAuthForm>(
    field: K,
    value: PayorPriorAuthForm[K]
  ) => {
    onChange({ ...form, [field]: value })
  }

  const toggleChecklistItem = (id: string, checked: boolean) => {
    setField(
      'clinicalDocChecklist',
      form.clinicalDocChecklist.map((item) =>
        item.id === id ? { ...item, checked } : item
      )
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="paSubmissionMethod" className={labelClass}>
              PA submission method
            </label>
            <select
              id="paSubmissionMethod"
              value={form.paSubmissionMethod}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setField('paSubmissionMethod', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select method</option>
              {paSubmissionMethodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="standardTurnaroundTime" className={labelClass}>
              Standard turnaround time
            </label>
            <select
              id="standardTurnaroundTime"
              value={form.standardTurnaroundTime}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setField('standardTurnaroundTime', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select turnaround</option>
              {standardTurnaroundTimeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paPortalUrl" className={labelClass}>
              PA portal URL
            </label>
            <input
              id="paPortalUrl"
              type="url"
              value={form.paPortalUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField('paPortalUrl', e.target.value)
              }
              className={fieldClass}
              placeholder="https://provider.bcbstx.com/auth"
            />
          </div>
          <div>
            <label htmlFor="paFaxNumber" className={labelClass}>
              PA fax number
            </label>
            <input
              id="paFaxNumber"
              type="tel"
              value={form.paFaxNumber}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField('paFaxNumber', e.target.value)
              }
              className={fieldClass}
              placeholder="(800) 000-0000"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setChecklistOpen((open) => !open)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={checklistOpen}
          >
            <FileText size={16} className="shrink-0 text-primary-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Clinical documentation checklist
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Required docs before PA submission
              </p>
            </div>
            <ChevronDown
              size={18}
              className={`shrink-0 text-gray-400 transition-transform ${
                checklistOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {checklistOpen && (
            <div className="border-t border-gray-200 px-4 py-4 space-y-3">
              {form.clinicalDocChecklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:border-gray-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => toggleChecklistItem(item.id, e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{item.title}</span>
                    <span className="block text-sm text-gray-500 mt-0.5">{item.description}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default PayorPriorAuthTab
