import { useEffect } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  isVisible: boolean
  onClose: () => void
  duration?: number
}

const Toast = ({
  message,
  type = 'success',
  isVisible,
  onClose,
  duration = 3000,
}: ToastProps) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  }

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
  }

  const Icon = icons[type]

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-in sm:left-auto sm:right-4 sm:max-w-md sm:w-full">
      <div
        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl ring-1 ring-black/5 backdrop-blur-sm ${typeStyles[type]} w-full min-w-0 max-w-md sm:min-w-[280px] transition-all duration-200`}
      >
        <Icon size={20} className={iconColors[type]} />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className={`${iconColors[type]} hover:opacity-70 transition-opacity`}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

export default Toast

