import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react'
import { eligibilityChecks } from '../data/mockData'
import { mockNotifications } from '../data/notificationData'
import { initialCptHcpcCodes } from '../data/cptHcpcData'
import { initialPayors } from '../data/payorData'
import { repairsiqChartSeriesColors, repairsiqReferencePalette } from '../theme/repairsiqReferencePalette'
import { deleteDashboardBackup as deleteDashboardBackupApi } from '../services/dashboardSettingsService'

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'donut' | 'radar' | 'radialBar' | 'treemap' | 'horizontalBar' | 'stat-card'

export type DataSource =
  | 'eligibility-by-status'
  | 'eligibility-by-payor'
  | 'eligibility-by-service'
  | 'eligibility-over-time'
  | 'coverage-status'
  | 'notifications-by-type'
  | 'notifications-by-priority'
  | 'cpt-hcpc-by-category'
  | 'cpt-hcpc-by-service'
  | 'auth-required-distribution'
  | 'payor-status'
  | 'denial-reasons'
  | 'monthly-check-volume'
  | 'patient-age-distribution'
  | 'top-procedures'
  | 'payor-response-time'
  | 'service-cost-comparison'
  | 'stat-total-patients'
  | 'stat-eligibility-today'
  | 'stat-pending-auth'
  | 'stat-approved-auth'

export interface DashboardWidget {
  id: string
  title: string
  type: ChartType
  dataSource: DataSource
  visible: boolean
  order: number
  size: 'small' | 'medium' | 'large' | 'full'
  /** When set (4–12), overrides `size` for the 12-column dashboard grid */
  gridSpan?: number
  colorScheme: string[]
}

export interface DashboardConfig {
  userId: string
  widgets: DashboardWidget[]
  showStatCards: boolean
  /** Bump when default chart colors change; triggers one-time sync from defaults */
  schemaVersion?: number
}

export interface ChartDataPoint {
  name: string
  value: number
  fill?: string
}

/** Chart series colors — from RepairsIQ reference palette */
export const CHART_COLORS = [...repairsiqChartSeriesColors]

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'w1',
    title: 'Eligibility by Status',
    type: 'pie',
    dataSource: 'eligibility-by-status',
    visible: true,
    order: 0,
    size: 'medium',
    colorScheme: [
      repairsiqReferencePalette.chartTeal,
      repairsiqReferencePalette.navActiveOrange,
      repairsiqReferencePalette.chartBlue,
    ],
  },
  {
    id: 'w2',
    title: 'Eligibility by Payor',
    type: 'bar',
    dataSource: 'eligibility-by-payor',
    visible: true,
    order: 1,
    size: 'medium',
    colorScheme: CHART_COLORS,
  },
  {
    id: 'w3',
    title: 'Eligibility Over Time',
    type: 'area',
    dataSource: 'eligibility-over-time',
    visible: true,
    order: 2,
    size: 'large',
    colorScheme: [repairsiqReferencePalette.chartBlue],
  },
  {
    id: 'w4',
    title: 'Coverage Status',
    type: 'donut',
    dataSource: 'coverage-status',
    visible: true,
    order: 3,
    size: 'small',
    colorScheme: [
      repairsiqReferencePalette.chartTeal,
      repairsiqReferencePalette.chartRed,
      repairsiqReferencePalette.navActiveOrange,
    ],
  },
  {
    id: 'w5',
    title: 'Eligibility by Service Type',
    type: 'bar',
    dataSource: 'eligibility-by-service',
    visible: true,
    order: 4,
    size: 'medium',
    colorScheme: CHART_COLORS,
  },
  {
    id: 'w6',
    title: 'Notifications by Priority',
    type: 'pie',
    dataSource: 'notifications-by-priority',
    visible: false,
    order: 5,
    size: 'small',
    colorScheme: [
      repairsiqReferencePalette.chartRed,
      repairsiqReferencePalette.navActiveOrange,
      repairsiqReferencePalette.chartBlue,
    ],
  },
  {
    id: 'w7',
    title: 'Notifications by Type',
    type: 'bar',
    dataSource: 'notifications-by-type',
    visible: false,
    order: 6,
    size: 'large',
    colorScheme: CHART_COLORS,
  },
  {
    id: 'w8',
    title: 'CPT / HCPC by Category',
    type: 'pie',
    dataSource: 'cpt-hcpc-by-category',
    visible: false,
    order: 7,
    size: 'small',
    colorScheme: [repairsiqReferencePalette.chartPurple, repairsiqReferencePalette.chartTeal],
  },
  {
    id: 'w9',
    title: 'CPT / HCPC by Service',
    type: 'bar',
    dataSource: 'cpt-hcpc-by-service',
    visible: false,
    order: 8,
    size: 'medium',
    colorScheme: CHART_COLORS,
  },
  {
    id: 'w10',
    title: 'Auth Required Distribution',
    type: 'donut',
    dataSource: 'auth-required-distribution',
    visible: false,
    order: 9,
    size: 'small',
    colorScheme: [repairsiqReferencePalette.chartRed, repairsiqReferencePalette.chartTeal],
  },
  {
    id: 'w11',
    title: 'Payor Status',
    type: 'pie',
    dataSource: 'payor-status',
    visible: false,
    order: 10,
    size: 'small',
    colorScheme: [repairsiqReferencePalette.chartTeal, repairsiqReferencePalette.border],
  },
  {
    id: 'w12',
    title: 'Denial Reasons',
    type: 'horizontalBar',
    dataSource: 'denial-reasons',
    visible: true,
    order: 11,
    size: 'medium',
    colorScheme: [
      repairsiqReferencePalette.chartRed,
      repairsiqReferencePalette.accentOrangeDeep,
      repairsiqReferencePalette.navActiveOrange,
      repairsiqReferencePalette.chartTeal,
      repairsiqReferencePalette.chartPurple,
    ],
  },
  {
    id: 'w13',
    title: 'Monthly Check Volume',
    type: 'radar',
    dataSource: 'monthly-check-volume',
    visible: true,
    order: 12,
    size: 'medium',
    colorScheme: [repairsiqReferencePalette.chartBlue, repairsiqReferencePalette.chartPurple],
  },
  {
    id: 'w14',
    title: 'Patient Age Distribution',
    type: 'treemap',
    dataSource: 'patient-age-distribution',
    visible: true,
    order: 13,
    size: 'large',
    colorScheme: [
      repairsiqReferencePalette.chartBlue,
      repairsiqReferencePalette.chartPurple,
      repairsiqReferencePalette.chartTeal,
      repairsiqReferencePalette.navActiveOrange,
      repairsiqReferencePalette.chartRed,
      repairsiqReferencePalette.accentTurquoise,
    ],
  },
  {
    id: 'w15',
    title: 'Top Procedures',
    type: 'radialBar',
    dataSource: 'top-procedures',
    visible: true,
    order: 14,
    size: 'medium',
    colorScheme: [
      repairsiqReferencePalette.chartBlue,
      repairsiqReferencePalette.chartPurple,
      repairsiqReferencePalette.chartTeal,
      repairsiqReferencePalette.navActiveOrange,
      repairsiqReferencePalette.chartRed,
    ],
  },
  {
    id: 'w16',
    title: 'Payor Response Time (days)',
    type: 'horizontalBar',
    dataSource: 'payor-response-time',
    visible: false,
    order: 15,
    size: 'medium',
    colorScheme: CHART_COLORS,
  },
  {
    id: 'w17',
    title: 'Service Cost Comparison',
    type: 'radar',
    dataSource: 'service-cost-comparison',
    visible: false,
    order: 16,
    size: 'medium',
    colorScheme: [repairsiqReferencePalette.chartPurple, repairsiqReferencePalette.chartTeal],
  },
]

const DASHBOARD_SCHEMA_VERSION = 3

function syncWidgetColorSchemesFromDefaults(widgets: DashboardWidget[]): DashboardWidget[] {
  const defaultById = new Map(DEFAULT_WIDGETS.map((w) => [w.id, w.colorScheme]))
  return widgets.map((w) => {
    const fresh = defaultById.get(w.id)
    if (fresh) return { ...w, colorScheme: [...fresh] }
    return { ...w, colorScheme: [...CHART_COLORS] }
  })
}

const STORAGE_KEY_PREFIX = 'healthlynk-dashboard'

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}-${userId}`
}

function loadConfig(userId: string): DashboardConfig {
  try {
    const stored = localStorage.getItem(getStorageKey(userId))
    if (stored) {
      const parsed = JSON.parse(stored) as DashboardConfig
      const existingIds = new Set(parsed.widgets.map((w) => w.id))
      const missingWidgets = DEFAULT_WIDGETS
        .filter((w) => !existingIds.has(w.id))
        .map((w, i) => ({ ...w, order: parsed.widgets.length + i, visible: false }))
      if (missingWidgets.length > 0) {
        parsed.widgets = [...parsed.widgets, ...missingWidgets]
      }
      if (parsed.schemaVersion !== DASHBOARD_SCHEMA_VERSION) {
        parsed.widgets = syncWidgetColorSchemesFromDefaults(parsed.widgets)
        parsed.schemaVersion = DASHBOARD_SCHEMA_VERSION
      }
      return parsed
    }
  } catch (error) {
    console.error('Failed to load dashboard config:', error)
  }
  return {
    userId,
    widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })),
    showStatCards: true,
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
  }
}

function saveConfig(config: DashboardConfig): void {
  try {
    localStorage.setItem(getStorageKey(config.userId), JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save dashboard config:', error)
  }
}

function aggregateByField(items: Record<string, any>[], field: string): ChartDataPoint[] {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const key = item[field] as string
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

export function getChartData(dataSource: DataSource): ChartDataPoint[] {
  switch (dataSource) {
    case 'eligibility-by-status':
      return aggregateByField(eligibilityChecks, 'status')

    case 'eligibility-by-payor':
      return aggregateByField(eligibilityChecks, 'payor')

    case 'eligibility-by-service':
      return aggregateByField(eligibilityChecks, 'serviceType')

    case 'eligibility-over-time': {
      const byDate: Record<string, number> = {}
      for (const check of eligibilityChecks) {
        const d = new Date(check.date)
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        byDate[key] = (byDate[key] || 0) + 1
      }
      const sorted = Object.entries(byDate)
        .map(([name, value]) => ({ name, value, _date: new Date(name + ', 2026') }))
        .sort((a, b) => a._date.getTime() - b._date.getTime())
      return sorted.map(({ name, value }) => ({ name, value }))
    }

    case 'coverage-status':
      return aggregateByField(eligibilityChecks, 'coverage')

    case 'notifications-by-type': {
      const counts: Record<string, number> = {}
      for (const n of mockNotifications) {
        const label = n.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        counts[label] = (counts[label] || 0) + 1
      }
      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }

    case 'notifications-by-priority':
      return aggregateByField(mockNotifications, 'priority').map((d) => ({
        ...d,
        name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
      }))

    case 'cpt-hcpc-by-category':
      return aggregateByField(initialCptHcpcCodes, 'category')

    case 'cpt-hcpc-by-service': {
      const counts: Record<string, number> = {}
      for (const code of initialCptHcpcCodes) {
        const label = code.productService.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        counts[label] = (counts[label] || 0) + 1
      }
      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }

    case 'auth-required-distribution': {
      let required = 0
      let notRequired = 0
      for (const code of initialCptHcpcCodes) {
        if (code.authorizationRequired) required++
        else notRequired++
      }
      return [
        { name: 'Required', value: required },
        { name: 'Not Required', value: notRequired },
      ]
    }

    case 'payor-status': {
      let active = 0
      let inactive = 0
      for (const p of initialPayors) {
        if (p.status === 'active') active++
        else inactive++
      }
      return [
        { name: 'Active', value: active },
        { name: 'Inactive', value: inactive },
      ]
    }

    case 'denial-reasons':
      return [
        { name: 'Missing Info', value: 18 },
        { name: 'Not Medically Necessary', value: 14 },
        { name: 'Out of Network', value: 11 },
        { name: 'Pre-Auth Required', value: 9 },
        { name: 'Duplicate Claim', value: 6 },
        { name: 'Coding Error', value: 5 },
        { name: 'Timely Filing', value: 3 },
      ]

    case 'monthly-check-volume':
      return [
        { name: 'Jan', value: 142 },
        { name: 'Feb', value: 168 },
        { name: 'Mar', value: 195 },
        { name: 'Apr', value: 178 },
        { name: 'May', value: 210 },
        { name: 'Jun', value: 187 },
        { name: 'Jul', value: 224 },
        { name: 'Aug', value: 198 },
        { name: 'Sep', value: 215 },
        { name: 'Oct', value: 231 },
        { name: 'Nov', value: 205 },
        { name: 'Dec', value: 189 },
      ]

    case 'patient-age-distribution':
      return [
        { name: '0-17', value: 85 },
        { name: '18-30', value: 142 },
        { name: '31-45', value: 278 },
        { name: '46-60', value: 321 },
        { name: '61-75', value: 256 },
        { name: '76+', value: 165 },
      ]

    case 'top-procedures':
      return [
        { name: 'Office Visit', value: 320 },
        { name: 'Lab Work', value: 245 },
        { name: 'Imaging', value: 180 },
        { name: 'Physical Therapy', value: 125 },
        { name: 'Surgery Consult', value: 78 },
      ]

    case 'payor-response-time':
      return [
        { name: 'Aetna', value: 3.2 },
        { name: 'BCBS', value: 2.8 },
        { name: 'Cigna', value: 4.1 },
        { name: 'UnitedHealth', value: 3.5 },
        { name: 'Humana', value: 2.4 },
        { name: 'Medicare', value: 1.8 },
      ]

    case 'service-cost-comparison':
      return [
        { name: 'Primary Care', value: 185 },
        { name: 'Specialist', value: 310 },
        { name: 'Emergency', value: 890 },
        { name: 'Lab/Diagnostic', value: 245 },
        { name: 'Preventive', value: 120 },
        { name: 'Mental Health', value: 210 },
      ]

    default:
      return []
  }
}

export function getStatData(dataSource: DataSource): { value: number; label: string } {
  switch (dataSource) {
    case 'stat-total-patients': {
      const unique = new Set(eligibilityChecks.map((c) => c.patientId))
      return { value: unique.size, label: 'Total Patients' }
    }
    case 'stat-eligibility-today': {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const count = eligibilityChecks.filter((c) => {
        const d = new Date(c.date)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === today.getTime()
      }).length
      return { value: count, label: 'Eligibility Checks Today' }
    }
    case 'stat-pending-auth':
      return {
        value: eligibilityChecks.filter((c) => c.status === 'Pending Authorization').length,
        label: 'Pending Prior Auth',
      }
    case 'stat-approved-auth':
      return {
        value: eligibilityChecks.filter((c) => c.status === 'Complete').length,
        label: 'Approved Auth',
      }
    default:
      return { value: 0, label: '' }
  }
}

export const DATA_SOURCE_OPTIONS: { value: DataSource; label: string; compatibleTypes: ChartType[] }[] = [
  { value: 'eligibility-by-status', label: 'Eligibility by Status', compatibleTypes: ['bar', 'pie', 'donut', 'radar', 'horizontalBar'] },
  { value: 'eligibility-by-payor', label: 'Eligibility by Payor', compatibleTypes: ['bar', 'pie', 'donut', 'radar', 'horizontalBar'] },
  { value: 'eligibility-by-service', label: 'Eligibility by Service Type', compatibleTypes: ['bar', 'pie', 'donut', 'radar', 'horizontalBar', 'treemap'] },
  { value: 'eligibility-over-time', label: 'Eligibility Over Time', compatibleTypes: ['line', 'area', 'bar', 'radar'] },
  { value: 'coverage-status', label: 'Coverage Status', compatibleTypes: ['pie', 'donut', 'bar', 'radialBar'] },
  { value: 'notifications-by-type', label: 'Notifications by Type', compatibleTypes: ['bar', 'pie', 'donut', 'horizontalBar', 'treemap'] },
  { value: 'notifications-by-priority', label: 'Notifications by Priority', compatibleTypes: ['pie', 'donut', 'bar', 'radialBar'] },
  { value: 'cpt-hcpc-by-category', label: 'CPT/HCPC by Category', compatibleTypes: ['pie', 'donut', 'bar', 'treemap'] },
  { value: 'cpt-hcpc-by-service', label: 'CPT/HCPC by Service', compatibleTypes: ['bar', 'pie', 'donut', 'horizontalBar'] },
  { value: 'auth-required-distribution', label: 'Auth Required Distribution', compatibleTypes: ['pie', 'donut', 'bar', 'radialBar'] },
  { value: 'payor-status', label: 'Payor Status', compatibleTypes: ['pie', 'donut', 'bar', 'radialBar'] },
  { value: 'denial-reasons', label: 'Denial Reasons', compatibleTypes: ['horizontalBar', 'bar', 'pie', 'donut', 'treemap'] },
  { value: 'monthly-check-volume', label: 'Monthly Check Volume', compatibleTypes: ['radar', 'line', 'area', 'bar'] },
  { value: 'patient-age-distribution', label: 'Patient Age Distribution', compatibleTypes: ['treemap', 'bar', 'pie', 'donut', 'horizontalBar', 'radialBar'] },
  { value: 'top-procedures', label: 'Top Procedures', compatibleTypes: ['radialBar', 'bar', 'horizontalBar', 'pie', 'donut', 'treemap'] },
  { value: 'payor-response-time', label: 'Payor Response Time', compatibleTypes: ['horizontalBar', 'bar', 'radar'] },
  { value: 'service-cost-comparison', label: 'Service Cost Comparison', compatibleTypes: ['radar', 'bar', 'horizontalBar', 'treemap'] },
]

export const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'horizontalBar', label: 'Horizontal Bar' },
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'donut', label: 'Donut Chart' },
  { value: 'radar', label: 'Radar Chart' },
  { value: 'radialBar', label: 'Radial Bar' },
  { value: 'treemap', label: 'Treemap' },
]

export const SIZE_OPTIONS: { value: DashboardWidget['size']; label: string }[] = [
  { value: 'small', label: 'Small (1/3 width)' },
  { value: 'medium', label: 'Medium (1/2 width)' },
  { value: 'large', label: 'Large (2/3 width)' },
  { value: 'full', label: 'Full Width' },
]

export function sizeToSpan(size: DashboardWidget['size']): number {
  switch (size) {
    case 'small':
      return 4
    case 'medium':
      return 6
    case 'large':
      return 8
    case 'full':
      return 12
    default:
      return 6
  }
}

export function getWidgetGridSpan(widget: DashboardWidget): number {
  const g = widget.gridSpan
  if (typeof g === 'number' && g >= 4 && g <= 12) return g
  return sizeToSpan(widget.size)
}

export interface DashboardBackupEntry {
  id: string
  savedAt: string
  label?: string
  snapshot: DashboardConfig
}

const MAX_BACKUPS = 12

function getBackupsStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}-backups-${userId}`
}

export function loadDashboardBackups(userId: string): DashboardBackupEntry[] {
  try {
    const raw = localStorage.getItem(getBackupsStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as DashboardBackupEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveDashboardBackups(userId: string, entries: DashboardBackupEntry[]): void {
  try {
    localStorage.setItem(getBackupsStorageKey(userId), JSON.stringify(entries.slice(0, MAX_BACKUPS)))
  } catch (e) {
    console.error('Failed to save dashboard backups:', e)
  }
}

export function pushDashboardBackup(userId: string, snapshot: DashboardConfig, label?: string): DashboardBackupEntry {
  const entry: DashboardBackupEntry = {
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    savedAt: new Date().toISOString(),
    label,
    snapshot: JSON.parse(JSON.stringify(snapshot)) as DashboardConfig,
  }
  const list = loadDashboardBackups(userId)
  list.unshift(entry)
  saveDashboardBackups(userId, list)
  return entry
}

interface DashboardContextType {
  config: DashboardConfig
  applyConfig: (incoming: DashboardConfig) => void
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void
  toggleWidgetVisibility: (widgetId: string) => void
  reorderWidgets: (fromIndex: number, toIndex: number) => void
  resetDashboard: () => void
  setShowStatCards: (show: boolean) => void
  addWidget: (widget: Omit<DashboardWidget, 'id' | 'order'>) => void
  removeWidget: (widgetId: string) => void
  createConfigBackup: (label?: string) => DashboardBackupEntry
  listConfigBackups: () => DashboardBackupEntry[]
  restoreConfigBackup: (backupId: string) => void
  deleteConfigBackup: (backupId: string) => Promise<void>
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export const useDashboard = () => {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

const CURRENT_USER_ID = 'dr-sarah-johnson'

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<DashboardConfig>(() => loadConfig(CURRENT_USER_ID))
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    saveConfig(config)
  }, [config])

  const applyConfig = useCallback((incoming: DashboardConfig) => {
    const incomingWidgets = Array.isArray(incoming.widgets) ? incoming.widgets : []
    const existingIds = new Set(incomingWidgets.map((w) => w.id))
    const missingWidgets = DEFAULT_WIDGETS
      .filter((w) => !existingIds.has(w.id))
      .map((w, i) => ({ ...w, order: incomingWidgets.length + i, visible: false }))
    const mergedWidgets = [...incomingWidgets, ...missingWidgets]
    const withSyncedColors =
      incoming.schemaVersion !== DASHBOARD_SCHEMA_VERSION
        ? syncWidgetColorSchemesFromDefaults(mergedWidgets)
        : mergedWidgets
    setConfig({
      userId: CURRENT_USER_ID,
      widgets: withSyncedColors,
      showStatCards:
        typeof incoming.showStatCards === 'boolean' ? incoming.showStatCards : true,
      schemaVersion: DASHBOARD_SCHEMA_VERSION,
    })
  }, [])

  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
    }))
  }, [])

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w)),
    }))
  }, [])

  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const widgets = [...prev.widgets].sort((a, b) => a.order - b.order)
      const [moved] = widgets.splice(fromIndex, 1)
      widgets.splice(toIndex, 0, moved)
      return {
        ...prev,
        widgets: widgets.map((w, i) => ({ ...w, order: i })),
      }
    })
  }, [])

  const resetDashboard = useCallback(() => {
    pushDashboardBackup(CURRENT_USER_ID, configRef.current, 'Before reset to defaults')
    setConfig({
      userId: CURRENT_USER_ID,
      widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })),
      showStatCards: true,
      schemaVersion: DASHBOARD_SCHEMA_VERSION,
    })
  }, [])

  const setShowStatCards = useCallback((show: boolean) => {
    setConfig((prev) => ({ ...prev, showStatCards: show }))
  }, [])

  const addWidget = useCallback((widget: Omit<DashboardWidget, 'id' | 'order'>) => {
    setConfig((prev) => {
      const id = `w-custom-${Date.now()}`
      const order = prev.widgets.length
      return {
        ...prev,
        schemaVersion: DASHBOARD_SCHEMA_VERSION,
        widgets: [...prev.widgets, { ...widget, id, order }],
      }
    })
  }, [])

  const removeWidget = useCallback((widgetId: string) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets
        .filter((w) => w.id !== widgetId)
        .map((w, i) => ({ ...w, order: i })),
    }))
  }, [])

  const createConfigBackup = useCallback((label?: string) => {
    return pushDashboardBackup(CURRENT_USER_ID, configRef.current, label)
  }, [])

  const listConfigBackups = useCallback(() => loadDashboardBackups(CURRENT_USER_ID), [])

  const restoreConfigBackup = useCallback((backupId: string) => {
    const entries = loadDashboardBackups(CURRENT_USER_ID)
    const entry = entries.find((e) => e.id === backupId)
    if (!entry) return
    pushDashboardBackup(CURRENT_USER_ID, configRef.current, 'Before restore')
    setConfig({
      ...entry.snapshot,
      userId: CURRENT_USER_ID,
      schemaVersion: entry.snapshot.schemaVersion ?? DASHBOARD_SCHEMA_VERSION,
    })
  }, [])

  const deleteConfigBackup = useCallback(async (backupId: string) => {
    await deleteDashboardBackupApi(backupId)
    const next = loadDashboardBackups(CURRENT_USER_ID).filter((e) => e.id !== backupId)
    saveDashboardBackups(CURRENT_USER_ID, next)
  }, [])

  return (
    <DashboardContext.Provider
      value={{
        config,
        applyConfig,
        updateWidget,
        toggleWidgetVisibility,
        reorderWidgets,
        resetDashboard,
        setShowStatCards,
        addWidget,
        removeWidget,
        createConfigBackup,
        listConfigBackups,
        restoreConfigBackup,
        deleteConfigBackup,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}
