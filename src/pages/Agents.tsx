import { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react'
import {
  Bot,
  Plus,
  Search,
  Trash2,
  Sparkles,
} from 'lucide-react'
import Button from '../components/forms/Button'
import Input from '../components/forms/Input'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useTheme } from '../contexts/ThemeContext'
import Select from '../components/forms/Select'
import {
  AGENT_AUTOMATION_OPTIONS,
  Agent,
  AgentAutomationJob,
  AgentFrequencyMode,
  PERMISSION_DEFINITIONS,
  PermissionKey,
  PermissionLevel,
  createAgentId,
  getAgentScopeLabel,
  getEffectivePermissions,
  getResolvedAgentFrequency,
  initialAgents,
  loadAgentsFromStorage,
  mergeInitialAgentsIntoStored,
  mergeRolePermissions,
  saveAgentsToStorage,
} from '../data/agentData'
import { autoCheckFrequencies, initialPayors } from '../data/payorData'

const PERMISSION_LEVELS: { value: PermissionLevel; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
]

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

const Agents = () => {
  const { theme } = useTheme()
  const [agents, setAgents] = useState<Agent[]>(() => {
    if (typeof window === 'undefined') return initialAgents
    const stored = loadAgentsFromStorage()
    if (!stored) return initialAgents
    return mergeInitialAgentsIntoStored(stored)
  })
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return initialAgents[0]?.id ?? null
    const stored = loadAgentsFromStorage()
    const list = stored ? mergeInitialAgentsIntoStored(stored) : initialAgents
    return list[0]?.id ?? null
  })
  const [search, setSearch] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newErrors, setNewErrors] = useState<{ name?: string }>({})

  useEffect(() => {
    saveAgentsToStorage(agents)
  }, [agents])

  useEffect(() => {
    if (selectedId && !agents.some((a) => a.id === selectedId)) {
      setSelectedId(agents[0]?.id ?? null)
    }
  }, [agents, selectedId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return agents
    return agents.filter((a) => {
      const scope = getAgentScopeLabel(a, initialPayors)?.toLowerCase() ?? ''
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        scope.includes(q)
      )
    })
  }, [agents, search])

  const selected = agents.find((a) => a.id === selectedId) ?? null

  const selectedEffectivePermissions = useMemo(() => {
    if (!selected) return null
    return getEffectivePermissions(selected)
  }, [selected])

  const plansForSelectedPayor = useMemo(() => {
    if (!selected?.payorId) return []
    return initialPayors.find((p) => p.id === selected.payorId)?.plans ?? []
  }, [selected?.payorId])

  const resolvedFrequencyKey = useMemo(() => {
    if (!selected) return ''
    return getResolvedAgentFrequency(selected, initialPayors)
  }, [selected])

  const resolvedFrequencyLabel = useMemo(() => {
    return autoCheckFrequencies.find((o) => o.value === resolvedFrequencyKey)?.label ?? resolvedFrequencyKey
  }, [resolvedFrequencyKey])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setToastOpen(true)
  }

  const updateAgent = (id: string, patch: Partial<Agent>) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const setPermissionLevel = (agentId: string, key: PermissionKey, level: PermissionLevel) => {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== agentId) return a
        const inherited = mergeRolePermissions(a.roleIds)[key]
        const nextOverrides = { ...a.permissionOverrides }
        if (level === inherited) {
          delete nextOverrides[key]
        } else {
          nextOverrides[key] = level
        }
        return { ...a, permissionOverrides: nextOverrides }
      })
    )
  }

  const toggleEnabled = (agentId: string, enabled: boolean) => {
    updateAgent(agentId, { enabled })
  }

  const openAddModal = () => {
    setNewName('')
    setNewDescription('')
    setNewErrors({})
    setAddModalOpen(true)
  }

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      setNewErrors({ name: 'Name is required' })
      return
    }
    const agent: Agent = {
      id: createAgentId(),
      name: newName.trim(),
      description: newDescription.trim(),
      enabled: true,
      /** Hidden default — full baseline access; user adjusts per permission below. */
      roleIds: ['admin'],
      permissionOverrides: {},
      status: 'idle',
      lastRunAt: null,
      lastError: null,
      payorId: null,
      planId: null,
      frequencyMode: 'plan_rule',
      customFrequency: '3months',
      automationJob: 'none',
    }
    setAgents((prev) => [...prev, agent])
    setSelectedId(agent.id)
    setAddModalOpen(false)
    showToast('Agent created')
  }

  const handleDelete = (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id))
    setDeleteConfirmId(null)
    showToast('Agent removed')
  }

  const inputSurface = {
    backgroundColor: theme.colors.cardBackground,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
  } as const

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex items-start gap-3">
          <div
            className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: theme.colors.primaryLight }}
          >
            <Bot size={22} style={{ color: theme.colors.primary }} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
              AI Agents
            </h1>
            <p className="mt-1 text-sm sm:text-base" style={{ color: theme.colors.textSecondary }}>
              Agents can be scoped to a payor and plan. On the schedule you choose (from plan rules
              or custom), the agent runs the selected automation job—such as batch eligibility
              checks—for every patient under that payor and plan.
            </p>
          </div>
        </div>
        <Button variant="primary" className="w-full sm:w-auto shrink-0 justify-center" onClick={openAddModal}>
          <span className="flex items-center justify-center gap-2">
            <Plus size={18} />
            Add agent
          </span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-stretch min-h-[min(70vh,640px)]">
        {/* List */}
        <div
          className="flex flex-col rounded-xl border overflow-hidden lg:w-[min(100%,380px)] shrink-0"
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          }}
        >
          <div className="p-3 border-b" style={{ borderColor: theme.colors.border }}>
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: theme.colors.textSecondary }}
              />
              <input
                type="search"
                placeholder="Search agents, payor, or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-colors"
                style={inputSurface}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primaryLight}`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto min-h-0 divide-y" style={{ borderColor: theme.colors.border }}>
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-sm" style={{ color: theme.colors.textSecondary }}>
                No agents match your search.
              </li>
            ) : (
              filtered.map((a) => {
                const isSel = a.id === selectedId
                const scopeLine = getAgentScopeLabel(a, initialPayors)
                return (
                  <li key={a.id} className="flex">
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className="flex-1 min-w-0 text-left px-3 py-3 transition-colors flex flex-col gap-0.5"
                      style={{
                        backgroundColor: isSel ? theme.colors.primaryLight : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate" style={{ color: theme.colors.textPrimary }}>
                          {a.name}
                        </span>
                        {!a.enabled && (
                          <span
                            className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              backgroundColor: theme.colors.border,
                              color: theme.colors.textSecondary,
                            }}
                          >
                            Off
                          </span>
                        )}
                        {a.status === 'running' && (
                          <span
                            className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              backgroundColor: theme.colors.primaryLight,
                              color: theme.colors.primary,
                            }}
                          >
                            Running
                          </span>
                        )}
                        {a.status === 'error' && (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-800">
                            Error
                          </span>
                        )}
                      </div>
                      {scopeLine && (
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: theme.colors.primary }}
                        >
                          {scopeLine}
                        </p>
                      )}
                      <p className="text-xs truncate" style={{ color: theme.colors.textSecondary }}>
                        {a.description.trim() || '—'}
                      </p>
                    </button>
                    <div className="shrink-0 flex items-center pr-3 py-2">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={a.enabled}
                          onChange={() => toggleEnabled(a.id, !a.enabled)}
                          className="sr-only peer"
                          aria-label={a.enabled ? 'Disable agent' : 'Enable agent'}
                        />
                        <span
                          className="relative w-9 h-5 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1"
                          style={{
                            backgroundColor: a.enabled ? theme.colors.primary : theme.colors.border,
                            outlineColor: theme.colors.primary,
                          }}
                        >
                          <span
                            className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                            style={{
                              transform: a.enabled ? 'translateX(1rem)' : 'translateX(0)',
                            }}
                          />
                        </span>
                      </label>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>

        {/* Detail */}
        <div
          className="flex-1 min-w-0 rounded-xl border flex flex-col overflow-hidden"
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          }}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center" style={{ color: theme.colors.textSecondary }}>
              <div>
                <Sparkles className="mx-auto mb-2 opacity-40" size={32} />
                <p>Select an agent to edit its permissions, or add a new one.</p>
              </div>
            </div>
          ) : (
            <>
              <div
                className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-start gap-3 justify-between"
                style={{ borderColor: theme.colors.border }}
              >
                <div className="min-w-0 flex-1 space-y-3">
                  <Input
                    name="agentName"
                    label="Name"
                    value={selected.name}
                    onChange={(e) => updateAgent(selected.id, { name: e.target.value })}
                  />
                  <div className="w-full">
                    <label
                      htmlFor="agent-detail-desc"
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      Description
                    </label>
                    <textarea
                      id="agent-detail-desc"
                      rows={2}
                      value={selected.description}
                      onChange={(e) => updateAgent(selected.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm resize-y min-h-[64px]"
                      style={inputSurface}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primaryLight}`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  <div
                    className="rounded-lg border p-4 space-y-4"
                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
                  >
                    <h3 className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                      Payor, plan &amp; automation
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: theme.colors.textSecondary }}>
                      When a payor and plan are set, this agent runs the chosen job on schedule for{' '}
                      <strong style={{ color: theme.colors.textPrimary }}>all patients</strong> tied to that
                      payor and plan. The scheduler invokes the underlying APIs (e.g. eligibility batch) on
                      each cycle—production wiring connects your job runner here.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        name="agent-payor"
                        label="Payor"
                        value={selected.payorId ?? ''}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                          const v = e.target.value
                          if (!v) {
                            updateAgent(selected.id, { payorId: null, planId: null })
                            return
                          }
                          const payor = initialPayors.find((p) => p.id === v)
                          const planId = payor?.plans[0]?.id ?? null
                          updateAgent(selected.id, { payorId: v, planId })
                        }}
                        options={[
                          { value: '', label: 'Not attached' },
                          ...initialPayors.map((p) => ({ value: p.id, label: p.payorName })),
                        ]}
                        placeholder=""
                      />
                      <Select
                        name="agent-plan"
                        label="Plan"
                        value={selected.planId ?? ''}
                        disabled={!selected.payorId || plansForSelectedPayor.length === 0}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                          const v = e.target.value
                          updateAgent(selected.id, { planId: v || null })
                        }}
                        options={[
                          { value: '', label: 'Select plan' },
                          ...plansForSelectedPayor.map((pl) => ({
                            value: pl.id,
                            label: `${pl.planName} (${pl.planType})`,
                          })),
                        ]}
                        placeholder=""
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        name="agent-frequency-mode"
                        label="Schedule"
                        value={selected.frequencyMode}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          updateAgent(selected.id, {
                            frequencyMode: e.target.value as AgentFrequencyMode,
                          })
                        }
                        options={[
                          { value: 'plan_rule', label: 'From plan rule (payor configuration)' },
                          { value: 'custom', label: 'Custom cadence' },
                        ]}
                        placeholder=""
                      />
                      <Select
                        name="agent-custom-frequency"
                        label="Custom cadence"
                        value={selected.customFrequency}
                        disabled={selected.frequencyMode !== 'custom'}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          updateAgent(selected.id, { customFrequency: e.target.value })
                        }
                        options={autoCheckFrequencies}
                        placeholder=""
                      />
                    </div>
                    <Select
                      name="agent-automation"
                      label="Automated API job"
                      value={selected.automationJob}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        updateAgent(selected.id, {
                          automationJob: e.target.value as AgentAutomationJob,
                        })
                      }
                      options={AGENT_AUTOMATION_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      placeholder=""
                    />
                    <p className="text-xs leading-relaxed rounded-md px-3 py-2" style={{ backgroundColor: theme.colors.primaryLight, color: theme.colors.textPrimary }}>
                      <span className="font-medium">Summary: </span>
                      {selected.automationJob === 'none' && 'No automatic API runs on a schedule.'}
                      {selected.automationJob === 'eligibility_batch' &&
                        (!selected.payorId || !selected.planId) &&
                        'Attach a payor and plan to run batch eligibility checks on a schedule.'}
                      {selected.automationJob === 'eligibility_batch' &&
                        selected.payorId &&
                        selected.planId &&
                        `Eligibility recheck every ${resolvedFrequencyLabel} (${selected.frequencyMode === 'plan_rule' ? 'from plan rule' : 'custom'}), for all patients under this payor and plan.`}
                    </p>
                  </div>

                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <dt className="font-medium" style={{ color: theme.colors.textSecondary }}>
                        Last activity
                      </dt>
                      <dd style={{ color: theme.colors.textPrimary }}>{formatWhen(selected.lastRunAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium" style={{ color: theme.colors.textSecondary }}>
                        Last error
                      </dt>
                      <dd style={{ color: theme.colors.textPrimary }}>{selected.lastError ?? '—'}</dd>
                    </div>
                  </dl>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="shrink-0 self-start"
                  onClick={() => setDeleteConfirmId(selected.id)}
                >
                  <span className="flex items-center gap-2">
                    <Trash2 size={16} />
                    Remove
                  </span>
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <section>
                  <h3
                    className="text-sm font-semibold mb-3"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    Permissions
                  </h3>
                  {selectedEffectivePermissions && (
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: theme.colors.tableHeaderBackground }}>
                            <th
                              className="text-left px-3 py-2 font-medium"
                              style={{ color: theme.colors.tableHeaderText }}
                            >
                              Area
                            </th>
                            <th
                              className="text-right px-3 py-2 font-medium w-[min(40%,200px)]"
                              style={{ color: theme.colors.tableHeaderText }}
                            >
                              Level
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {PERMISSION_DEFINITIONS.map((def) => {
                            const eff = selectedEffectivePermissions[def.key]
                            const isOverride = selected.permissionOverrides[def.key] !== undefined
                            return (
                              <tr
                                key={def.key}
                                style={{
                                  borderTop: `1px solid ${theme.colors.border}`,
                                  backgroundColor: theme.colors.tableRowBackground,
                                }}
                                className="transition-colors"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = theme.colors.tableRowHover
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = theme.colors.tableRowBackground
                                }}
                              >
                                <td className="px-3 py-2 align-middle">
                                  <span style={{ color: theme.colors.textPrimary }}>{def.label}</span>
                                  {isOverride && (
                                    <span className="block text-[10px] mt-0.5" style={{ color: theme.colors.primary }}>
                                      Override
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 align-middle text-right">
                                  <select
                                    value={eff}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                      setPermissionLevel(
                                        selected.id,
                                        def.key,
                                        e.target.value as PermissionLevel
                                      )
                                    }
                                    className="text-sm rounded-lg border px-2 py-1.5 max-w-full focus:outline-none focus:ring-2"
                                    style={{
                                      ...inputSurface,
                                      borderColor: theme.colors.border,
                                    }}
                                  >
                                    {PERMISSION_LEVELS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add agent" size="md">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            name="name"
            label="Name"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              if (newErrors.name) setNewErrors({})
            }}
            placeholder="e.g. Intake Assistant"
            required
            error={newErrors.name}
          />
          <div className="w-full">
            <label
              htmlFor="agent-desc"
              className="block text-sm font-medium mb-2"
              style={{ color: theme.colors.textPrimary }}
            >
              Description
            </label>
            <textarea
              id="agent-desc"
              name="description"
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What this agent is for..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm resize-y min-h-[80px]"
              style={inputSurface}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primaryLight}`
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create agent
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Remove agent?"
        size="sm"
      >
        <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>
          This removes the agent configuration from this workspace. Chat history is not affected.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
            Remove
          </Button>
        </div>
      </Modal>

      <Toast
        message={toastMessage}
        type="success"
        isVisible={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </div>
  )
}

export default Agents
