import type { ThemeColors } from '../contexts/ThemeContext'

/**
 * Shared navy–violet surfaces for Patient Intake / Eligibility (subscriber-style card ref:
 * card ~#1a1625, fields ~#252131, labels ~#a0a0b0, placeholders ~#5a5a6a, required * ~#9d50bb).
 */
export const PATIENT_FLOW_COGNI_COLORS: ThemeColors = {
  primary: '#8B5CF6',
  primaryHover: '#7C3AED',
  primaryLight: 'rgba(139, 92, 246, 0.2)',

  buttonPrimary: '#8B5CF6',
  buttonPrimaryHover: '#7C3AED',
  buttonSecondary: '#252131',
  buttonSecondaryHover: '#2e283c',

  cardBackground: '#1a1625',
  cardBorder: '#2e2640',

  textPrimary: '#ffffff',
  textSecondary: '#a0a0b0',
  inputPlaceholder: '#5a5a6a',
  formRequiredColor: '#9d50bb',
  inputBackground: '#252131',

  background: '#0a0612',
  sidebarBackground: '#1a1625',
  border: '#3d3552',

  tableHeaderBackground: '#221d32',
  tableHeaderText: '#b8a8d4',
  tableRowBackground: '#1a1625',
  tableRowHover: '#252131',
  tableBorder: '#2e2640',

  navHeaderBackground: '#1f1139',
  navHeaderText: '#ffffff',
  navHeaderBorder: '#2e2640',

  sidebarActiveBackground: 'rgba(139, 92, 246, 0.22)',
  sidebarActiveText: '#ede9fe',
  sidebarHoverBackground: 'rgba(139, 92, 246, 0.12)',
  sidebarHoverText: '#ddd6fe',
  sidebarText: '#a0a0b0',
  sidebarBorder: '#2e2640',
}
