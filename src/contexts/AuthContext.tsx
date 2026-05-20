import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiJsonRequest, AUTH_EXPIRED_EVENT } from '../services/apiClient'
import { installAuthDebugGlobals, logPostLoginCookieChecklist } from '../services/authDebug'
import { clearLegacyAuthStorage } from '../services/authSession'

export type AuthUser = {
  id: string
  username: string
  displayName: string
  role: string
  isActive: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  /** True when session is loaded and httpOnly cookie auth can be used for API calls. */
  isApiAuthReady: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type ApiUserPayload = {
  id?: string
  username?: string
  display_name?: string
  role?: string
  is_active?: boolean
}

function mapApiUser(apiUser: ApiUserPayload): AuthUser | null {
  if (!apiUser?.id || !apiUser?.username) return null
  return {
    id: apiUser.id,
    username: apiUser.username,
    displayName: apiUser.display_name || apiUser.username,
    role: apiUser.role || 'user',
    isActive: Boolean(apiUser.is_active),
  }
}

/** Backend may return user fields on `data` or nested under `data.user` (same as login). */
function mapApiUserFromData(data: unknown): AuthUser | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (record.user && typeof record.user === 'object') {
    return mapApiUser(record.user as ApiUserPayload)
  }
  return mapApiUser(record as ApiUserPayload)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const parsed = await apiJsonRequest<{ data?: unknown }>(
        '/auth/me',
        { method: 'GET' },
        { suppressAuthExpiredOn401: true }
      )
      return mapApiUserFromData(parsed?.data)
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    installAuthDebugGlobals()
    clearLegacyAuthStorage()
    let cancelled = false
    ;(async () => {
      const sessionUser = await refreshSession()
      if (!cancelled) {
        setUser(sessionUser)
        setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshSession])

  const login = useCallback(async (username: string, password: string) => {
    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      return { ok: false, error: 'Enter username and password.' }
    }

    try {
      clearLegacyAuthStorage()
      const parsed = await apiJsonRequest<{
        data?: {
          user?: {
            display_name?: string
            id?: string
            is_active?: boolean
            role?: string
            username?: string
          }
        }
        message?: string
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      }, { suppressAuthExpiredOn401: true, debugLabel: 'login' })

      const nextUser = mapApiUserFromData(parsed?.data)
      if (!nextUser) {
        return { ok: false, error: parsed?.message || 'Sign in failed.' }
      }

      setUser(nextUser)
      logPostLoginCookieChecklist()
      return { ok: true }
    } catch (error) {
      if (error instanceof Error) {
        return { ok: false, error: error.message || 'Sign in failed.' }
      }
      return { ok: false, error: 'Unable to reach server. Please try again.' }
    }
  }, [])

  const logout = useCallback(async () => {
    clearLegacyAuthStorage()
    setUser(null)
    try {
      await apiJsonRequest('/auth/logout', { method: 'POST', body: '{}' })
    } catch {
      /* Session cleared locally; cookie may already be expired */
    }
  }, [])

  useEffect(() => {
    const onAuthExpired = () => {
      clearLegacyAuthStorage()
      setUser(null)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    }
  }, [])

  const isApiAuthReady = !isLoading && !!user

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      isApiAuthReady,
      login,
      logout,
    }),
    [user, isLoading, isApiAuthReady, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
