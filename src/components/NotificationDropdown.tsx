import { useState, useEffect, useRef } from 'react'
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
  X,
} from 'lucide-react'
import { Notification, NotificationType, NotificationPriority } from '../data/notificationData'
import { ROUTES } from '../routes/routeMap'

interface NotificationDropdownProps {
  notifications: Notification[]
  isLoading?: boolean
  isOpen: boolean
  onClose: () => void
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
}

const NotificationDropdown = ({
  notifications,
  isLoading = false,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDropdownProps) => {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

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
    return `${diffDays}d ago`
  }

  const handleNotificationClick = (notification: Notification) => {
    onMarkAsRead(notification.id)
    if (notification.actionUrl) {
      navigate(notification.actionUrl, {
        state: notification.actionState,
      })
      onClose()
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read).slice(0, 5) // Show max 5 read

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1rem)] bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[min(24rem,70vh)] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-12 text-center">
            <p className="text-gray-500 text-sm">Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bell size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No notifications</p>
          </div>
        ) : (
          <>
            {/* Unread Notifications */}
            {unreadNotifications.length > 0 && (
              <div className="py-2">
                {unreadNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  const iconColor = getNotificationColor(notification.type, notification.priority)

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors relative"
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {getRelativeTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.actionLabel && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-primary-600 font-medium">
                              <span>{notification.actionLabel}</span>
                              <ChevronRight size={14} />
                            </div>
                          )}
                        </div>
                        {/* Unread indicator */}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-1/2 bg-primary-600 rounded-r"></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Read Notifications */}
            {readNotifications.length > 0 && (
              <div className="py-2 border-t border-gray-200">
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Earlier
                  </p>
                </div>
                {readNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  const iconColor = getNotificationColor(notification.type, notification.priority)

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center opacity-60`}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {getRelativeTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              navigate(ROUTES.NOTIFICATIONS)
              onClose()
            }}
            className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium text-center"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown

