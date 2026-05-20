import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, Bot } from 'lucide-react'
import Modal from '../components/Modal'
import Input from '../components/forms/Input'
import Select from '../components/forms/Select'
import Button from '../components/forms/Button'
import {
  Payor,
  Plan,
  initialPayors,
  planTypes,
  autoCheckFrequencies,
  statusOptions,
} from '../data/payorData'
import {
  type Agent,
  initialAgents,
  loadAgentsFromStorage,
  mergeInitialAgentsIntoStored,
  saveAgentsToStorage,
} from '../data/agentData'
import {
  createPayor,
  createPlan,
  deletePayor,
  deletePlan,
  fetchPayors,
  type ApiPayor,
  type ApiPayorPlan,
  updatePayor,
  updatePlan,
} from '../services/payorConfigurationService'
import { useToast } from '../contexts/ToastContext'

interface PayorFormData {
  payorName: string
  status: string
}

interface PlanFormData {
  planName: string
  planType: string
  autoCheckFrequency: string
  status: string
}

interface PayorFormErrors {
  payorName?: string
  status?: string
}

interface PlanFormErrors {
  planName?: string
  planType?: string
  autoCheckFrequency?: string
  status?: string
}

function agentsForPlan(agents: Agent[], payorId: string, planId: string): Agent[] {
  return agents.filter((a) => a.payorId === payorId && a.planId === planId)
}

const PayorConfiguration = () => {
  const { showToast } = useToast()
  const [payors, setPayors] = useState<Payor[]>(initialPayors)
  const [agents, setAgents] = useState<Agent[]>(() => {
    if (typeof window === 'undefined') return initialAgents
    const stored = loadAgentsFromStorage()
    if (!stored) return initialAgents
    return mergeInitialAgentsIntoStored(stored)
  })
  const [expandedPayors, setExpandedPayors] = useState<Set<string>>(new Set())
  const [isPayorModalOpen, setIsPayorModalOpen] = useState<boolean>(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false)
  const [editingPayor, setEditingPayor] = useState<Payor | null>(null)
  const [editingPlan, setEditingPlan] = useState<{ plan: Plan; payorId: string } | null>(null)
  const [selectedPayorId, setSelectedPayorId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [deletePayorConfirm, setDeletePayorConfirm] = useState<string | null>(null)
  const [deletePlanConfirm, setDeletePlanConfirm] = useState<{ planId: string; payorId: string } | null>(null)
  const [agentAssignContext, setAgentAssignContext] = useState<{
    payorId: string
    planId: string
    payorName: string
    planName: string
  } | null>(null)

  const [payorFormData, setPayorFormData] = useState<PayorFormData>({
    payorName: '',
    status: 'active',
  })

  const [planFormData, setPlanFormData] = useState<PlanFormData>({
    planName: '',
    planType: '',
    autoCheckFrequency: '',
    status: 'active',
  })

  const [payorErrors, setPayorErrors] = useState<PayorFormErrors>({})
  const [planErrors, setPlanErrors] = useState<PlanFormErrors>({})
  const [isLoadingPayors, setIsLoadingPayors] = useState(false)
  const [isSubmittingPayor, setIsSubmittingPayor] = useState(false)
  const [isDeletingPayor, setIsDeletingPayor] = useState(false)
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false)
  const [isDeletingPlan, setIsDeletingPlan] = useState(false)

  useEffect(() => {
    saveAgentsToStorage(agents)
  }, [agents])

  useEffect(() => {
    const normalizePlan = (plan: ApiPayorPlan, payorId: string, index: number): Plan => {
      return {
        id: plan.id || `${payorId}-plan-${index + 1}`,
        planName: plan.plan_name || plan.planName || `Plan ${index + 1}`,
        planType: plan.plan_type || plan.planType || 'PPO',
        autoCheckFrequency: plan.auto_check_frequency || plan.autoCheckFrequency || 'monthly',
        status: plan.status === 'inactive' ? 'inactive' : 'active',
        createdAt: plan.created_at || plan.createdAt || new Date().toISOString().slice(0, 10),
      }
    }

    const normalizePayor = (payor: ApiPayor, index: number): Payor => {
      const payorId = payor.id || `payor-${index + 1}`
      return {
        id: payorId,
        payorName: payor.name || payor.payor_name || payor.payorName || `Payor ${index + 1}`,
        status: payor.status === 'inactive' ? 'inactive' : 'active',
        createdAt: payor.created_at || payor.createdAt || new Date().toISOString().slice(0, 10),
        plans: Array.isArray(payor.plans)
          ? payor.plans.map((plan, planIndex) => normalizePlan(plan, payorId, planIndex))
          : [],
      }
    }

    const loadPayors = async () => {
      setIsLoadingPayors(true)
      try {
        const response = await fetchPayors()
        const maybeArray = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.payors)
              ? response.data.payors
              : []
        if (maybeArray.length) {
          setPayors(maybeArray.map((payor, index) => normalizePayor(payor, index)))
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to load payors.', {
          type: 'error',
          duration: 5000,
        })
      } finally {
        setIsLoadingPayors(false)
      }
    }

    loadPayors()
  }, [showToast])

  // Filter payors based on search term
  const filteredPayors = payors.filter(
    (payor) =>
      payor.payorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payor.plans.some((plan) =>
        plan.planName.toLowerCase().includes(searchTerm.toLowerCase())
      )
  )

  const togglePayorExpansion = (payorId: string) => {
    setExpandedPayors((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(payorId)) {
        newSet.delete(payorId)
      } else {
        newSet.add(payorId)
      }
      return newSet
    })
  }

  // Payor form validation
  const validatePayorForm = (): boolean => {
    const newErrors: PayorFormErrors = {}

    if (!payorFormData.payorName.trim()) {
      newErrors.payorName = 'Payor name is required'
    }

    setPayorErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Plan form validation
  const validatePlanForm = (): boolean => {
    const newErrors: PlanFormErrors = {}

    if (!planFormData.planName.trim()) {
      newErrors.planName = 'Plan name is required'
    }

    if (!planFormData.planType) {
      newErrors.planType = 'Plan type is required'
    }

    if (!planFormData.autoCheckFrequency) {
      newErrors.autoCheckFrequency = 'Auto-check frequency is required'
    }

    setPlanErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePayorInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPayorFormData((prev) => ({ ...prev, [name]: value }))
    if (payorErrors[name as keyof PayorFormErrors]) {
      setPayorErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handlePlanInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPlanFormData((prev) => ({ ...prev, [name]: value }))
    if (planErrors[name as keyof PlanFormErrors]) {
      setPlanErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleOpenPayorModal = (payor: Payor | null = null) => {
    if (payor) {
      setEditingPayor(payor)
      setPayorFormData({
        payorName: payor.payorName,
        status: payor.status,
      })
    } else {
      setEditingPayor(null)
      setPayorFormData({
        payorName: '',
        status: 'active',
      })
    }
    setPayorErrors({})
    setIsPayorModalOpen(true)
  }

  const handleClosePayorModal = () => {
    setIsPayorModalOpen(false)
    setEditingPayor(null)
    setPayorFormData({
      payorName: '',
      status: 'active',
    })
    setPayorErrors({})
  }

  const handleOpenPlanModal = (payorId: string, plan: Plan | null = null) => {
    setSelectedPayorId(payorId)
    if (plan) {
      setEditingPlan({ plan, payorId })
      setPlanFormData({
        planName: plan.planName,
        planType: plan.planType,
        autoCheckFrequency: plan.autoCheckFrequency,
        status: plan.status,
      })
    } else {
      setEditingPlan(null)
      setPlanFormData({
        planName: '',
        planType: '',
        autoCheckFrequency: '',
        status: 'active',
      })
    }
    setPlanErrors({})
    setIsPlanModalOpen(true)
  }

  const handleClosePlanModal = () => {
    setIsPlanModalOpen(false)
    setEditingPlan(null)
    setSelectedPayorId(null)
    setPlanFormData({
      planName: '',
      planType: '',
      autoCheckFrequency: '',
      status: 'active',
    })
    setPlanErrors({})
  }

  const handlePayorSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validatePayorForm()) {
      return
    }

    if (editingPayor) {
      setIsSubmittingPayor(true)
      try {
        const payload = {
          name: payorFormData.payorName.trim(),
          status: payorFormData.status,
        }
        const response = await updatePayor(editingPayor.id, payload)
        const updated = response?.data
        setPayors((prev) =>
          prev.map((payor) =>
            payor.id === editingPayor.id
              ? {
                  ...payor,
                  payorName: updated?.name || payload.name,
                  status: updated?.status === 'inactive' ? 'inactive' : 'active',
                  createdAt:
                    updated?.created_at ||
                    updated?.createdAt ||
                    payor.createdAt,
                }
              : payor
          )
        )
        showToast(response?.message || 'Payor updated successfully.', { type: 'success' })
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to update payor.', {
          type: 'error',
          duration: 5000,
        })
        return
      } finally {
        setIsSubmittingPayor(false)
      }
    } else {
      setIsSubmittingPayor(true)
      try {
        const payload = {
          name: payorFormData.payorName.trim(),
          status: payorFormData.status,
        }
        const response = await createPayor(payload)

        const created = response?.data
        const newPayor: Payor = {
          id: created?.id || Date.now().toString(),
          payorName: created?.name || payload.name,
          status: created?.status === 'inactive' ? 'inactive' : 'active',
          plans: [],
          createdAt:
            created?.created_at ||
            created?.createdAt ||
            new Date().toISOString().split('T')[0],
        }
        setPayors((prev) => [...prev, newPayor])
        showToast(response?.message || 'Payor created successfully.', { type: 'success' })
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to create payor.', {
          type: 'error',
          duration: 5000,
        })
        return
      } finally {
        setIsSubmittingPayor(false)
      }
    }

    handleClosePayorModal()
  }

  const handlePlanSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validatePlanForm() || !selectedPayorId) {
      return
    }

    if (editingPlan) {
      setIsSubmittingPlan(true)
      try {
        const payload = {
          plan_name: planFormData.planName.trim(),
          plan_type: planFormData.planType.toLowerCase(),
          auto_check_frequency: planFormData.autoCheckFrequency,
          status: planFormData.status,
        }
        const response = await updatePlan(editingPlan.plan.id, payload)
        const updated = response?.data
        setPayors((prev) =>
          prev.map((payor) =>
            payor.id === selectedPayorId
              ? {
                  ...payor,
                  plans: payor.plans.map((plan) =>
                    plan.id === editingPlan.plan.id
                      ? {
                          ...plan,
                          planName: updated?.plan_name || planFormData.planName.trim(),
                          planType: updated?.plan_type || planFormData.planType,
                          autoCheckFrequency:
                            updated?.auto_check_frequency || planFormData.autoCheckFrequency,
                          status: updated?.status === 'inactive' ? 'inactive' : 'active',
                          createdAt:
                            updated?.created_at ||
                            updated?.createdAt ||
                            plan.createdAt,
                        }
                      : plan
                  ),
                }
              : payor
          )
        )
        showToast(response?.message || 'Plan updated successfully.', { type: 'success' })
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to update plan.', {
          type: 'error',
          duration: 5000,
        })
        return
      } finally {
        setIsSubmittingPlan(false)
      }
    } else {
      setIsSubmittingPlan(true)
      try {
        const payload = {
          plan_name: planFormData.planName.trim(),
          plan_type: planFormData.planType.toLowerCase(),
          auto_check_frequency: planFormData.autoCheckFrequency,
          status: planFormData.status,
        }
        const response = await createPlan(selectedPayorId, payload)
        const created = response?.data
        const newPlan: Plan = {
          id: created?.id || `${selectedPayorId}-${Date.now()}`,
          planName: created?.plan_name || planFormData.planName.trim(),
          planType: created?.plan_type || planFormData.planType,
          autoCheckFrequency:
            created?.auto_check_frequency || planFormData.autoCheckFrequency,
          status: created?.status === 'inactive' ? 'inactive' : 'active',
          createdAt:
            created?.created_at ||
            created?.createdAt ||
            new Date().toISOString().split('T')[0],
        }
        setPayors((prev) =>
          prev.map((payor) =>
            payor.id === selectedPayorId
              ? { ...payor, plans: [...payor.plans, newPlan] }
              : payor
          )
        )
        showToast(response?.message || 'Plan created successfully.', { type: 'success' })
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to create plan.', {
          type: 'error',
          duration: 5000,
        })
        return
      } finally {
        setIsSubmittingPlan(false)
      }
    }

    handleClosePlanModal()
  }

  const handleDeletePayor = async (payorId: string) => {
    setIsDeletingPayor(true)
    try {
      await deletePayor(payorId)

      setAgents((prev) =>
        prev.map((a) => (a.payorId === payorId ? { ...a, payorId: null, planId: null } : a))
      )
      setPayors((prev) => prev.filter((payor) => payor.id !== payorId))
      setDeletePayorConfirm(null)
      showToast('Payor deleted successfully.', { type: 'success' })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete payor.', {
        type: 'error',
        duration: 5000,
      })
    } finally {
      setIsDeletingPayor(false)
    }
  }

  const handleDeletePlan = async (payorId: string, planId: string) => {
    setIsDeletingPlan(true)
    try {
      await deletePlan(planId)

      setAgents((prev) =>
        prev.map((a) =>
          a.payorId === payorId && a.planId === planId ? { ...a, payorId: null, planId: null } : a
        )
      )
      setPayors((prev) =>
        prev.map((payor) =>
          payor.id === payorId
            ? {
                ...payor,
                plans: payor.plans.filter((plan) => plan.id !== planId),
              }
            : payor
        )
      )
      setDeletePlanConfirm(null)
      showToast('Plan deleted successfully.', { type: 'success' })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete plan.', {
        type: 'error',
        duration: 5000,
      })
    } finally {
      setIsDeletingPlan(false)
    }
  }

  const toggleAgentOnPlan = (agentId: string, attach: boolean, payorId: string, planId: string) => {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== agentId) return a
        if (attach) {
          return { ...a, payorId, planId, frequencyMode: 'plan_rule' as const }
        }
        if (a.payorId === payorId && a.planId === planId) {
          return { ...a, payorId: null, planId: null }
        }
        return a
      })
    )
  }

  const getStatusBadgeClass = (status: string): string => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  const totalPlans = payors.reduce((sum, payor) => sum + payor.plans.length, 0)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Payor Configuration
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage insurance payors and their plans. Assign AI agents to each plan—they share the same
            configuration as on the AI Agents page.
          </p>
        </div>
        <Button onClick={() => handleOpenPayorModal()} variant="primary" className="w-full sm:w-auto shrink-0 justify-center">
          <div className="flex items-center justify-center">
            <Plus size={18} className="mr-2" />
            Add Payor
          </div>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search payors or plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Payors List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoadingPayors && (
            <div className="px-4 sm:px-6 py-3 text-sm text-gray-500 border-b border-gray-200 bg-gray-50">
              Loading payors...
            </div>
          )}
          {filteredPayors.length === 0 ? (
            <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
              {searchTerm
                ? 'No payors found matching your search.'
                : 'No payors configured. Click "Add Payor" to get started.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPayors.map((payor) => {
                const isExpanded = expandedPayors.has(payor.id)
                return (
                  <div key={payor.id} className="hover:bg-gray-50 transition-colors">
                    {/* Payor Row */}
                    <div className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => togglePayorExpansion(payor.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown size={20} />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                              <h3 className="text-sm font-medium text-gray-900 break-words">
                                {payor.payorName}
                              </h3>
                              <span
                                className={`inline-flex w-fit px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadgeClass(
                                  payor.status
                                )}`}
                              >
                                {payor.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({payor.plans.length} {payor.plans.length === 1 ? 'plan' : 'plans'})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0 sm:justify-end">
                          <Button
                            onClick={() => handleOpenPlanModal(payor.id)}
                            variant="outline"
                            className="text-xs flex-1 sm:flex-initial min-w-[7rem] justify-center"
                          >
                            <div className="flex items-center">
                              <Plus size={14} className="mr-1" />
                              Add Plan
                            </div>
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleOpenPayorModal(payor)}
                            className="text-primary-600 hover:text-primary-900 transition-colors p-1.5"
                            title="Edit Payor"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletePayorConfirm(payor.id)}
                            className="text-red-600 hover:text-red-900 transition-colors p-1.5"
                            title="Delete Payor"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Plans List */}
                    {isExpanded && (
                      <div className="bg-gray-50 border-t border-gray-200">
                        {payor.plans.length === 0 ? (
                          <div className="px-4 sm:px-16 py-6 text-sm text-gray-500 text-center">
                            No plans configured. Click "Add Plan" to add a plan.
                          </div>
                        ) : (
                          <>
                            <div className="hidden md:block px-4 sm:px-6 py-4 overflow-x-auto">
                              <table className="w-full min-w-[800px]">
                                <thead>
                                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="pb-2">Plan Name</th>
                                    <th className="pb-2">Plan Type</th>
                                    <th className="pb-2">Auto-check Frequency</th>
                                    <th className="pb-2">Status</th>
                                    <th className="pb-2 min-w-[11rem]">
                                      <span className="inline-flex items-center gap-1 normal-case">
                                        <Bot size={14} className="shrink-0" aria-hidden />
                                        AI agents
                                      </span>
                                    </th>
                                    <th className="pb-2 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {payor.plans.map((plan) => {
                                    const attachedAgents = agentsForPlan(agents, payor.id, plan.id)
                                    return (
                                    <tr
                                      key={plan.id}
                                      className="hover:bg-white transition-colors"
                                    >
                                      <td className="py-3">
                                        <div className="text-sm text-gray-900">
                                          {plan.planName}
                                        </div>
                                      </td>
                                      <td className="py-3">
                                        <div className="text-sm text-gray-900">
                                          {plan.planType}
                                        </div>
                                      </td>
                                      <td className="py-3">
                                        <div className="text-sm text-gray-900 capitalize">
                                          {plan.autoCheckFrequency}
                                        </div>
                                      </td>
                                      <td className="py-3">
                                        <span
                                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadgeClass(
                                            plan.status
                                          )}`}
                                        >
                                          {plan.status}
                                        </span>
                                      </td>
                                      <td className="py-3 align-top">
                                        <div className="space-y-1.5">
                                          <div className="text-sm text-gray-900">
                                            {attachedAgents.length === 0 ? (
                                              <span className="text-gray-400">—</span>
                                            ) : (
                                              <ul className="space-y-0.5 list-none">
                                                {attachedAgents.map((ag) => (
                                                  <li key={ag.id} className="truncate max-w-[14rem]" title={ag.name}>
                                                    {ag.name}
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setAgentAssignContext({
                                                payorId: payor.id,
                                                planId: plan.id,
                                                payorName: payor.payorName,
                                                planName: plan.planName,
                                              })
                                            }
                                            className="text-xs font-medium text-primary-600 hover:text-primary-800"
                                          >
                                            Manage
                                          </button>
                                        </div>
                                      </td>
                                      <td className="py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleOpenPlanModal(payor.id, plan)
                                            }
                                            className="text-primary-600 hover:text-primary-900 transition-colors"
                                            title="Edit Plan"
                                          >
                                            <Pencil size={16} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setDeletePlanConfirm({
                                                payorId: payor.id,
                                                planId: plan.id,
                                              })
                                            }
                                            className="text-red-600 hover:text-red-900 transition-colors"
                                            title="Delete Plan"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="md:hidden px-4 pb-4 space-y-3">
                              {payor.plans.map((plan) => {
                                const attachedAgents = agentsForPlan(agents, payor.id, plan.id)
                                return (
                                <div
                                  key={plan.id}
                                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                >
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Plan name
                                      </p>
                                      <p className="text-gray-900 font-medium mt-0.5">
                                        {plan.planName}
                                      </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <p className="text-xs text-gray-500">Plan type</p>
                                        <p className="text-gray-900 mt-0.5">{plan.planType}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Auto-check</p>
                                        <p className="text-gray-900 mt-0.5 capitalize">
                                          {plan.autoCheckFrequency}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                        <Bot size={12} aria-hidden />
                                        AI agents
                                      </p>
                                      <p className="text-gray-900 mt-1">
                                        {attachedAgents.length === 0
                                          ? '—'
                                          : attachedAgents.map((a) => a.name).join(', ')}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAgentAssignContext({
                                            payorId: payor.id,
                                            planId: plan.id,
                                            payorName: payor.payorName,
                                            planName: plan.planName,
                                          })
                                        }
                                        className="text-xs font-medium text-primary-600 hover:text-primary-800 mt-1"
                                      >
                                        Manage agents
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                      <span
                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadgeClass(
                                          plan.status
                                        )}`}
                                      >
                                        {plan.status}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenPlanModal(payor.id, plan)
                                          }
                                          className="text-primary-600 hover:text-primary-900 transition-colors p-1"
                                          title="Edit Plan"
                                        >
                                          <Pencil size={16} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeletePlanConfirm({
                                              payorId: payor.id,
                                              planId: plan.id,
                                            })
                                          }
                                          className="text-red-600 hover:text-red-900 transition-colors p-1"
                                          title="Delete Plan"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Results Count */}
        {filteredPayors.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredPayors.length}</span>{' '}
              of <span className="font-medium">{payors.length}</span> payors
              {' • '}
              <span className="font-medium">{totalPlans}</span> total plans
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Payor Modal */}
      <Modal
        isOpen={isPayorModalOpen}
        onClose={handleClosePayorModal}
        title={editingPayor ? 'Edit Payor' : 'Add New Payor'}
        size="md"
      >
        <form onSubmit={handlePayorSubmit} className="space-y-4">
          <Input
            label="Payor Name"
            name="payorName"
            value={payorFormData.payorName}
            onChange={handlePayorInputChange}
            placeholder="Enter payor name"
            error={payorErrors.payorName}
            required
          />

          <Select
            label="Status"
            name="status"
            value={payorFormData.status}
            onChange={handlePayorInputChange}
            options={statusOptions}
            error={payorErrors.status}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClosePayorModal}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingPayor}>
              {isSubmittingPayor
                ? editingPayor
                  ? 'Updating...'
                  : 'Adding...'
                : editingPayor
                  ? 'Update Payor'
                  : 'Add Payor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Plan Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={handleClosePlanModal}
        title={editingPlan ? 'Edit Plan' : 'Add New Plan'}
        size="md"
      >
        <form onSubmit={handlePlanSubmit} className="space-y-4">
          <Input
            label="Plan Name"
            name="planName"
            value={planFormData.planName}
            onChange={handlePlanInputChange}
            placeholder="Enter plan name"
            error={planErrors.planName}
            required
          />

          <Select
            label="Plan Type"
            name="planType"
            value={planFormData.planType}
            onChange={handlePlanInputChange}
            options={planTypes}
            placeholder="Select plan type"
            error={planErrors.planType}
            required
          />

          <Select
            label="Auto-check Frequency"
            name="autoCheckFrequency"
            value={planFormData.autoCheckFrequency}
            onChange={handlePlanInputChange}
            options={autoCheckFrequencies}
            placeholder="Select frequency"
            error={planErrors.autoCheckFrequency}
            required
          />

          <Select
            label="Status"
            name="status"
            value={planFormData.status}
            onChange={handlePlanInputChange}
            options={statusOptions}
            error={planErrors.status}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClosePlanModal}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingPlan}>
              {isSubmittingPlan
                ? editingPlan
                  ? 'Updating...'
                  : 'Adding...'
                : editingPlan
                  ? 'Update Plan'
                  : 'Add Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Payor Confirmation Modal */}
      <Modal
        isOpen={deletePayorConfirm !== null}
        onClose={() => setDeletePayorConfirm(null)}
        title="Delete Payor"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this payor? This will also delete all
            associated plans. This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingPayor}
              onClick={() => setDeletePayorConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isDeletingPayor}
              onClick={() =>
                deletePayorConfirm && handleDeletePayor(deletePayorConfirm)
              }
            >
              {isDeletingPayor ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Plan Confirmation Modal */}
      <Modal
        isOpen={deletePlanConfirm !== null}
        onClose={() => setDeletePlanConfirm(null)}
        title="Delete Plan"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this plan? This action cannot be
            undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingPlan}
              onClick={() => setDeletePlanConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isDeletingPlan}
              onClick={() =>
                deletePlanConfirm &&
                handleDeletePlan(deletePlanConfirm.payorId, deletePlanConfirm.planId)
              }
            >
              {isDeletingPlan ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={agentAssignContext !== null}
        onClose={() => setAgentAssignContext(null)}
        title={
          agentAssignContext
            ? `AI agents · ${agentAssignContext.payorName} — ${agentAssignContext.planName}`
            : 'AI agents'
        }
        size="md"
      >
        {agentAssignContext && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Checked agents are scoped to this payor and plan (the same fields as on the AI Agents
              page). Each agent can only be linked to one payor/plan at a time.
            </p>
            <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg max-h-80 overflow-y-auto bg-white">
              {agents.map((agent) => {
                const on =
                  agent.payorId === agentAssignContext.payorId &&
                  agent.planId === agentAssignContext.planId
                return (
                  <li key={agent.id} className="flex items-start gap-3 p-3">
                    <input
                      type="checkbox"
                      id={`payor-agent-${agent.id}`}
                      checked={on}
                      onChange={(e) =>
                        toggleAgentOnPlan(
                          agent.id,
                          e.target.checked,
                          agentAssignContext.payorId,
                          agentAssignContext.planId
                        )
                      }
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor={`payor-agent-${agent.id}`} className="flex-1 min-w-0 cursor-pointer">
                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{agent.description}</div>
                    </label>
                  </li>
                )
              })}
            </ul>
            <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
              <Button type="button" variant="primary" onClick={() => setAgentAssignContext(null)}>
                Done
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

export default PayorConfiguration
