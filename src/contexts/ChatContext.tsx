import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { eligibilityChecks } from '../data/mockData'
import { mockNotifications } from '../data/notificationData'
import { initialPayors } from '../data/payorData'
import { initialCptHcpcCodes } from '../data/cptHcpcData'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

interface ChatHistory {
  userId: string
  conversations: Conversation[]
  activeConversationId: string | null
}

const STORAGE_KEY_PREFIX = 'healthlynk-chat'
const CURRENT_USER_ID = 'dr-sarah-johnson'

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}-${userId}`
}

function loadHistory(userId: string): ChatHistory {
  try {
    const stored = localStorage.getItem(getStorageKey(userId))
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Failed to load chat history:', e)
  }
  return { userId, conversations: [], activeConversationId: null }
}

function saveHistory(history: ChatHistory): void {
  try {
    localStorage.setItem(getStorageKey(history.userId), JSON.stringify(history))
  } catch (e) {
    console.error('Failed to save chat history:', e)
  }
}

function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.slice(0, 50)
  return trimmed.length < firstMessage.length ? trimmed + '...' : trimmed
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function generateResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('hello') || lower.includes('hi ') || lower === 'hi' || lower.includes('hey') || lower.includes('good morning') || lower.includes('good afternoon')) {
    return "Hello! I'm **Lynk AI**, your HealthLynk assistant. I can help you with:\n\n- Patient information and statistics\n- Eligibility check status\n- Prior authorization tracking\n- Payor and insurance details\n- Notifications and alerts\n- CPT/HCPC code lookup\n- Dashboard insights\n\nWhat would you like to know?"
  }

  if (lower.includes('summary') || lower.includes('dashboard') || lower.includes('overview') || lower.includes('how is everything')) {
    const totalPatients = new Set(eligibilityChecks.map((c) => c.patientId)).size
    const complete = eligibilityChecks.filter((c) => c.status === 'Complete').length
    const pending = eligibilityChecks.filter((c) => c.status === 'Pending Authorization').length
    const paperwork = eligibilityChecks.filter((c) => c.status === 'Pending Paperwork').length
    const unreadNotif = mockNotifications.filter((n) => !n.read).length
    const activePayors = initialPayors.filter((p) => p.status === 'active').length
    return `Here's your practice overview:\n\n**Patients**\n- ${totalPatients} unique patients in the system\n\n**Eligibility Checks** (${eligibilityChecks.length} total)\n- ${complete} Complete\n- ${pending} Pending Authorization\n- ${paperwork} Pending Paperwork\n\n**Payors**\n- ${initialPayors.length} configured, ${activePayors} active\n\n**Notifications**\n- ${unreadNotif} unread alerts requiring attention\n\nWould you like me to dig deeper into any of these areas?`
  }

  if (lower.includes('pending') && (lower.includes('auth') || lower.includes('authorization'))) {
    const pending = eligibilityChecks.filter((c) => c.status === 'Pending Authorization')
    if (pending.length === 0) {
      return 'Great news — there are **no pending authorizations** at the moment. All checks are either complete or awaiting paperwork.'
    }
    const list = pending
      .map((c) => `| ${c.patientName} | ${c.patientId} | ${c.payor} | ${c.serviceType} |`)
      .join('\n')
    return `There are **${pending.length}** pending authorizations:\n\n| Patient | ID | Payor | Service |\n|---|---|---|---|\n${list}\n\nWould you like details on any specific patient?`
  }

  if (lower.includes('patient') && (lower.includes('stat') || lower.includes('count') || lower.includes('how many') || lower.includes('total'))) {
    const uniquePatients = new Set(eligibilityChecks.map((c) => c.patientId))
    const activeCoverage = eligibilityChecks.filter((c) => c.coverage === 'Active').length
    const inactiveCoverage = eligibilityChecks.filter((c) => c.coverage === 'Inactive').length
    const pendingVerification = eligibilityChecks.filter((c) => c.coverage === 'Pending Verification').length
    return `**Patient Statistics**\n\n| Metric | Count |\n|---|---|\n| Unique Patients | ${uniquePatients.size} |\n| Active Coverage | ${activeCoverage} |\n| Inactive Coverage | ${inactiveCoverage} |\n| Pending Verification | ${pendingVerification} |\n\nIs there a specific patient you'd like to look up?`
  }

  if ((lower.includes('patient') && lower.includes('list')) || lower.includes('show patients') || lower.includes('all patients')) {
    const patients = new Map<string, { name: string; id: string; payor: string; status: string; coverage: string }>()
    for (const c of eligibilityChecks) {
      if (!patients.has(c.patientId)) {
        patients.set(c.patientId, { name: c.patientName, id: c.patientId, payor: c.payor, status: c.status, coverage: c.coverage })
      }
    }
    const rows = Array.from(patients.values())
      .slice(0, 10)
      .map((p) => `| ${p.name} | ${p.id} | ${p.payor} | ${p.coverage} |`)
      .join('\n')
    return `**Patient List** (showing first 10)\n\n| Name | ID | Payor | Coverage |\n|---|---|---|---|\n${rows}\n\nTotal: **${patients.size}** unique patients. You can view the full list on the Patients page.`
  }

  if (lower.includes('notification') || lower.includes('alert') || lower.includes('unread')) {
    const unread = mockNotifications.filter((n) => !n.read)
    const highPriority = unread.filter((n) => n.priority === 'high')
    if (unread.length === 0) {
      return "You're all caught up — **no unread notifications**."
    }
    const list = unread
      .map((n) => {
        const icon = n.priority === 'high' ? '🔴' : n.priority === 'medium' ? '🟡' : '🔵'
        return `${icon} **${n.title}**\n   ${n.message.slice(0, 80)}...`
      })
      .join('\n\n')
    return `You have **${unread.length}** unread notifications (**${highPriority.length}** high priority):\n\n${list}\n\nVisit the Notifications page to take action on these.`
  }

  if (lower.includes('payor') || lower.includes('payer') || lower.includes('insurance')) {
    const list = initialPayors
      .map((p) => {
        const statusBadge = p.status === 'active' ? '✅' : '⛔'
        const plans = p.plans.map((pl) => `${pl.planName} (${pl.planType})`).join(', ')
        return `${statusBadge} **${p.payorName}**\n   Plans: ${plans}`
      })
      .join('\n\n')
    return `**Configured Payors** (${initialPayors.length} total)\n\n${list}\n\nManage payors in the Payor Configuration page.`
  }

  if (lower.includes('eligibility') || lower.includes('check') || lower.includes('verification')) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayChecks = eligibilityChecks.filter((c) => {
      const d = new Date(c.date)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    })
    const byPayor = new Map<string, number>()
    for (const c of eligibilityChecks) {
      byPayor.set(c.payor, (byPayor.get(c.payor) || 0) + 1)
    }
    const payorBreakdown = Array.from(byPayor.entries())
      .map(([name, count]) => `| ${name} | ${count} |`)
      .join('\n')
    return `**Eligibility Checks**\n\n- Total: **${eligibilityChecks.length}**\n- Today: **${todayChecks.length}**\n\n**By Payor:**\n\n| Payor | Count |\n|---|---|\n${payorBreakdown}\n\nView detailed results on the Dashboard.`
  }

  if (lower.includes('cpt') || lower.includes('hcpc') || lower.includes('code') || lower.includes('procedure')) {
    const cptCount = initialCptHcpcCodes.filter((c) => c.category === 'CPT').length
    const hcpcCount = initialCptHcpcCodes.filter((c) => c.category === 'HCPC').length
    const authRequired = initialCptHcpcCodes.filter((c) => c.authorizationRequired).length
    const rows = initialCptHcpcCodes
      .slice(0, 8)
      .map((c) => `| ${c.code} | ${c.description.slice(0, 40)}... | ${c.category} | ${c.authorizationRequired ? 'Yes' : 'No'} |`)
      .join('\n')
    return `**CPT/HCPC Codes** (${initialCptHcpcCodes.length} total)\n\n- CPT codes: **${cptCount}**\n- HCPC codes: **${hcpcCount}**\n- Auth required: **${authRequired}** of ${initialCptHcpcCodes.length}\n\n| Code | Description | Category | Auth? |\n|---|---|---|---|\n${rows}\n\nView all codes on the CPT/HCPC Configuration page.`
  }

  if (lower.includes('help') || lower.includes('what can you do') || lower.includes('feature') || lower.includes('how do i')) {
    return "Here's what I can help you with:\n\n**📊 Dashboard & Analytics**\nAsk for a practice overview, dashboard summary, or key metrics.\n\n**👥 Patients**\nLook up patient statistics, coverage status, or patient lists.\n\n**✅ Eligibility**\nCheck eligibility verification status, breakdowns by payor or service.\n\n**📋 Prior Authorization**\nTrack pending authorizations, approved requests, or specific patients.\n\n**🏥 Payors & Insurance**\nView configured payors, plan details, and status.\n\n**🔔 Notifications**\nSee unread alerts, high-priority items, and recent activity.\n\n**💊 CPT/HCPC Codes**\nLook up procedure codes, authorization requirements, and categories.\n\nJust type your question naturally — I'll do my best to help!"
  }

  if (lower.includes('thank')) {
    return "You're welcome! Don't hesitate to ask if you need anything else. I'm here to help. 😊"
  }

  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('your name')) {
    return "I'm **Lynk AI**, the built-in assistant for HealthLynk. I have access to your practice data including patients, eligibility checks, prior authorizations, payors, and notifications. I can help you quickly find information without navigating through multiple pages.\n\nHow can I assist you today?"
  }

  return "I'd be happy to help! I can provide information about:\n\n- **Dashboard summary** — practice overview and metrics\n- **Patients** — statistics, lists, and coverage\n- **Eligibility checks** — verification status and breakdowns\n- **Prior authorizations** — pending and completed\n- **Notifications** — unread alerts\n- **Payors** — configured insurance providers\n- **CPT/HCPC codes** — procedure code lookup\n\nCould you rephrase your question, or try one of the topics above?"
}

interface ChatContextType {
  history: ChatHistory
  activeConversation: Conversation | null
  createConversation: () => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string) => void
  sendMessage: (content: string) => void
  clearHistory: () => void
  renameConversation: (id: string, title: string) => void
  isTyping: boolean
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<ChatHistory>(() => loadHistory(CURRENT_USER_ID))
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    saveHistory(history)
  }, [history])

  const activeConversation = history.conversations.find(
    (c) => c.id === history.activeConversationId
  ) ?? null

  const createConversation = useCallback((): string => {
    const id = makeId()
    const now = new Date().toISOString()
    const newConv: Conversation = {
      id,
      title: 'New conversation',
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    setHistory((prev) => ({
      ...prev,
      conversations: [newConv, ...prev.conversations],
      activeConversationId: id,
    }))
    return id
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setHistory((prev) => {
      const filtered = prev.conversations.filter((c) => c.id !== id)
      return {
        ...prev,
        conversations: filtered,
        activeConversationId:
          prev.activeConversationId === id
            ? (filtered[0]?.id ?? null)
            : prev.activeConversationId,
      }
    })
  }, [])

  const setActiveConversation = useCallback((id: string) => {
    setHistory((prev) => ({ ...prev, activeConversationId: id }))
  }, [])

  const renameConversation = useCallback((id: string, title: string) => {
    setHistory((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }))
  }, [])

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      let targetId = history.activeConversationId
      const now = new Date().toISOString()

      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: trimmed,
        timestamp: now,
      }

      setHistory((prev) => {
        let conversations = [...prev.conversations]
        let activeId = prev.activeConversationId

        if (!activeId) {
          const newId = makeId()
          activeId = newId
          targetId = newId
          conversations = [
            {
              id: newId,
              title: generateTitle(trimmed),
              messages: [userMsg],
              createdAt: now,
              updatedAt: now,
            },
            ...conversations,
          ]
        } else {
          conversations = conversations.map((c) => {
            if (c.id !== activeId) return c
            const isFirst = c.messages.length === 0
            return {
              ...c,
              title: isFirst ? generateTitle(trimmed) : c.title,
              messages: [...c.messages, userMsg],
              updatedAt: now,
            }
          })
        }

        return { ...prev, conversations, activeConversationId: activeId }
      })

      setIsTyping(true)
      const delay = 500 + Math.random() * 1000

      setTimeout(() => {
        const response = generateResponse(trimmed)
        const assistantMsg: ChatMessage = {
          id: makeId(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        }
        setHistory((prev) => ({
          ...prev,
          conversations: prev.conversations.map((c) =>
            c.id === (targetId ?? prev.activeConversationId)
              ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: new Date().toISOString() }
              : c
          ),
        }))
        setIsTyping(false)
      }, delay)
    },
    [history.activeConversationId]
  )

  const clearHistory = useCallback(() => {
    setHistory({ userId: CURRENT_USER_ID, conversations: [], activeConversationId: null })
  }, [])

  return (
    <ChatContext.Provider
      value={{
        history,
        activeConversation,
        createConversation,
        deleteConversation,
        setActiveConversation,
        sendMessage,
        clearHistory,
        renameConversation,
        isTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
