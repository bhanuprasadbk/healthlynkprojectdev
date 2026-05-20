import type { Payor } from './payorData'

export type PermissionLevel = 'none' | 'read' | 'write'

export const PERMISSION_LEVEL_ORDER: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
}

export type PermissionKey =
  | 'patients'
  | 'patient_intake'
  | 'eligibility'
  | 'prior_auth'
  | 'payors'
  | 'cpt_hcpc'
  | 'notifications'
  | 'dashboard'
  | 'documents_export'

export interface PermissionDef {
  key: PermissionKey
  label: string
  group: 'Clinical' | 'Revenue cycle' | 'System'
}

export const PERMISSION_DEFINITIONS: PermissionDef[] = [
  { key: 'patients', label: 'Patients', group: 'Clinical' },
  { key: 'patient_intake', label: 'Patient intake', group: 'Clinical' },
  { key: 'eligibility', label: 'Eligibility', group: 'Clinical' },
  { key: 'prior_auth', label: 'Prior authorization', group: 'Clinical' },
  { key: 'payors', label: 'Payor configuration', group: 'Revenue cycle' },
  { key: 'cpt_hcpc', label: 'CPT / HCPC codes', group: 'Revenue cycle' },
  { key: 'notifications', label: 'Notifications', group: 'System' },
  { key: 'dashboard', label: 'Dashboard & analytics', group: 'System' },
  { key: 'documents_export', label: 'Documents & export', group: 'System' },
]

export function emptyPermissions(): Record<PermissionKey, PermissionLevel> {
  return PERMISSION_DEFINITIONS.reduce(
    (acc, d) => {
      acc[d.key] = 'none'
      return acc
    },
    {} as Record<PermissionKey, PermissionLevel>
  )
}

export function maxLevel(a: PermissionLevel, b: PermissionLevel): PermissionLevel {
  return PERMISSION_LEVEL_ORDER[a] >= PERMISSION_LEVEL_ORDER[b] ? a : b
}

export interface AgentRole {
  id: string
  name: string
  description: string
  defaultPermissions: Record<PermissionKey, PermissionLevel>
}

export const AGENT_ROLES: AgentRole[] = [
  {
    id: 'caregiver',
    name: 'Caregiver',
    description: 'Clinical workflows and patient-facing tasks',
    defaultPermissions: {
      ...emptyPermissions(),
      patients: 'read',
      patient_intake: 'write',
      eligibility: 'read',
      prior_auth: 'read',
      dashboard: 'read',
      notifications: 'read',
    },
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Payors, codes, and prior authorization submission',
    defaultPermissions: {
      ...emptyPermissions(),
      patients: 'read',
      eligibility: 'read',
      prior_auth: 'write',
      payors: 'read',
      cpt_hcpc: 'read',
      notifications: 'read',
    },
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full configuration and operational access',
    defaultPermissions: PERMISSION_DEFINITIONS.reduce(
      (acc, d) => {
        acc[d.key] = 'write'
        return acc
      },
      {} as Record<PermissionKey, PermissionLevel>
    ),
  },
]

export type AgentRuntimeStatus = 'idle' | 'running' | 'error'

/** Automated job the agent runs on its schedule (underlying APIs invoked by the scheduler). */
export type AgentAutomationJob = 'none' | 'eligibility_batch'

/** Whether schedule cadence comes from the linked plan’s payor rules or a custom interval. */
export type AgentFrequencyMode = 'plan_rule' | 'custom'

export interface Agent {
  id: string
  name: string
  description: string
  enabled: boolean
  roleIds: string[]
  /** Explicit overrides; unset keys inherit from merged role defaults */
  permissionOverrides: Partial<Record<PermissionKey, PermissionLevel>>
  status: AgentRuntimeStatus
  lastRunAt: string | null
  lastError: string | null
  /**
   * Scope: patients under this payor + plan receive scheduled checks when automation is enabled.
   * Null = not attached to a payor/plan (agent is manual or chat-only).
   */
  payorId: string | null
  planId: string | null
  /** Use linked plan’s auto-check frequency from payor configuration, or a custom cadence. */
  frequencyMode: AgentFrequencyMode
  /** Used when `frequencyMode` is `custom` (same values as payor plan frequencies). */
  customFrequency: string
  /** API job to run on schedule for all matching patients. */
  automationJob: AgentAutomationJob
}

export const AGENT_AUTOMATION_OPTIONS: {
  value: AgentAutomationJob
  label: string
  description: string
}[] = [
  {
    value: 'none',
    label: 'None',
    description: 'No automatic API runs.',
  },
  {
    value: 'eligibility_batch',
    label: 'Eligibility recheck (batch)',
    description:
      'On each run, executes eligibility checks for every patient tied to this payor and plan (e.g. pVerify eligibility API).',
  },
]

export function hydrateAgent(raw: Partial<Agent> & Pick<Agent, 'id'>): Agent {
  const base = raw as Agent
  return {
    ...base,
    payorId: base.payorId ?? null,
    planId: base.planId ?? null,
    frequencyMode: base.frequencyMode ?? 'plan_rule',
    customFrequency: base.customFrequency ?? '3months',
    automationJob: base.automationJob ?? 'none',
  }
}

export function hydrateAgents(list: Agent[]): Agent[] {
  return list.map((a) => hydrateAgent(a))
}

/** Effective schedule key (e.g. `3months`) from plan rules or custom agent setting. */
export function getResolvedAgentFrequency(agent: Agent, payors: Payor[]): string {
  if (agent.frequencyMode === 'custom') return agent.customFrequency || '3months'
  if (!agent.payorId || !agent.planId) return agent.customFrequency || '3months'
  const payor = payors.find((p) => p.id === agent.payorId)
  const plan = payor?.plans.find((pl) => pl.id === agent.planId)
  return plan?.autoCheckFrequency ?? agent.customFrequency ?? '3months'
}

export function getAgentScopeLabel(agent: Agent, payors: Payor[]): string | null {
  if (!agent.payorId || !agent.planId) return null
  const payor = payors.find((p) => p.id === agent.payorId)
  const plan = payor?.plans.find((pl) => pl.id === agent.planId)
  if (!payor || !plan) return null
  return `${payor.payorName} · ${plan.planName}`
}

export function mergeRolePermissions(roleIds: string[]): Record<PermissionKey, PermissionLevel> {
  const merged = emptyPermissions()
  for (const rid of roleIds) {
    const role = AGENT_ROLES.find((r) => r.id === rid)
    if (!role) continue
    for (const def of PERMISSION_DEFINITIONS) {
      const k = def.key
      merged[k] = maxLevel(merged[k], role.defaultPermissions[k])
    }
  }
  return merged
}

export function getInheritedPermissions(roleIds: string[]): Record<PermissionKey, PermissionLevel> {
  return mergeRolePermissions(roleIds)
}

export function getEffectivePermissions(agent: Agent): Record<PermissionKey, PermissionLevel> {
  const inherited = mergeRolePermissions(agent.roleIds)
  const out = { ...inherited }
  for (const def of PERMISSION_DEFINITIONS) {
    const k = def.key
    if (agent.permissionOverrides[k] !== undefined) {
      out[k] = agent.permissionOverrides[k]!
    }
  }
  return out
}

export function createAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const initialAgents: Agent[] = [
  {
    id: createAgentId(),
    name: 'Intake Assistant',
    description: 'Helps complete patient intake and eligibility checks from structured prompts.',
    enabled: true,
    roleIds: ['caregiver'],
    permissionOverrides: {},
    status: 'idle',
    lastRunAt: new Date(Date.now() - 3600_000).toISOString(),
    lastError: null,
    payorId: null,
    planId: null,
    frequencyMode: 'plan_rule',
    customFrequency: '3months',
    automationJob: 'none',
  },
  {
    id: createAgentId(),
    name: 'Prior auth assistant',
    description: 'Drafts prior authorization summaries and tracks payer rules.',
    enabled: true,
    roleIds: ['billing', 'caregiver'],
    permissionOverrides: {
      patients: 'read',
    },
    status: 'idle',
    lastRunAt: new Date(Date.now() - 86_400_000).toISOString(),
    lastError: null,
    payorId: null,
    planId: null,
    frequencyMode: 'plan_rule',
    customFrequency: '3months',
    automationJob: 'none',
  },
  {
    id: createAgentId(),
    name: 'Insurance discovery assistant',
    description:
      'Helps identify payers, plan options, and coverage context from patient or policy details.',
    enabled: true,
    roleIds: ['billing', 'caregiver'],
    permissionOverrides: {},
    status: 'idle',
    lastRunAt: new Date(Date.now() - 7200_000).toISOString(),
    lastError: null,
    payorId: '1',
    planId: '1-2',
    frequencyMode: 'plan_rule',
    customFrequency: '3months',
    automationJob: 'eligibility_batch',
  },
  {
    id: createAgentId(),
    name: 'Admin Monitor',
    description: 'Audits configuration changes and surfaces anomalies.',
    enabled: false,
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
  },
]

export const AGENTS_STORAGE_KEY = 'healthlynk-agents-v1'

/**
 * Ensures new default agents appear for users who already have localStorage data.
 * Matches by agent name (case-insensitive); user-created agents are unchanged.
 */
export function mergeInitialAgentsIntoStored(stored: Agent[]): Agent[] {
  const normalized = hydrateAgents(stored)
  const seen = new Set(normalized.map((a) => a.name.trim().toLowerCase()))
  const additions: Agent[] = []
  for (const seed of initialAgents) {
    const key = seed.name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    additions.push(
      hydrateAgent({
        ...seed,
        id: createAgentId(),
      })
    )
  }
  return additions.length > 0 ? [...normalized, ...additions] : normalized
}

export function loadAgentsFromStorage(): Agent[] | null {
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Agent[]
    if (!Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveAgentsToStorage(agents: Agent[]): void {
  try {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents))
  } catch (e) {
    console.error('Failed to persist agents', e)
  }
}
