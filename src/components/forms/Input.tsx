import { InputHTMLAttributes, type CSSProperties } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  name: string
  error?: string
  required?: boolean
}

const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  onBlur,
  ...props
}: InputProps) => {
  const { theme } = useTheme()
  
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="mb-2 block text-sm font-medium"
          style={{ color: theme.colors.textSecondary }}
        >
          {label}
          {required && (
            <span className="ml-1" style={{ color: theme.colors.formRequiredColor }}>
              *
            </span>
          )}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-xl border px-3 py-2 transition-all duration-200 placeholder-[color:var(--input-placeholder)] focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : ''
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
        style={{
          backgroundColor: disabled
            ? theme.colors.buttonSecondary
            : theme.colors.inputBackground,
          borderColor: error ? '#fca5a5' : theme.colors.border,
          color: theme.colors.textPrimary,
          ['--input-placeholder' as string]: theme.colors.inputPlaceholder,
          ...(error
            ? {}
            : ({
                '--tw-ring-color': theme.colors.primary,
              } as CSSProperties)),
        }}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = theme.colors.primary
            e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primaryLight}`
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = theme.colors.border
            e.currentTarget.style.boxShadow = 'none'
          }
          onBlur?.(e)
        }}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export default Input

