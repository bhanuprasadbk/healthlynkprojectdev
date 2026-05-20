import {
  ButtonHTMLAttributes,
  type CSSProperties,
  ReactNode,
  useMemo,
} from 'react'
import { useTheme } from '../../contexts/ThemeContext'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  ...props
}: ButtonProps) => {
  const { theme } = useTheme()

  const primaryGlow = useMemo(
    () =>
      `0 0 0 1px color-mix(in srgb, ${theme.colors.buttonPrimary} 38%, transparent), 0 12px 40px -10px color-mix(in srgb, ${theme.colors.buttonPrimary} 52%, transparent)`,
    [theme.colors.buttonPrimary]
  )

  const baseStyles =
    'font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.buttonPrimary,
          color: '#ffffff',
          boxShadow: primaryGlow,
        }
      case 'secondary':
        return {
          backgroundColor: theme.colors.buttonSecondary,
          color: theme.colors.textPrimary,
          boxShadow: 'none',
        }
      case 'danger':
        return {
          backgroundColor: '#dc2626',
          color: '#ffffff',
          boxShadow: 'none',
        }
      case 'outline':
        return {
          border: `2px solid ${theme.colors.primary}`,
          color: theme.colors.textPrimary,
          backgroundColor: 'transparent',
          boxShadow: 'none',
        }
      default:
        return {}
    }
  }

  const getHoverStyles = () => {
    switch (variant) {
      case 'primary':
        return theme.colors.buttonPrimaryHover
      case 'secondary':
        return theme.colors.buttonSecondaryHover
      case 'danger':
        return '#b91c1c'
      case 'outline':
        return theme.colors.primaryLight
      default:
        return ''
    }
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variantStyles = getVariantStyles()
  const hoverColor = getHoverStyles()

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizes[size]} ${className}`}
      style={{
        ...variantStyles,
        ...(variant === 'primary' || variant === 'outline'
          ? ({
              ['--tw-ring-color' as string]: theme.colors.primary,
            } as CSSProperties)
          : {}),
      }}
      onMouseEnter={(e) => {
        if (!disabled && hoverColor) {
          e.currentTarget.style.backgroundColor = hoverColor
          if (variant === 'primary') {
            e.currentTarget.style.boxShadow = `0 0 0 1px color-mix(in srgb, ${hoverColor} 42%, transparent), 0 14px 44px -10px color-mix(in srgb, ${hoverColor} 58%, transparent)`
          }
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.backgroundColor =
            (variantStyles.backgroundColor as string) ?? theme.colors.buttonPrimary
          e.currentTarget.style.boxShadow = primaryGlow
        } else if (variantStyles.backgroundColor) {
          e.currentTarget.style.backgroundColor = variantStyles.backgroundColor as string
        } else {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
