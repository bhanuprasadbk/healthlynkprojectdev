import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { PATIENT_FLOW_COGNI_COLORS } from '../theme/patientFlowCogniPalette'

export interface ThemeColors {
  // Primary Colors
  primary: string
  primaryHover: string
  primaryLight: string
  
  // Button Colors
  buttonPrimary: string
  buttonPrimaryHover: string
  buttonSecondary: string
  buttonSecondaryHover: string
  
  // Card Colors
  cardBackground: string
  cardBorder: string
  
  // Text Colors
  textPrimary: string
  textSecondary: string
  /** Native placeholder / empty-select hint (distinct from label tone on dark UIs) */
  inputPlaceholder: string
  /** Required field asterisk on form labels */
  formRequiredColor: string

  // Form control surface (often slightly above card on dark themes)
  inputBackground: string

  // Background Colors
  background: string
  sidebarBackground: string
  border: string
  
  // Table Colors
  tableHeaderBackground: string
  tableHeaderText: string
  tableRowBackground: string
  tableRowHover: string
  tableBorder: string
  
  // Navigation Header Colors
  navHeaderBackground: string
  navHeaderText: string
  navHeaderBorder: string
  
  // Sidebar Colors
  sidebarActiveBackground: string
  sidebarActiveText: string
  sidebarHoverBackground: string
  sidebarHoverText: string
  sidebarText: string
  sidebarBorder: string
}

export interface ThemeConfig {
  isDarkMode: boolean
  logo?: string // Base64 or URL
  colors: ThemeColors
  /** Increment when default light palette changes; triggers one-time refresh for light mode */
  themePaletteVersion?: number
}

const defaultLightColors: ThemeColors = {
  primary: '#0ea5e9',
  primaryHover: '#0284c7',
  primaryLight: '#f0f9ff',

  buttonPrimary: '#0ea5e9',
  buttonPrimaryHover: '#0284c7',
  buttonSecondary: '#f1f5f9',
  buttonSecondaryHover: '#e2e8f0',

  cardBackground: '#ffffff',
  cardBorder: '#e2e8f0',

  textPrimary: '#334155',
  textSecondary: '#64748b',
  inputPlaceholder: '#94a3b8',
  formRequiredColor: '#dc2626',
  inputBackground: '#ffffff',

  background: '#f8fafc',
  sidebarBackground: '#ffffff',
  border: '#e2e8f0',

  tableHeaderBackground: '#f8fafc',
  tableHeaderText: '#64748b',
  tableRowBackground: '#ffffff',
  tableRowHover: '#f1f5f9',
  tableBorder: '#e2e8f0',

  navHeaderBackground: '#ffffff',
  navHeaderText: '#334155',
  navHeaderBorder: '#e2e8f0',

  sidebarActiveBackground: '#e0f2fe',
  sidebarActiveText: '#0284c7',
  sidebarHoverBackground: '#f0f9ff',
  sidebarHoverText: '#0ea5e9',
  sidebarText: '#475569',
  sidebarBorder: '#e2e8f0',
}

const defaultDarkColors: ThemeColors = {
  // Primary Colors
  primary: '#38bdf8',
  primaryHover: '#0ea5e9',
  primaryLight: '#0c4a6e',
  
  // Button Colors
  buttonPrimary: '#38bdf8',
  buttonPrimaryHover: '#0ea5e9',
  buttonSecondary: '#374151',
  buttonSecondaryHover: '#4b5563',
  
  // Card Colors
  cardBackground: '#1f2937',
  cardBorder: '#374151',
  
  // Text Colors
  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  inputPlaceholder: '#6b7280',
  formRequiredColor: '#c084fc',
  inputBackground: '#374151',

  // Background Colors
  background: '#111827',
  sidebarBackground: '#1f2937',
  border: '#374151',

  // Table Colors
  tableHeaderBackground: '#1f2937',
  tableHeaderText: '#9ca3af',
  tableRowBackground: '#1f2937',
  tableRowHover: '#374151',
  tableBorder: '#374151',
  
  // Navigation Header Colors
  navHeaderBackground: '#1f2937',
  navHeaderText: '#f9fafb',
  navHeaderBorder: '#374151',
  
  // Sidebar Colors
  sidebarActiveBackground: '#0c4a6e',
  sidebarActiveText: '#38bdf8',
  sidebarHoverBackground: '#0c4a6e',
  sidebarHoverText: '#38bdf8',
  sidebarText: '#d1d5db',
  sidebarBorder: '#374151',
}

interface ThemeContextType {
  theme: ThemeConfig
  updateTheme: (updates: Partial<ThemeConfig>) => void
  toggleDarkMode: () => void
  updateColors: (colors: Partial<ThemeColors>) => void
  updateLogo: (logo: string) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/** When set (Patient Intake / Eligibility only), merges over stored theme for descendants — does not mutate :root. */
const ThemeColorOverrideContext = createContext<ThemeColors | null>(null)

function applyThemeColorsToElement(el: HTMLElement, colors: ThemeColors) {
  el.style.setProperty('--color-primary', colors.primary)
  el.style.setProperty('--color-primary-hover', colors.primaryHover)
  el.style.setProperty('--color-primary-light', colors.primaryLight)
  el.style.setProperty('--color-button-primary', colors.buttonPrimary)
  el.style.setProperty('--color-button-primary-hover', colors.buttonPrimaryHover)
  el.style.setProperty('--color-button-secondary', colors.buttonSecondary)
  el.style.setProperty('--color-button-secondary-hover', colors.buttonSecondaryHover)
  el.style.setProperty('--color-card-background', colors.cardBackground)
  el.style.setProperty('--color-card-border', colors.cardBorder)
  el.style.setProperty('--color-text-primary', colors.textPrimary)
  el.style.setProperty('--color-text-secondary', colors.textSecondary)
  el.style.setProperty('--color-input-placeholder', colors.inputPlaceholder)
  el.style.setProperty('--color-form-required', colors.formRequiredColor)
  el.style.setProperty('--color-input-background', colors.inputBackground)
  el.style.setProperty('--color-background', colors.background)
  el.style.setProperty('--color-sidebar-background', colors.sidebarBackground)
  el.style.setProperty('--color-border', colors.border)
  el.style.setProperty('--color-table-header-background', colors.tableHeaderBackground)
  el.style.setProperty('--color-table-header-text', colors.tableHeaderText)
  el.style.setProperty('--color-table-row-background', colors.tableRowBackground)
  el.style.setProperty('--color-table-row-hover', colors.tableRowHover)
  el.style.setProperty('--color-table-border', colors.tableBorder)
  el.style.setProperty('--color-nav-header-background', colors.navHeaderBackground)
  el.style.setProperty('--color-nav-header-text', colors.navHeaderText)
  el.style.setProperty('--color-nav-header-border', colors.navHeaderBorder)
  el.style.setProperty('--color-sidebar-active-background', colors.sidebarActiveBackground)
  el.style.setProperty('--color-sidebar-active-text', colors.sidebarActiveText)
  el.style.setProperty('--color-sidebar-hover-background', colors.sidebarHoverBackground)
  el.style.setProperty('--color-sidebar-hover-text', colors.sidebarHoverText)
  el.style.setProperty('--color-sidebar-text', colors.sidebarText)
  el.style.setProperty('--color-sidebar-border', colors.sidebarBorder)
}

/** Inline style object with the same CSS custom properties as `applyThemeColorsToElement`. */
export function themeColorsToReactStyle(colors: ThemeColors): CSSProperties {
  return {
    '--color-primary': colors.primary,
    '--color-primary-hover': colors.primaryHover,
    '--color-primary-light': colors.primaryLight,
    '--color-button-primary': colors.buttonPrimary,
    '--color-button-primary-hover': colors.buttonPrimaryHover,
    '--color-button-secondary': colors.buttonSecondary,
    '--color-button-secondary-hover': colors.buttonSecondaryHover,
    '--color-card-background': colors.cardBackground,
    '--color-card-border': colors.cardBorder,
    '--color-text-primary': colors.textPrimary,
    '--color-text-secondary': colors.textSecondary,
    '--color-input-placeholder': colors.inputPlaceholder,
    '--color-form-required': colors.formRequiredColor,
    '--color-input-background': colors.inputBackground,
    '--color-background': colors.background,
    '--color-sidebar-background': colors.sidebarBackground,
    '--color-border': colors.border,
    '--color-table-header-background': colors.tableHeaderBackground,
    '--color-table-header-text': colors.tableHeaderText,
    '--color-table-row-background': colors.tableRowBackground,
    '--color-table-row-hover': colors.tableRowHover,
    '--color-table-border': colors.tableBorder,
    '--color-nav-header-background': colors.navHeaderBackground,
    '--color-nav-header-text': colors.navHeaderText,
    '--color-nav-header-border': colors.navHeaderBorder,
    '--color-sidebar-active-background': colors.sidebarActiveBackground,
    '--color-sidebar-active-text': colors.sidebarActiveText,
    '--color-sidebar-hover-background': colors.sidebarHoverBackground,
    '--color-sidebar-hover-text': colors.sidebarHoverText,
    '--color-sidebar-text': colors.sidebarText,
    '--color-sidebar-border': colors.sidebarBorder,
  } as CSSProperties
}

const PATIENT_FLOW_COGNI_PAGE_STYLE = themeColorsToReactStyle(PATIENT_FLOW_COGNI_COLORS)

/**
 * Wrap Patient Intake / Eligibility result so Cogni palette applies only here (context + local CSS vars + Tailwind `dark:`).
 * Does not change global theme or the document root dark class.
 */
export function PatientFlowCogniThemeScope({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <ThemeColorOverrideContext.Provider value={PATIENT_FLOW_COGNI_COLORS}>
      <div
        className={`dark patient-flow-cogni-scope ${className}`.trim()}
        style={{ ...PATIENT_FLOW_COGNI_PAGE_STYLE, ...style }}
      >
        {children}
      </div>
    </ThemeColorOverrideContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  const colorOverride = useContext(ThemeColorOverrideContext)
  if (!colorOverride) {
    return context
  }
  return {
    ...context,
    theme: {
      ...context.theme,
      colors: { ...context.theme.colors, ...colorOverride },
    },
  }
}

const STORAGE_KEY = 'healthlynk-theme'
const THEME_PALETTE_VERSION = 5

const loadThemeFromStorage = (): ThemeConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as ThemeConfig
      const colors = parsed.colors
      if (!colors || typeof colors !== 'object') {
        return {
          isDarkMode: Boolean(parsed.isDarkMode),
          colors: parsed.isDarkMode ? defaultDarkColors : defaultLightColors,
          logo: parsed.logo,
          themePaletteVersion: THEME_PALETTE_VERSION,
        }
      }
      if (!parsed.isDarkMode && parsed.themePaletteVersion !== THEME_PALETTE_VERSION) {
        return {
          isDarkMode: false,
          colors: defaultLightColors,
          logo: parsed.logo,
          themePaletteVersion: THEME_PALETTE_VERSION,
        }
      }
      const fallback = parsed.isDarkMode ? defaultDarkColors : defaultLightColors
      return {
        ...parsed,
        colors: { ...fallback, ...colors },
        themePaletteVersion: parsed.themePaletteVersion ?? THEME_PALETTE_VERSION,
      }
    }
  } catch (error) {
    console.error('Failed to load theme from storage:', error)
  }
  return {
    isDarkMode: false,
    colors: defaultLightColors,
    themePaletteVersion: THEME_PALETTE_VERSION,
  }
}

const saveThemeToStorage = (theme: ThemeConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
  } catch (error) {
    console.error('Failed to save theme to storage:', error)
  }
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeConfig>(loadThemeFromStorage)

  useEffect(() => {
    saveThemeToStorage(theme)
    applyThemeToDocument(theme)
  }, [theme])

  const applyThemeToDocument = (themeConfig: ThemeConfig) => {
    const root = document.documentElement
    applyThemeColorsToElement(root, themeConfig.colors)

    // Apply dark mode class
    if (themeConfig.isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    setTheme((prev) => {
      const newTheme = { ...prev, ...updates, themePaletteVersion: THEME_PALETTE_VERSION }
      if (updates.isDarkMode !== undefined) {
        // When toggling dark mode, update colors to defaults if not customized
        newTheme.colors = updates.isDarkMode ? defaultDarkColors : defaultLightColors
      }
      return newTheme
    })
  }

  const toggleDarkMode = () => {
    setTheme((prev) => {
      const isDarkMode = !prev.isDarkMode
      return {
        ...prev,
        isDarkMode,
        colors: isDarkMode ? defaultDarkColors : defaultLightColors,
        themePaletteVersion: THEME_PALETTE_VERSION,
      }
    })
  }

  const updateColors = (colorUpdates: Partial<ThemeColors>) => {
    setTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, ...colorUpdates },
    }))
  }

  const updateLogo = (logo: string) => {
    setTheme((prev) => ({ ...prev, logo }))
  }

  const resetTheme = () => {
    const defaultTheme: ThemeConfig = {
      isDarkMode: false,
      colors: defaultLightColors,
      themePaletteVersion: THEME_PALETTE_VERSION,
    }
    setTheme(defaultTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
        toggleDarkMode,
        updateColors,
        updateLogo,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

