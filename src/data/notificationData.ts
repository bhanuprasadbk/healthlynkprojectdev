import { ROUTES, PATIENT_NAV } from '../routes/routeMap'

export type NotificationType =
  | 'prior_auth_approved'
  | 'prior_auth_denied'
  | 'prior_auth_pending'
  | 'eligibility_complete'
  | 'eligibility_failed'
  | 'coverage_change'
  | 'patient_intake'
  | 'document_required'
  | 'system_alert'
  | 'deadline_reminder'

export type NotificationPriority = 'high' | 'medium' | 'low'

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  /** For `ROUTES.PATIENT_HOME` (`/patient`), pass `PATIENT_NAV` so the correct screen opens */
  actionState?: Record<string, unknown>
  actionLabel?: string
  metadata?: {
    patientName?: string
    patientId?: string
    payor?: string
    requestId?: string
    [key: string]: any
  }
}

// Generate timestamp relative to now
const now = new Date()
const getTimestamp = (minutesAgo: number): string => {
  const date = new Date(now)
  date.setMinutes(date.getMinutes() - minutesAgo)
  return date.toISOString()
}

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'prior_auth_approved',
    priority: 'high',
    title: 'Prior Authorization Approved',
    message: 'Prior authorization PA-2024-001234 for John Smith (P-12345) has been approved by Blue Cross Blue Shield.',
    timestamp: getTimestamp(15),
    read: false,
    actionUrl: ROUTES.PRIOR_AUTH,
    actionLabel: 'View Details',
    metadata: {
      patientName: 'John Smith',
      patientId: 'P-12345',
      payor: 'Blue Cross Blue Shield',
      requestId: 'PA-2024-001234',
    },
  },
  {
    id: 'notif-2',
    type: 'prior_auth_denied',
    priority: 'high',
    title: 'Prior Authorization Denied',
    message: 'Prior authorization PA-2024-001235 for Emily Johnson (P-12346) was denied by Aetna. Additional information may be required.',
    timestamp: getTimestamp(45),
    read: false,
    actionUrl: ROUTES.PRIOR_AUTH,
    actionLabel: 'Review',
    metadata: {
      patientName: 'Emily Johnson',
      patientId: 'P-12346',
      payor: 'Aetna',
      requestId: 'PA-2024-001235',
    },
  },
  {
    id: 'notif-3',
    type: 'eligibility_complete',
    priority: 'medium',
    title: 'Eligibility Check Completed',
    message: 'Eligibility verification completed for Michael Brown (P-12347). Coverage status: Active.',
    timestamp: getTimestamp(90),
    read: false,
    actionUrl: ROUTES.PATIENT_HOME,
    actionState: PATIENT_NAV.eligibility,
    actionLabel: 'View Result',
    metadata: {
      patientName: 'Michael Brown',
      patientId: 'P-12347',
      coverage: 'Active',
    },
  },
  {
    id: 'notif-4',
    type: 'document_required',
    priority: 'high',
    title: 'Documents Required',
    message: 'Additional documents needed for prior authorization PA-2024-001236. Please upload required documentation.',
    timestamp: getTimestamp(180),
    read: false,
    actionUrl: ROUTES.PRIOR_AUTH,
    actionLabel: 'Upload Documents',
    metadata: {
      requestId: 'PA-2024-001236',
    },
  },
  {
    id: 'notif-5',
    type: 'coverage_change',
    priority: 'medium',
    title: 'Coverage Status Changed',
    message: 'Coverage status for Sarah Davis (P-12348) has changed to Inactive. Review required.',
    timestamp: getTimestamp(240),
    read: true,
    actionUrl: ROUTES.PATIENT_HOME,
    actionState: PATIENT_NAV.eligibility,
    actionLabel: 'Review',
    metadata: {
      patientName: 'Sarah Davis',
      patientId: 'P-12348',
      coverage: 'Inactive',
    },
  },
  {
    id: 'notif-6',
    type: 'patient_intake',
    priority: 'medium',
    title: 'New Patient Intake',
    message: 'New patient intake form submitted for David Wilson. Review and verify information.',
    timestamp: getTimestamp(360),
    read: false,
    actionUrl: ROUTES.PATIENT_HOME,
    actionState: PATIENT_NAV.intake,
    actionLabel: 'Review Intake',
    metadata: {
      patientName: 'David Wilson',
    },
  },
  {
    id: 'notif-7',
    type: 'deadline_reminder',
    priority: 'high',
    title: 'Deadline Reminder',
    message: 'Prior authorization PA-2024-001237 expires in 3 days. Submit renewal if needed.',
    timestamp: getTimestamp(420),
    read: false,
    actionUrl: ROUTES.PRIOR_AUTH,
    actionLabel: 'View Request',
    metadata: {
      requestId: 'PA-2024-001237',
    },
  },
  {
    id: 'notif-8',
    type: 'eligibility_failed',
    priority: 'high',
    title: 'Eligibility Verification Failed',
    message: 'Eligibility check failed for Jessica Martinez (P-12350) with Aetna. Please verify patient information.',
    timestamp: getTimestamp(480),
    read: false,
    actionUrl: ROUTES.PATIENT_HOME,
    actionState: PATIENT_NAV.eligibility,
    actionLabel: 'Retry Check',
    metadata: {
      patientName: 'Jessica Martinez',
      patientId: 'P-12350',
      payor: 'Aetna',
    },
  },
  {
    id: 'notif-9',
    type: 'system_alert',
    priority: 'low',
    title: 'System Maintenance Scheduled',
    message: 'Scheduled maintenance window: Sunday, 2:00 AM - 4:00 AM EST. Some services may be temporarily unavailable.',
    timestamp: getTimestamp(1440), // 24 hours ago
    read: true,
    metadata: {},
  },
  {
    id: 'notif-10',
    type: 'prior_auth_pending',
    priority: 'medium',
    title: 'Prior Authorization Pending Review',
    message: 'Prior authorization PA-2024-001238 for Robert Taylor (P-12351) is pending review by UnitedHealthcare.',
    timestamp: getTimestamp(2880), // 2 days ago
    read: true,
    actionUrl: ROUTES.PRIOR_AUTH,
    actionLabel: 'View Status',
    metadata: {
      patientName: 'Robert Taylor',
      patientId: 'P-12351',
      payor: 'UnitedHealthcare',
      requestId: 'PA-2024-001238',
    },
  },
]
