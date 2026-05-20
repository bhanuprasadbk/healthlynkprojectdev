import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  User,
  Building2,
  Code,
  FilePlus,
  FileCheck,
  SlidersHorizontal,
  MessageSquare,
  MessageCircle,
  Bot,
  LogOut,
  LucideIcon,
  Stethoscope,
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import type { Notification } from '../data/notificationData'
import {
  fetchNotifications,
  markAllNotificationsRead,
} from '../services/notificationsService'
import { useAuthenticatedApiReady } from '../hooks/useAuthenticatedApiReady'
import { useToast } from '../contexts/ToastContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../routes/routeMap'

interface MenuLeaf {
  kind: 'link'
  key: string
  icon: LucideIcon
  label: string
  path: string
}

interface MenuSection {
  kind: 'section'
  key: string
  icon: LucideIcon
  label: string
  children: Array<{
    key: string
    icon: LucideIcon
    label: string
    path: string
  }>
}

type MenuEntry = MenuLeaf | MenuSection

function isSidebarLinkActive(
  pathname: string,
  path: string
): boolean {
  return pathname === path
}

const PrivateLayout = () => {
  const { theme } = useTheme()
  const { showToast } = useToast()
  const { user, logout } = useAuth()
  const apiReady = useAuthenticatedApiReady()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [providerSectionOpen, setProviderSectionOpen] = useState(true)
  const location = useLocation()

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!apiReady) return

    let cancelled = false
    const loadNotifications = async () => {
      setNotificationsLoading(true)
      try {
        const list = await fetchNotifications()
        if (!cancelled) setNotifications(list)
      } catch (error) {
        if (!cancelled) {
          setNotifications([])
          showToast(
            error instanceof Error ? error.message : 'Unable to load notifications.',
            { type: 'error', duration: 5000 }
          )
        }
      } finally {
        if (!cancelled) setNotificationsLoading(false)
      }
    }

    loadNotifications()
    return () => {
      cancelled = true
    }
  }, [apiReady, showToast])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const handleMarkAllAsRead = async () => {
    if (!apiReady) return
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to mark all notifications as read.', {
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const menuEntries: MenuEntry[] = [
    {
      kind: 'link',
      key: 'dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: ROUTES.DASHBOARD,
    },
    {
      kind: 'link',
      key: 'patient-intake',
      icon: FilePlus,
      label: 'Patient Intake',
      path: ROUTES.PROVIDER_PATIENT_INTAKE,
    },
    {
      kind: 'link',
      key: 'eligibility-result',
      icon: FileCheck,
      label: 'Eligibility Result',
      path: ROUTES.PROVIDER_ELIGIBILITY_RESULT,
    },
    { kind: 'link', key: 'prior-auth', icon: FileText, label: 'Prior Auth', path: ROUTES.PRIOR_AUTH },
    {
      kind: 'link',
      key: 'payors',
      icon: Building2,
      label: 'Payor Configuration',
      path: ROUTES.PAYORS,
    },
    {
      kind: 'section',
      key: 'provider-configuration',
      icon: Stethoscope,
      label: 'Provider configuration',
      children: [
        {
          key: 'npi-location',
          icon: MapPin,
          label: 'NPI & location',
          path: ROUTES.PROVIDER_NPI_LOCATION,
        },
        {
          key: 'cpt-hcpc',
          icon: Code,
          label: 'CPT / HCPC',
          path: ROUTES.CPT_HCPC,
        },
      ],
    },
    { kind: 'link', key: 'chat', icon: MessageSquare, label: 'Lynk AI Chat', path: ROUTES.CHAT },
    { kind: 'link', key: 'agents', icon: Bot, label: 'AI Agents', path: ROUTES.AGENTS },
    { kind: 'link', key: 'settings', icon: Settings, label: 'Settings', path: ROUTES.SETTINGS },
    {
      kind: 'link',
      key: 'dashboard-settings',
      icon: SlidersHorizontal,
      label: 'Dashboard Settings',
      path: ROUTES.DASHBOARD_SETTINGS,
    },
  ]

  useEffect(() => {
    if (
      location.pathname === ROUTES.PROVIDER_NPI_LOCATION ||
      location.pathname === ROUTES.CPT_HCPC
    ) {
      setProviderSectionOpen(true)
    }
  }, [location.pathname])

  return (
    <div className="flex h-screen min-h-0" style={{ backgroundColor: theme.colors.background }}>
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 ease-out lg:static lg:z-auto lg:translate-x-0
          w-[min(16rem,85vw)] max-w-[85vw] ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{
          backgroundColor: theme.colors.sidebarBackground,
          borderRight: `1px solid ${theme.colors.sidebarBorder}`,
        }}
      >
        <div
          className="h-16 flex items-center justify-between px-4"
          style={{ borderBottom: `1px solid ${theme.colors.sidebarBorder}` }}
        >
          {(sidebarOpen || mobileNavOpen) && (
            <div className="flex items-center gap-3 min-w-0">
              {theme.logo ? (
                <img
                  src={theme.logo}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <h1
                  className="text-xl font-bold"
                  style={{ color: theme.colors.primary }}
                >
                  Health Lynk
                </h1>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (mobileNavOpen) setMobileNavOpen(false)
              else setSidebarOpen(!sidebarOpen)
            }}
            className="p-2 rounded-lg transition-colors shrink-0"
            style={{
              color: theme.colors.textPrimary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.primaryLight
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label={mobileNavOpen || sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {mobileNavOpen || sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
          {menuEntries.map((entry) => {
            const showLabels = sidebarOpen || mobileNavOpen

            if (entry.kind === 'link') {
              const Icon = entry.icon
              const isActive = isSidebarLinkActive(location.pathname, entry.path)
              return (
                <Link
                  key={entry.key}
                  to={entry.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group"
                  style={{
                    backgroundColor: isActive ? theme.colors.sidebarActiveBackground : 'transparent',
                    color: isActive ? theme.colors.sidebarActiveText : theme.colors.sidebarText,
                    fontWeight: isActive ? '500' : 'normal',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = theme.colors.sidebarHoverBackground
                      e.currentTarget.style.color = theme.colors.sidebarHoverText
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = theme.colors.sidebarText
                    }
                  }}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {showLabels && (
                    <span className="text-sm font-medium">{entry.label}</span>
                  )}
                </Link>
              )
            }

            const section = entry
            const SectionIcon = section.icon
            const childLinks = section.children.map((child) => {
              const ChildIcon = child.icon
              const isActive = isSidebarLinkActive(location.pathname, child.path)
              return (
                <Link
                  key={child.key}
                  to={child.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                    showLabels ? 'ml-2 pl-4' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? theme.colors.sidebarActiveBackground : 'transparent',
                    color: isActive ? theme.colors.sidebarActiveText : theme.colors.sidebarText,
                    fontWeight: isActive ? '500' : 'normal',
                    ...(showLabels
                      ? {
                          borderLeftWidth: 1,
                          borderLeftStyle: 'solid' as const,
                          borderLeftColor: theme.colors.sidebarBorder,
                        }
                      : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = theme.colors.sidebarHoverBackground
                      e.currentTarget.style.color = theme.colors.sidebarHoverText
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = theme.colors.sidebarText
                    }
                  }}
                >
                  <ChildIcon size={20} className="flex-shrink-0" />
                  {showLabels && (
                    <span className="text-sm font-medium">{child.label}</span>
                  )}
                </Link>
              )
            })

            if (!showLabels) {
              return (
                <div key={section.key} className="space-y-1">
                  {childLinks}
                </div>
              )
            }

            return (
              <div key={section.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setProviderSectionOpen((o) => !o)}
                  className="flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                  style={{
                    color: theme.colors.sidebarText,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.sidebarHoverBackground
                    e.currentTarget.style.color = theme.colors.sidebarHoverText
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = theme.colors.sidebarText
                  }}
                  aria-expanded={providerSectionOpen}
                >
                  <SectionIcon size={20} className="flex-shrink-0" />
                  <span className="text-sm font-medium flex-1">{section.label}</span>
                  {providerSectionOpen ? (
                    <ChevronDown size={18} className="shrink-0 opacity-70" aria-hidden />
                  ) : (
                    <ChevronRight size={18} className="shrink-0 opacity-70" aria-hidden />
                  )}
                </button>
                {providerSectionOpen && childLinks}
              </div>
            )
          })}
        </nav>

        <div
          className="p-4"
          style={{ borderTop: `1px solid ${theme.colors.sidebarBorder}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.colors.primaryLight }}
            >
              <User size={16} style={{ color: theme.colors.primary }} />
            </div>
            {(sidebarOpen || mobileNavOpen) && (
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: theme.colors.sidebarText }}
                >
                  {user?.displayName ?? user?.username ?? 'User'}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {user?.role ?? 'Caregiver'}
                </p>
              </div>
            )}
            {(sidebarOpen || mobileNavOpen) && (
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-lg p-2 transition-colors"
                style={{ color: theme.colors.textSecondary }}
                title="Log out"
                aria-label="Log out"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primaryLight
                  e.currentTarget.style.color = theme.colors.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = theme.colors.textSecondary
                }}
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-16 shrink-0 min-w-0 items-center justify-between gap-3 px-4 sm:px-6"
          style={{
            backgroundColor: theme.colors.navHeaderBackground,
            borderBottom: `1px solid ${theme.colors.navHeaderBorder}`,
          }}
        >
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              type="button"
              className="lg:hidden shrink-0 -ml-1 rounded-lg p-2"
              style={{ color: theme.colors.navHeaderText }}
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 transform"
                style={{ color: theme.colors.navHeaderText }}
              />
              <input
                type="text"
                placeholder="Search..."
                className="w-full min-w-0 rounded-lg py-2 pl-10 pr-4 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 sm:text-base"
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.navHeaderText,
                }}
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
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-lg p-2 transition-colors"
                style={{ color: theme.colors.navHeaderText }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primaryLight
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-medium rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown
                notifications={notifications}
                isLoading={notificationsLoading}
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
              />
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <User size={18} className="text-white" />
            </div>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {location.pathname !== ROUTES.CHAT &&
        location.pathname !== ROUTES.PROVIDER_PATIENT_INTAKE &&
        location.pathname !== ROUTES.PROVIDER_ELIGIBILITY_RESULT && (
        <Link
          to={ROUTES.CHAT}
          className="fixed bottom-4 right-4 z-[100] flex h-12 w-12 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            backgroundColor: theme.colors.primary,
            color: '#ffffff',
            boxShadow: `0 10px 28px -4px ${theme.colors.primary}66`,
            outlineColor: theme.colors.primary,
          }}
          aria-label="Open Lynk AI Chat"
          title="Lynk AI Chat"
        >
          <MessageCircle size={28} strokeWidth={2} className="drop-shadow-sm" />
        </Link>
      )}
    </div>
  )
}

export default PrivateLayout
