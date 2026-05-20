import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export type SearchableOption = {
  value: string
  label: string
  /**
   * Extra text included when filtering (e.g. payer / pVerify code).
   * When set, shown under the label so users can confirm the code.
   */
  searchText?: string
  /**
   * Extra text used only for matching (not shown). Use for synonyms, groups, categories, etc.
   */
  searchMatchOnly?: string
}

type SearchableSelectProps = {
  label?: string
  name: string
  value: string
  options: SearchableOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  /** Shown inside the search input when the list is open */
  searchPlaceholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  /** Message when filter returns zero options */
  emptyMessage?: string
}

export default function SearchableSelect({
  label,
  name,
  value,
  options,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  error,
  required = false,
  disabled = false,
  emptyMessage = 'No matches',
}: SearchableSelectProps) {
  const { theme } = useTheme()
  const { colors } = theme
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = useMemo(() => {
    const o = options.find((x) => x.value === value)
    return o?.label ?? ''
  }, [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      const hay = [o.label, o.value, o.searchText ?? '', o.searchMatchOnly ?? '']
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const borderColor = error ? '#fca5a5' : open ? colors.primary : colors.border
  const rowHoverBg = colors.tableRowHover
  const selectedRowBg = `color-mix(in srgb, ${colors.primary} 18%, ${colors.inputBackground})`

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label
          htmlFor={`${name}-trigger`}
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
        <div
          className={`flex items-stretch rounded-xl border transition-colors ${
            disabled ? 'cursor-not-allowed opacity-60' : ''
          }`}
          style={{
            backgroundColor: disabled
              ? colors.buttonSecondary
              : colors.inputBackground,
            borderColor,
            boxShadow:
              open && !error
                ? `0 0 0 2px ${colors.primaryLight}`
                : undefined,
          }}
        >
          <button
            type="button"
            id={`${name}-trigger`}
            disabled={disabled}
            onClick={() => !disabled && setOpen((o) => !o)}
            className="min-w-0 flex-1 rounded-l-lg px-3 py-2 text-left text-sm focus:outline-none"
            style={{
              color: disabled
                ? colors.textSecondary
                : selectedLabel
                  ? colors.textPrimary
                  : colors.inputPlaceholder,
            }}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="block truncate">
              {disabled ? placeholder : selectedLabel || placeholder}
            </span>
          </button>
          {value && !disabled && (
            <button
              type="button"
              className="shrink-0 rounded-none border-l px-2 focus:outline-none"
              style={{
                borderColor: colors.border,
                color: colors.textSecondary,
              }}
              aria-label="Clear selection"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = rowHoverBg
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              onClick={() => {
                onValueChange('')
                setOpen(false)
                setQuery('')
              }}
            >
              <X size={16} className="mx-auto" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            className="shrink-0 rounded-r-lg border-l px-2 focus:outline-none disabled:opacity-50"
            style={{
              borderColor: colors.border,
              color: colors.textSecondary,
            }}
            aria-label={open ? 'Close list' : 'Open list'}
            onMouseEnter={(e) => {
              if (!disabled)
                e.currentTarget.style.backgroundColor = rowHoverBg
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onClick={() => !disabled && setOpen((o) => !o)}
          >
            <ChevronDown
              size={18}
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {open && !disabled && (
          <div
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-lg"
            style={{
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              boxShadow: '0 16px 40px -12px rgba(0,0,0,0.45)',
            }}
            role="listbox"
          >
            <div
              className="flex items-center gap-2 border-b px-2 py-2"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.tableHeaderBackground,
                ['--search-placeholder' as string]: colors.inputPlaceholder,
              }}
            >
              <Search
                size={16}
                className="shrink-0"
                style={{ color: colors.textSecondary }}
                aria-hidden
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false)
                    setQuery('')
                  }
                }}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm placeholder-[color:var(--search-placeholder)] focus:outline-none"
                style={{
                  color: colors.textPrimary,
                }}
                aria-autocomplete="list"
              />
            </div>
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li
                  className="px-3 py-2 text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {emptyMessage}
                </li>
              ) : (
                filtered.map((opt) => (
                  <li key={`${opt.value}-${opt.label}-${opt.searchText ?? ''}`}>
                    <button
                      type="button"
                      role="option"
                      className="w-full px-3 py-2 text-left text-sm focus:outline-none"
                      style={{
                        backgroundColor:
                          value === opt.value ? selectedRowBg : 'transparent',
                        color: colors.textPrimary,
                        fontWeight: value === opt.value ? 600 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (value !== opt.value)
                          e.currentTarget.style.backgroundColor = rowHoverBg
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          value === opt.value ? selectedRowBg : 'transparent'
                      }}
                      onClick={() => {
                        onValueChange(opt.value)
                        setOpen(false)
                        setQuery('')
                      }}
                    >
                      <span className="block">{opt.label}</span>
                      {opt.searchText ? (
                        <span
                          className="mt-0.5 block font-mono text-xs tabular-nums"
                          style={{ color: colors.textSecondary }}
                        >
                          {opt.searchText}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
