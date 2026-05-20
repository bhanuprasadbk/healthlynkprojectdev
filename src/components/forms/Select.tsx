import { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { surfacePrefersDarkColorScheme } from '../../theme/surfaceColorScheme'

interface Option {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  name: string
  options?: Option[]
  error?: string
  required?: boolean
  placeholder?: string
}

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  ...props
}: SelectProps) => {
  const { theme } = useTheme()
  const { colors } = theme
  const displayValue = value === undefined || value === '' ? '' : String(value)
  const fieldColor = disabled
    ? displayValue
      ? colors.textPrimary
      : colors.textSecondary
    : displayValue
      ? colors.textPrimary
      : colors.tableHeaderText

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
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
      )}
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border px-3 py-2 pr-10 transition-all duration-200 focus:outline-none ${
            disabled ? 'cursor-not-allowed opacity-60' : ''
          }`}
          style={{
            backgroundColor: disabled
              ? colors.buttonSecondary
              : colors.inputBackground,
            borderColor: error ? '#fca5a5' : colors.border,
            color: fieldColor,
            colorScheme: surfacePrefersDarkColorScheme(colors.inputBackground)
              ? 'dark'
              : 'light',
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
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transform"
          style={{ color: colors.textSecondary }}
          aria-hidden
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default Select
