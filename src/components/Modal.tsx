import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) => {
  const { theme } = useTheme()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 py-8">
        <div
          className={`relative w-full max-h-[min(90vh,48rem)] overflow-hidden rounded-xl shadow-xl flex flex-col ${sizes[size]} transform transition-all`}
          style={{
            backgroundColor: theme.colors.cardBackground,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 shrink-0"
            style={{ borderBottom: `1px solid ${theme.colors.border}` }}
          >
            <h3 
              className="text-base sm:text-lg font-semibold pr-2 min-w-0"
              style={{ color: theme.colors.textPrimary }}
            >
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="transition-colors"
                style={{ color: theme.colors.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.colors.textPrimary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.textSecondary
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 py-4 overflow-y-auto min-h-0">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default Modal

