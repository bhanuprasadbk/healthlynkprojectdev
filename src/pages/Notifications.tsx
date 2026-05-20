import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Info,
  ChevronRight,
  Search,
  Filter,
  Check,
  X,
  CheckCheck,
} from 'lucide-react'
import { Notification, NotificationType, NotificationPriority } from '../data/notificationData'
import {
  fetchNotifications,
  markAllNotificationsRead,
} from '../services/notificationsService'
import { useAuthenticatedApiReady } from '../hooks/useAuthenticatedApiReady'
import { useToast } from '../contexts/ToastContext'

const Notifications = () => {
  const navigate = useNavigate()
  const apiReady = useAuthenticatedApiReady()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all')
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)

  useEffect(() => {
    if (!apiReady) return

    let cancelled = false
    const loadNotifications = async () => {
      setIsLoadingNotifications(true)
      try {
        const list = await fetchNotifications()
        if (!cancelled) setNotifications(list)
      } catch (error) {
        if (!cancelled) {
          setNotifications([])
          showToast(error instanceof Error ? error.message : 'Unable to load notifications.', {
            type: 'error',
            duration: 5000,
          })
        }
      } finally {
        if (!cancelled) setIsLoadingNotifications(false)
      }
    }

    loadNotifications()
    return () => {
      cancelled = true
    }
  }, [apiReady, showToast])

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'prior_auth_approved':
        return CheckCircle2
      case 'prior_auth_denied':
        return XCircle
      case 'prior_auth_pending':
        return Clock
      case 'eligibility_complete':
        return CheckCircle2
      case 'eligibility_failed':
        return AlertCircle
      case 'coverage_change':
        return AlertCircle
      case 'patient_intake':
        return User
      case 'document_required':
        return FileText
      case 'deadline_reminder':
        return Calendar
      case 'system_alert':
        return Info
      default:
        return Bell
    }
  }

  const getNotificationColor = (type: NotificationType, priority: NotificationPriority) => {
    if (priority === 'high') {
      if (type === 'prior_auth_approved' || type === 'eligibility_complete') {
        return 'bg-green-100 text-green-600'
      }
      return 'bg-red-100 text-red-600'
    }
    if (priority === 'medium') {
      return 'bg-yellow-100 text-yellow-600'
    }
    return 'bg-blue-100 text-blue-600'
  }

  const getPriorityBadgeColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'low':
        return 'bg-blue-100 text-blue-700'
    }
  }

  const getTypeLabel = (type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      prior_auth_approved: 'Prior Auth Approved',
      prior_auth_denied: 'Prior Auth Denied',
      prior_auth_pending: 'Prior Auth Pending',
      eligibility_complete: 'Eligibility Complete',
      eligibility_failed: 'Eligibility Failed',
      coverage_change: 'Coverage Change',
      patient_intake: 'Patient Intake',
      document_required: 'Documents Required',
      deadline_reminder: 'Deadline Reminder',
      system_alert: 'System Alert',
    }
    return labels[type]
  }

  const getRelativeTime = (timestamp: string): string => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths}mo ago`
  }

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const handleMarkAsUnread = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: false } : notif
      )
    )
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true)
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
      showToast('All notifications marked as read.', { type: 'success' })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to mark all as read.', {
        type: 'error',
        duration: 5000,
      })
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    if (notification.actionUrl) {
      navigate(notification.actionUrl, {
        state: notification.actionState,
      })
    }
  }

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query) ||
          notification.metadata?.patientName?.toLowerCase().includes(query) ||
          notification.metadata?.requestId?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Type filter
      if (filterType !== 'all' && notification.type !== filterType) {
        return false
      }

      // Priority filter
      if (filterPriority !== 'all' && notification.priority !== filterPriority) {
        return false
      }

      // Read status filter
      if (filterRead === 'read' && !notification.read) return false
      if (filterRead === 'unread' && notification.read) return false

      return true
    })
  }, [notifications, searchQuery, filterType, filterPriority, filterRead])

  // Group notifications by read status
  const unreadNotifications = filteredNotifications.filter((n) => !n.read)
  const readNotifications = filteredNotifications.filter((n) => n.read)

  const unreadCount = notifications.filter((n) => !n.read).length
  const totalCount = notifications.length

  const notificationTypes: NotificationType[] = [
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
  ]

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? (
                  <span>
                    You have <span className="font-semibold text-primary-600">{unreadCount}</span> unread
                    {unreadCount === 1 ? ' notification' : ' notifications'} out of {totalCount} total
                  </span>
                ) : (
                  <span>All caught up! No unread notifications.</span>
                )}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CheckCheck size={18} />
                <span>{isMarkingAllRead ? 'Marking...' : 'Mark all as read'}</span>
              </button>
            )}
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as NotificationType | 'all')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Types</option>
                    {notificationTypes.map((type) => (
                      <option key={type} value={type}>
                        {getTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={filterPriority}
                    onChange={(e) =>
                      setFilterPriority(e.target.value as NotificationPriority | 'all')
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Read Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filterRead}
                    onChange={(e) =>
                      setFilterRead(e.target.value as 'all' | 'read' | 'unread')
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoadingNotifications && (
            <div className="px-6 py-3 text-sm text-gray-500 border-b border-gray-200 bg-gray-50">
              Loading notifications...
            </div>
          )}
          {filteredNotifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Bell size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-500">
                {searchQuery || filterType !== 'all' || filterPriority !== 'all' || filterRead !== 'all'
                  ? 'Try adjusting your filters or search query.'
                  : 'You have no notifications at this time.'}
              </p>
            </div>
          ) : (
            <>
              {/* Unread Notifications */}
              {unreadNotifications.length > 0 && (
                <div className="border-b border-gray-200">
                  <div className="px-6 py-3 bg-primary-50 border-b border-primary-100">
                    <h2 className="text-sm font-semibold text-primary-900 uppercase tracking-wide">
                      Unread ({unreadNotifications.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {unreadNotifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type)
                      const iconColor = getNotificationColor(notification.type, notification.priority)

                      return (
                        <div
                          key={notification.id}
                          className="px-6 py-4 hover:bg-gray-50 transition-colors relative group"
                        >
                          <div className="flex gap-4">
                            <div
                              className={`flex-shrink-0 w-12 h-12 rounded-lg ${iconColor} flex items-center justify-center`}
                            >
                              <Icon size={24} />
                            </div>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base font-semibold text-gray-900">
                                      {notification.title}
                                    </h3>
                                    <span
                                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityBadgeColor(
                                        notification.priority
                                      )}`}
                                    >
                                      {notification.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                                  {notification.metadata && (
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                      {notification.metadata.patientName && (
                                        <span>Patient: {notification.metadata.patientName}</span>
                                      )}
                                      {notification.metadata.requestId && (
                                        <span>Request: {notification.metadata.requestId}</span>
                                      )}
                                      {notification.metadata.payor && (
                                        <span>Payor: {notification.metadata.payor}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start gap-2 flex-shrink-0">
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {getRelativeTime(notification.timestamp)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMarkAsRead(notification.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity"
                                    title="Mark as read"
                                  >
                                    <Check size={16} className="text-gray-500" />
                                  </button>
                                </div>
                              </div>
                              {notification.actionLabel && (
                                <div
                                  className="flex items-center gap-1 text-sm text-primary-600 font-medium mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (notification.actionUrl) {
                                      navigate(notification.actionUrl, {
                                        state: notification.actionState,
                                      })
                                    }
                                  }}
                                >
                                  <span>{notification.actionLabel}</span>
                                  <ChevronRight size={16} />
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Unread indicator */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600"></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Read Notifications */}
              {readNotifications.length > 0 && (
                <div>
                  {unreadNotifications.length > 0 && (
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Read ({readNotifications.length})
                      </h2>
                    </div>
                  )}
                  <div className="divide-y divide-gray-100">
                    {readNotifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type)
                      const iconColor = getNotificationColor(notification.type, notification.priority)

                      return (
                        <div
                          key={notification.id}
                          className="px-6 py-4 hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex gap-4">
                            <div
                              className={`flex-shrink-0 w-12 h-12 rounded-lg ${iconColor} flex items-center justify-center opacity-60`}
                            >
                              <Icon size={24} />
                            </div>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base font-medium text-gray-700">
                                      {notification.title}
                                    </h3>
                                    <span
                                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityBadgeColor(
                                        notification.priority
                                      )}`}
                                    >
                                      {notification.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 mb-2">{notification.message}</p>
                                  {notification.metadata && (
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                                      {notification.metadata.patientName && (
                                        <span>Patient: {notification.metadata.patientName}</span>
                                      )}
                                      {notification.metadata.requestId && (
                                        <span>Request: {notification.metadata.requestId}</span>
                                      )}
                                      {notification.metadata.payor && (
                                        <span>Payor: {notification.metadata.payor}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start gap-2 flex-shrink-0">
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {getRelativeTime(notification.timestamp)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMarkAsUnread(notification.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity"
                                    title="Mark as unread"
                                  >
                                    <X size={16} className="text-gray-500" />
                                  </button>
                                </div>
                              </div>
                              {notification.actionLabel && (
                                <div
                                  className="flex items-center gap-1 text-sm text-primary-600 font-medium mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (notification.actionUrl) {
                                      navigate(notification.actionUrl, {
                                        state: notification.actionState,
                                      })
                                    }
                                  }}
                                >
                                  <span>{notification.actionLabel}</span>
                                  <ChevronRight size={16} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Notifications

