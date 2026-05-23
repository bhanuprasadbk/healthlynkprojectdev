import { ChangeEvent } from 'react'
import type { PayorCappedRentalsForm } from '../../../data/payorData'
import {
  capResetsOnOptions,
  cappedRentalEquipmentCategories,
  rentalCapPeriodOptions,
} from '../../../data/payorData'
import { fieldClass, labelClass } from '../payorConfigTypes'
import { emptyCappedRentals } from '../payorConfigUtils'

type PayorCappedRentalsTabProps = {
  form?: PayorCappedRentalsForm
  onChange: (form: PayorCappedRentalsForm) => void
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pb-3 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
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

const PayorCappedRentalsTab = ({
  form: formProp,
  onChange,
}: PayorCappedRentalsTabProps) => {
  const form = formProp ?? emptyCappedRentals()
  const equipmentCategories = form.equipmentCategories ?? []
  const setField = <K extends keyof PayorCappedRentalsForm>(
    field: K,
    value: PayorCappedRentalsForm[K]
  ) => {
    onChange({ ...form, [field]: value })
  }

  const toggleCategory = (category: string) => {
    const selected = equipmentCategories.includes(category)
    setField(
      'equipmentCategories',
      selected
        ? equipmentCategories.filter((item) => item !== category)
        : [...equipmentCategories, category]
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="rentalCapPeriod" className={labelClass}>
              Rental cap period
            </label>
            <select
              id="rentalCapPeriod"
              value={form.rentalCapPeriod}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setField('rentalCapPeriod', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select period</option>
              {rentalCapPeriodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="capResetsOn" className={labelClass}>
              Cap resets on
            </label>
            <select
              id="capResetsOn"
              value={form.capResetsOn}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setField('capResetsOn', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select reset rule</option>
              {capResetsOnOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="months1To3Rate" className={labelClass}>
              Months 1–3 rate (%)
            </label>
            <input
              id="months1To3Rate"
              type="number"
              min={0}
              max={100}
              value={form.months1To3Rate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField('months1To3Rate', e.target.value)
              }
              className={fieldClass}
              placeholder="100"
            />
          </div>
          <div>
            <label htmlFor="months4To13Rate" className={labelClass}>
              Months 4–13 rate (%)
            </label>
            <input
              id="months4To13Rate"
              type="number"
              min={0}
              max={100}
              value={form.months4To13Rate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField('months4To13Rate', e.target.value)
              }
              className={fieldClass}
              placeholder="75"
            />
          </div>
          <div>
            <label htmlFor="postCapMsRate" className={labelClass}>
              Post-cap M&amp;S rate (%)
            </label>
            <input
              id="postCapMsRate"
              type="number"
              min={0}
              max={100}
              value={form.postCapMsRate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField('postCapMsRate', e.target.value)
              }
              className={fieldClass}
              placeholder="50"
            />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="Equipment categories subject to capped rental" />
        <div className="flex flex-wrap gap-2 mt-4">
          {cappedRentalEquipmentCategories.map((category) => {
            const selected = equipmentCategories.includes(category)
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                  selected
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Billing alerts &amp; automation" />
        <div className="mt-4">
          <ToggleRow
            title="Notify provider at month 10"
            description="Send automatic alert when rental approaches cap"
            checked={form.notifyProviderAtMonth10}
            onChange={(checked) => setField('notifyProviderAtMonth10', checked)}
          />
          <ToggleRow
            title="Auto-convert to purchase at cap"
            description="Generate purchase order when rental period ends"
            checked={form.autoConvertToPurchaseAtCap}
            onChange={(checked) => setField('autoConvertToPurchaseAtCap', checked)}
          />
          <ToggleRow
            title="Maintenance & servicing allowed post-cap"
            description="Continue billing for M&S after rental cap is reached"
            checked={form.maintenanceServicingPostCap}
            onChange={(checked) => setField('maintenanceServicingPostCap', checked)}
          />
          <ToggleRow
            title="Pause billing during hospital stay"
            description="Automatically stop rental billing for inpatient admissions"
            checked={form.pauseBillingDuringHospitalStay}
            onChange={(checked) => setField('pauseBillingDuringHospitalStay', checked)}
          />
        </div>
      </section>
    </div>
  )
}

export default PayorCappedRentalsTab
