import { ChangeEvent } from 'react'
import {
  billingStateOptions,
  contractTypes,
  submissionMethodOptions,
} from '../../../data/payorData'
import type { PayorOverviewErrors, PayorOverviewForm } from '../payorConfigTypes'
import { fieldClass, labelClass } from '../payorConfigTypes'

type PayorOverviewTabProps = {
  overview: PayorOverviewForm
  errors: PayorOverviewErrors
  onChange: (field: keyof PayorOverviewForm, value: string | boolean) => void
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-sm font-semibold text-gray-900 pb-3 border-b border-gray-200">
      {children}
    </h3>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  error,
}: {
  label: string
  name: keyof PayorOverviewForm
  value: string
  onChange: PayorOverviewTabProps['onChange']
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value)}
        className={`${fieldClass}${error ? ' border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
}: {
  label: string
  name: keyof PayorOverviewForm
  value: string
  onChange: PayorOverviewTabProps['onChange']
  options: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(name, e.target.value)}
        className={`${fieldClass}${error ? ' border-red-300' : ''}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
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

const PayorOverviewTab = ({ overview, errors, onChange }: PayorOverviewTabProps) => {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Payor information</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Field
            label="Payor name"
            name="payorName"
            value={overview.payorName}
            onChange={onChange}
            placeholder="Enter payor name"
            required
            error={errors.payorName}
          />
          <Field
            label="Payor ID"
            name="payorId"
            value={overview.payorId}
            onChange={onChange}
            placeholder="e.g. BCBSTX-001"
            required
            error={errors.payorId}
          />
          <Field
            label="NPI / Tax ID"
            name="npiTaxId"
            value={overview.npiTaxId}
            onChange={onChange}
            placeholder="e.g. 1234567890"
          />
          <SelectField
            label="Contract type"
            name="contractType"
            value={overview.contractType}
            onChange={onChange}
            options={contractTypes}
            placeholder="Select contract type"
            required
            error={errors.contractType}
          />
          <Field
            label="Effective date"
            name="effectiveDate"
            type="date"
            value={overview.effectiveDate}
            onChange={onChange}
            required
            error={errors.effectiveDate}
          />
          <Field
            label="Termination date"
            name="terminationDate"
            type="date"
            value={overview.terminationDate}
            onChange={onChange}
          />
          <Field
            label="Contact name"
            name="contactName"
            value={overview.contactName}
            onChange={onChange}
            placeholder="Provider relations contact"
          />
          <Field
            label="Contact phone"
            name="contactPhone"
            value={overview.contactPhone}
            onChange={onChange}
            placeholder="(555) 000-0000"
          />
          <div className="md:col-span-2">
            <Field
              label="Claims mailing address"
              name="claimsMailingAddress"
              value={overview.claimsMailingAddress}
              onChange={onChange}
              placeholder="P.O. Box or street address"
            />
          </div>
          <SelectField
            label="Billing state"
            name="billingState"
            value={overview.billingState}
            onChange={onChange}
            options={billingStateOptions}
            placeholder="Select state"
          />
          <SelectField
            label="Submission method"
            name="submissionMethod"
            value={overview.submissionMethod}
            onChange={onChange}
            options={submissionMethodOptions}
            placeholder="Select method"
          />
          <Field
            label="Provider portal URL"
            name="providerPortalUrl"
            value={overview.providerPortalUrl}
            onChange={onChange}
            placeholder="https://"
          />
          <Field
            label="EDI submitter ID"
            name="ediSubmitterId"
            value={overview.ediSubmitterId}
            onChange={onChange}
            placeholder="e.g. TX1234567"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Configuration</SectionTitle>
        <div className="mt-4">
          <ToggleRow
            title="Active payor"
            description="Allow claims to be submitted for this payor"
            checked={overview.activePayor}
            onChange={(checked) => onChange('activePayor', checked)}
          />
          <ToggleRow
            title="Electronic remittance (ERA)"
            description="Accept 835 ERA files from this payor"
            checked={overview.electronicRemittance}
            onChange={(checked) => onChange('electronicRemittance', checked)}
          />
          <ToggleRow
            title="Real-time eligibility (270/271)"
            description="Run eligibility checks automatically at intake"
            checked={overview.realTimeEligibility}
            onChange={(checked) => onChange('realTimeEligibility', checked)}
          />
          <ToggleRow
            title="Auto-post ERA payments"
            description="Automatically apply ERA remittance to open claims"
            checked={overview.autoPostEraPayments}
            onChange={(checked) => onChange('autoPostEraPayments', checked)}
          />
        </div>
      </section>

      <section>
        <SectionTitle>Contract notes</SectionTitle>
        <div className="mt-4">
          <label htmlFor="contractNotes" className={labelClass}>
            Internal notes
          </label>
          <textarea
            id="contractNotes"
            name="contractNotes"
            value={overview.contractNotes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              onChange('contractNotes', e.target.value)
            }
            rows={5}
            placeholder="Add notes about this payor contract, special billing rules, or history..."
            className={`${fieldClass} resize-y min-h-[120px]`}
          />
        </div>
      </section>
    </div>
  )
}

export default PayorOverviewTab
