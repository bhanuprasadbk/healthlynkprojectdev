import { useAuth } from '../contexts/AuthContext'

/**
 * True when the user is signed in and the httpOnly JWT cookie session is ready.
 * Use before calling protected APIs — do not use mock/dummy data as a fallback.
 */
export function useAuthenticatedApiReady(): boolean {
  const { user, isApiAuthReady, isLoading } = useAuth()
  return !isLoading && !!user?.id && isApiAuthReady
}
