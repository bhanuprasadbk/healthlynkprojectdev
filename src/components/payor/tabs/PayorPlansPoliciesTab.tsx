import { ChangeEvent, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Plan } from '../../../data/payorData'
import {
  assignmentOfBenefitsOptions,
  claimFrequencyTypeOptions,
  coordinationOfBenefitsOptions,
  correctedClaimDeadlineOptions,
  planNetworkOptions,
  planStatusOptions,
  planTypes,
  renderingProviderRequiredOptions,
  timelyFilingLimitOptions,
} from '../../../data/payorData'
import type { PayorPolicyRulesForm } from '../payorConfigTypes'
import { fieldClass, labelClass } from '../payorConfigTypes'
import { newDraftPlan } from '../payorConfigUtils'

type PayorPlansPoliciesTabProps = {
  plans: Plan[]
  policyRules: PayorPolicyRulesForm
  onPlansChange: (plans: Plan[]) => void
  onPolicyRulesChange: (policyRules: PayorPolicyRulesForm) => void
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pb-3 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function planTypeBadgeClass(planType: string): string {
  if (planType === 'PPO') return 'bg-blue-100 text-blue-800'
  if (planType === 'HMO') return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-700'
}

function planStatusBadgeClass(status: string): string {
  if (status === 'active') return 'bg-green-100 text-green-800'
  if (status === 'pending' || status === 'draft') return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-600'
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

const cellInputClass = `${fieldClass} py-1.5 text-sm`

const PayorPlansPoliciesTab = ({
  plans,
  policyRules,
  onPlansChange,
  onPolicyRulesChange,
}: PayorPlansPoliciesTabProps) => {
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set())

  const isEditing = (plan: Plan) => plan.status === 'draft' || editingIds.has(plan.id)

  const updatePlan = (id: string, field: keyof Plan, value: string) => {
    onPlansChange(plans.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan)))
  }

  const addPlan = () => {
    onPlansChange([...plans, newDraftPlan()])
  }

  const removePlan = (id: string) => {
    onPlansChange(plans.filter((plan) => plan.id !== id))
    setEditingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const startEdit = (id: string) => {
    setEditingIds((prev) => new Set(prev).add(id))
  }

  const commitPlan = (plan: Plan) => {
    if (plan.status === 'draft' && plan.planName.trim()) {
      onPlansChange(
        plans.map((p) =>
          p.id === plan.id ? { ...p, status: 'active' as const } : p
        )
      )
    }
    setEditingIds((prev) => {
      const next = new Set(prev)
      next.delete(plan.id)
      return next
    })
  }

  const setPolicyField = <K extends keyof PayorPolicyRulesForm>(
    field: K,
    value: PayorPolicyRulesForm[K]
  ) => {
    onPolicyRulesChange({ ...policyRules, [field]: value })
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-start justify-between gap-4">
          <SectionTitle
            title="Plans"
            subtitle="Linked insurance plans under this payor."
          />
          <button
            type="button"
            onClick={addPlan}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus size={14} />
            Add plan
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {plans.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No plans linked yet. Click &quot;Add plan&quot; to create one.
            </p>
          ) : (
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Plan name
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Plan ID
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Plan type
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Group #
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Network
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-20">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => {
                  const editing = isEditing(plan)
                  return (
                    <tr key={plan.id} className="align-middle">
                      <td className="px-3 py-2">
                        {editing ? (
                          <input
                            value={plan.planName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              updatePlan(plan.id, 'planName', e.target.value)
                            }
                            className={cellInputClass}
                            placeholder="Plan name"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{plan.planName}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input
                            value={plan.planId ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              updatePlan(plan.id, 'planId', e.target.value)
                            }
                            className={cellInputClass}
                            placeholder="Plan ID"
                          />
                        ) : (
                          <span className="text-sm text-gray-700">{plan.planId || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <select
                            value={plan.planType}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                              updatePlan(plan.id, 'planType', e.target.value)
                            }
                            className={cellInputClass}
                          >
                            <option value="">Plan type</option>
                            {planTypes.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${planTypeBadgeClass(
                              plan.planType
                            )}`}
                          >
                            {plan.planType}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input
                            value={plan.groupNumber ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              updatePlan(plan.id, 'groupNumber', e.target.value)
                            }
                            className={cellInputClass}
                            placeholder="Group #"
                          />
                        ) : (
                          <span className="text-sm text-gray-700">{plan.groupNumber || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <select
                            value={plan.network ?? ''}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                              updatePlan(plan.id, 'network', e.target.value)
                            }
                            className={cellInputClass}
                          >
                            <option value="">Network</option>
                            {planNetworkOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-700">{plan.network || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <select
                            value={plan.status}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                              updatePlan(plan.id, 'status', e.target.value)
                            }
                            className={cellInputClass}
                          >
                            {planStatusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${planStatusBadgeClass(
                              plan.status
                            )}`}
                          >
                            {plan.status}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => commitPlan(plan)}
                                className="text-green-600 hover:text-green-800 p-1"
                                title="Save plan"
                                aria-label="Save plan"
                              >
                                <Check size={16} />
                              </button>
                              {plan.status === 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => removePlan(plan.id)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="Delete plan"
                                  aria-label="Delete plan"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(plan.id)}
                              className="text-primary-600 hover:text-primary-900 p-1"
                              title="Edit plan"
                              aria-label="Edit plan"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Policy rules"
          subtitle="Filing limits, COB, and billing behavior."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="timelyFilingLimit" className={labelClass}>
              Timely filing limit
            </label>
            <select
              id="timelyFilingLimit"
              value={policyRules.timelyFilingLimit}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setPolicyField('timelyFilingLimit', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select limit</option>
              {timelyFilingLimitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="correctedClaimDeadline" className={labelClass}>
              Corrected claim deadline
            </label>
            <select
              id="correctedClaimDeadline"
              value={policyRules.correctedClaimDeadline}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setPolicyField('correctedClaimDeadline', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select deadline</option>
              {correctedClaimDeadlineOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="coordinationOfBenefits" className={labelClass}>
              Coordination of benefits
            </label>
            <select
              id="coordinationOfBenefits"
              value={policyRules.coordinationOfBenefits}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setPolicyField('coordinationOfBenefits', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select COB</option>
              {coordinationOfBenefitsOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assignmentOfBenefits" className={labelClass}>
              Assignment of benefits
            </label>
            <select
              id="assignmentOfBenefits"
              value={policyRules.assignmentOfBenefits}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setPolicyField('assignmentOfBenefits', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select assignment</option>
              {assignmentOfBenefitsOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="claimFrequencyType" className={labelClass}>
              Claim frequency type
            </label>
            <select
              id="claimFrequencyType"
              value={policyRules.claimFrequencyType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setPolicyField('claimFrequencyType', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select frequency type</option>
              {claimFrequencyTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="renderingProviderRequired" className={labelClass}>
              Rendering provider required
            </label>
            <select
              id="renderingProviderRequired"
              value={policyRules.renderingProviderRequired}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setPolicyField('renderingProviderRequired', e.target.value)
              }
              className={fieldClass}
            >
              <option value="">Select requirement</option>
              {renderingProviderRequiredOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <ToggleRow
            title="Require member ID on all claims"
            description="Reject claims missing a valid member identifier"
            checked={policyRules.requireMemberId}
            onChange={(checked) => setPolicyField('requireMemberId', checked)}
          />
          <ToggleRow
            title="Accept crossover claims"
            description="Process secondary claims from other payors"
            checked={policyRules.acceptCrossoverClaims}
            onChange={(checked) => setPolicyField('acceptCrossoverClaims', checked)}
          />
          <ToggleRow
            title="Allow bundled billing"
            description="Submit multiple HCPCS codes on a single claim line"
            checked={policyRules.allowBundledBilling}
            onChange={(checked) => setPolicyField('allowBundledBilling', checked)}
          />
          <ToggleRow
            title="Send claim status inquiry (276/277)"
            description="Automatically poll for claim adjudication status"
            checked={policyRules.sendClaimStatusInquiry}
            onChange={(checked) => setPolicyField('sendClaimStatusInquiry', checked)}
          />
        </div>
      </section>
    </div>
  )
}

export default PayorPlansPoliciesTab
