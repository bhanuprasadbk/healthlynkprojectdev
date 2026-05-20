import { apiJsonRequest } from './apiClient'
import { isApiAuthDebugEnabled, logApiAuthRequest } from './authDebug'
import type { Notification, NotificationPriority, NotificationType } from '../data/notificationData'
import { env } from '../config/env'

export type ApiNotificationRow = Record<string, unknown>

export type ApiNotificationsPayload =
  | ApiNotificationRow[]
  | { data?: ApiNotificationRow[] | { notifications?: ApiNotificationRow[] } }

const ALLOWED_TYPES = new Set<NotificationType>([
  'prior_auth_approved',
  'prior_auth_denied',
  'prior_auth_pending',
  'eligibility_complete',
  'eligibility_failed',
  'coverage_change',
  'patient_intake',
  'document_required',
  'deadline_reminder',
  'system_alert',
])

function normalizeType(value: unknown): NotificationType {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase() as NotificationType
    if (ALLOWED_TYPES.has(normalized)) return normalized
  }
  return 'system_alert'
}

function normalizePriority(value: unknown): NotificationPriority {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
      return normalized
    }
  }
  return 'low'
}

export function mapApiRowToNotification(row: ApiNotificationRow, index: number): Notification {
  const metadata = (row.metadata as Notification['metadata']) ?? {}
  return {
    id: (row.id as string) || `notification-${index + 1}`,
    type: normalizeType(row.type),
    priority: normalizePriority(row.priority),
    title: (row.title as string) || 'Notification',
    message: (row.message as string) || '',
    timestamp:
      (row.timestamp as string) ||
      (row.created_at as string) ||
      (row.createdAt as string) ||
      new Date().toISOString(),
    read: typeof row.read === 'boolean' ? row.read : Boolean(row.is_read),
    actionUrl: (row.action_url as string) || (row.actionUrl as string),
    actionLabel: (row.action_label as string) || (row.actionLabel as string),
    metadata: {
      ...metadata,
      ...(row.patient_name ? { patientName: row.patient_name as string } : {}),
      ...(row.patient_id ? { patientId: row.patient_id as string } : {}),
      ...(row.payor ? { payor: row.payor as string } : {}),
      ...(row.request_id ? { requestId: row.request_id as string } : {}),
    },
  }
}

export function parseNotificationsList(response: ApiNotificationsPayload): ApiNotificationRow[] {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.notifications)) return response.data.notifications
  return []
}

export async function fetchNotifications(): Promise<Notification[]> {
  if (isApiAuthDebugEnabled()) {
    const headers = new Headers()
    console.group('[Notifications] About to call API (same as Settings/Payors via apiClient)')
    console.log('Step 1: wait for isApiAuthReady (user logged in via cookie session)')
    console.log('Step 2: apiJsonRequest → apiRequest → fetch with credentials: include')
    console.log('Step 3: compare with GET /settings/full in Network tab — same Cookie header expected')
    console.groupEnd()
    logApiAuthRequest({
      label: 'notifications (preview)',
      path: '/notifications',
      method: 'GET',
      url: `${env.apiBaseUrl().replace(/\/$/, '')}/notifications`,
      headers,
    })
  }

  const response = await apiJsonRequest<ApiNotificationsPayload>(
    '/notifications',
    { method: 'GET' },
    { suppressAuthExpiredOn401: true, debugLabel: 'notifications' }
  )
  return parseNotificationsList(response).map(mapApiRowToNotification)
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiJsonRequest('/notifications/mark-all-read', { method: 'PATCH' })
}
