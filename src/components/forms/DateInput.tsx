import { InputHTMLAttributes } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { surfacePrefersDarkColorScheme } from '../../theme/surfaceColorScheme'

type DateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'name'
> & {
  label: string
  name: string
  error?: string
  required?: boolean
}

const DateInput = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  id,
  className = '',
  onBlur,
  ...props
}: DateInputProps) => {
  const { theme } = useTheme()
  const { colors } = theme
  const inputId = id ?? name
  const darkSurface = surfacePrefersDarkColorScheme(colors.inputBackground)

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-medium"
        style={{ color: colors.textSecondary }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: colors.formRequiredColor }}>
            *
          </span>
        )}
      </label>
      <input
        type="date"
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full rounded-xl border px-3 py-2 transition-all duration-200 focus:outline-none ${
          darkSurface ? 'date-input-dark-surfaced' : ''
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
        style={{
          backgroundColor: disabled
            ? colors.buttonSecondary
            : colors.inputBackground,
          borderColor: error ? '#fca5a5' : colors.border,
          color: colors.textPrimary,
          /* Native picker glyph paints for light scheme; invert (see index.css) on dark surfaces only */
          colorScheme: 'light',
        }}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = colors.primary
            e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.primaryLight}`
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.boxShadow = 'none'
          }
          onBlur?.(e)
        }}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default DateInput
