import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import Toast from '../components/Toast'

type ToastType = 'success' | 'error' | 'info'

type ToastOptions = {
  type?: ToastType
  duration?: number
}

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [type, setType] = useState<ToastType>('info')
  const [duration, setDuration] = useState(3000)

  const showToast = useCallback((nextMessage: string, options?: ToastOptions) => {
    setMessage(nextMessage)
    setType(options?.type ?? 'info')
    setDuration(options?.duration ?? 3000)
    setIsVisible(true)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        message={message}
        type={type}
        isVisible={isVisible}
        onClose={() => setIsVisible(false)}
        duration={duration}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
