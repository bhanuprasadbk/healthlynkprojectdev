import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  BarChart3,
  BarChartHorizontal,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  Radar,
  Target,
  SquareStack,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  X,
  GripVertical,
  Sparkles,
  CheckCircle2,
  Palette,
} from 'lucide-react'
import Button from '../components/forms/Button'
import Toast from '../components/Toast'
import { useTheme } from '../contexts/ThemeContext'
import ChartWidget from '../components/dashboard/ChartWidget'
import {
  useDashboard,
  DashboardWidget,
  DashboardConfig,
  DATA_SOURCE_OPTIONS,
  CHART_TYPE_OPTIONS,
  SIZE_OPTIONS,
  CHART_COLORS,
  ChartType,
  DataSource,
  getWidgetGridSpan,
  sizeToSpan,
} from '../contexts/DashboardContext'
import {
  getDashboardConfig,
  listDashboardBackups,
  putDashboardConfig,
} from '../services/dashboardSettingsService'

const chartTypeIcons: Record<ChartType, typeof BarChart3> = {
  bar: BarChart3,
  horizontalBar: BarChartHorizontal,
  line: LineChartIcon,
  area: AreaChartIcon,
  pie: PieChartIcon,
  donut: PieChartIcon,
  radar: Radar,
  radialBar: Target,
  treemap: SquareStack,
  'stat-card': LayoutDashboard,
}

function useMdUp(): boolean {
  const [mdUp, setMdUp] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setMdUp(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mdUp
}

const DashboardSettings = () => {
  const { theme } = useTheme()
  const {
    config,
    applyConfig,
    updateWidget,
    toggleWidgetVisibility,
    reorderWidgets,
    resetDashboard,
    setShowStatCards,
    addWidget,
    removeWidget,
  } = useDashboard()

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [backupCount, setBackupCount] = useState(0)

  const [resizing, setResizing] = useState<{
    widgetId: string
    startClientX: number
    startSpan: number
  } | null>(null)
  const [resizeLiveSpan, setResizeLiveSpan] = useState<number | null>(null)
  const resizeLiveSpanRef = useRef<number | null>(null)

  const mdUp = useMdUp()

  const toast = useCallback((msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
  }, [])

  useEffect(() => {
    const asRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

    const loadDashboardConfig = async () => {
      try {
        const response = await getDashboardConfig()
        const payload = asRecord(response.data ?? response)
        const configFromApi = (payload.config ?? payload) as DashboardConfig
        if (Array.isArray(configFromApi.widgets)) {
          applyConfig(configFromApi)
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Unable to load dashboard config')
      }
    }

    loadDashboardConfig()
  }, [applyConfig, toast])

  useEffect(() => {
    const asRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

    const loadBackups = async () => {
      try {
        const response = await listDashboardBackups()
        const maybeArray = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(asRecord(response?.data).backups)
              ? (asRecord(response?.data).backups as unknown[])
              : []
        setBackupCount(maybeArray.length)
      } catch {
        setBackupCount(0)
      }
    }
    loadBackups()
  }, [])

  const sortedVisible = useMemo(() => {
    return [...config.widgets]
      .filter((w) => w.visible && w.type !== 'stat-card')
      .sort((a, b) => a.order - b.order)
  }, [config.widgets])

  const selectedWidget = selectedId ? config.widgets.find((w) => w.id === selectedId) : undefined

  const catalogFiltered = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    if (!q) return DATA_SOURCE_OPTIONS
    return DATA_SOURCE_OPTIONS.filter((o) => o.label.toLowerCase().includes(q))
  }, [catalogQuery])

  const getCompatibleTypes = (dataSource: DataSource): ChartType[] => {
    return DATA_SOURCE_OPTIONS.find((o) => o.value === dataSource)?.compatibleTypes ?? ['bar']
  }

  const handleCatalogAdd = (dataSource: DataSource) => {
    const opt = DATA_SOURCE_OPTIONS.find((o) => o.value === dataSource)
    if (!opt) return

    const hiddenSame = config.widgets.find((w) => w.dataSource === dataSource && !w.visible)
    if (hiddenSame) {
      updateWidget(hiddenSame.id, { visible: true })
      setSelectedId(hiddenSame.id)
      toast(`Added “${opt.label}” to the dashboard`)
      return
    }

    addWidget({
      title: opt.label,
      type: opt.compatibleTypes[0],
      dataSource,
      visible: true,
      size: 'medium',
      colorScheme: [...CHART_COLORS],
    })
    toast(`New chart “${opt.label}” added`)
  }

  const isOnDashboard = (ds: DataSource) =>
    config.widgets.some((w) => w.dataSource === ds && w.visible)

  const handleSave = async () => {
    try {
      await putDashboardConfig({
        config: {
          show_stat_cards: config.showStatCards,
          schema_version: config.schemaVersion ?? 3,
        },
        widgets: config.widgets
          .sort((a, b) => a.order - b.order)
          .map((widget) => ({
            widget_key: widget.dataSource,
            title: widget.title,
            order_index: widget.order,
            is_visible: widget.visible,
            size: widget.size,
            grid_span: getWidgetGridSpan(widget),
            chart_type: widget.type,
            data_source: widget.dataSource,
            color_scheme: widget.colorScheme,
            config: {},
          })),
      })
      toast('Configuration saved')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to save dashboard config')
    }
  }

  const handleReset = () => {
    resetDashboard()
    setSelectedId(null)
    toast('Dashboard reset to defaults')
  }

  const handleResizePointerDown = (e: React.PointerEvent, widget: DashboardWidget) => {
    e.stopPropagation()
    e.preventDefault()
    const span = getWidgetGridSpan(widget)
    setResizing({
      widgetId: widget.id,
      startClientX: e.clientX,
      startSpan: span,
    })
    setResizeLiveSpan(span)
    resizeLiveSpanRef.current = span
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  useEffect(() => {
    if (!resizing) return

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - resizing.startClientX
      const colDelta = Math.round(dx / 32)
      const next = Math.max(4, Math.min(12, resizing.startSpan + colDelta))
      resizeLiveSpanRef.current = next
      setResizeLiveSpan(next)
    }

    const onUp = (e: PointerEvent) => {
      const final = resizeLiveSpanRef.current
      if (final != null) {
        updateWidget(resizing.widgetId, { gridSpan: final })
      }
      setResizing(null)
      setResizeLiveSpan(null)
      resizeLiveSpanRef.current = null
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [resizing, updateWidget])

  const effectiveSpan = (w: DashboardWidget) => {
    if (resizing?.widgetId === w.id && resizeLiveSpan != null) return resizeLiveSpan
    return getWidgetGridSpan(w)
  }

  const sortedAll = [...config.widgets].sort((a, b) => a.order - b.order)

  useEffect(() => {
    if (selectedId && !config.widgets.some((w) => w.id === selectedId)) {
      setSelectedId(null)
    }
  }, [selectedId, config.widgets])

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  return (
    <div
      className="min-h-full flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="flex flex-col xl:flex-row flex-1 min-h-0">
        {/* Catalog */}
        <aside
          className="w-full xl:w-72 shrink-0 border-b xl:border-b-0 xl:border-r flex flex-col max-h-[40vh] xl:max-h-none xl:h-[calc(100vh-4rem)]"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBackground }}
        >
          <div className="p-4 border-b shrink-0" style={{ borderColor: theme.colors.border }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} style={{ color: theme.colors.primary }} />
              <h2 className="text-sm font-bold" style={{ color: theme.colors.textPrimary }}>
                Chart library
              </h2>
            </div>
            <p className="text-xs mb-3" style={{ color: theme.colors.textSecondary }}>
              Click a card to add it to your dashboard preview.
            </p>
            <input
              type="search"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search charts…"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.textPrimary,
                boxShadow: `0 0 0 2px transparent`,
              }}
              onFocus={(ev) => {
                ev.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primaryLight}`
              }}
              onBlur={(ev) => {
                ev.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {catalogFiltered.map((opt) => {
              const on = isOnDashboard(opt.value)
              const Icon = chartTypeIcons[opt.compatibleTypes[0]] ?? BarChart3
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleCatalogAdd(opt.value)}
                  className="w-full text-left rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
                  style={{
                    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${theme.colors.cardBorder}`,
                    boxShadow: on ? `0 0 0 2px ${theme.colors.primary}33` : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2.5 rounded-lg shrink-0 transition-transform group-hover:rotate-3"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.primary}33, ${theme.colors.primary}08)`,
                      }}
                    >
                      <Icon size={20} style={{ color: theme.colors.primary }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate" style={{ color: theme.colors.textPrimary }}>
                          {opt.label}
                        </span>
                        {on ? (
                          <CheckCircle2 size={14} className="shrink-0" style={{ color: theme.colors.primary }} />
                        ) : (
                          <Plus size={14} className="shrink-0 opacity-50" style={{ color: theme.colors.textSecondary }} />
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: theme.colors.textSecondary }}>
                        {on ? 'On dashboard — click to enable hidden or add another' : 'Click to add'}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Main canvas + header */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <header
            className="px-4 py-4 border-b shrink-0 flex flex-wrap items-center gap-3 justify-between"
            style={{ borderColor: theme.colors.border }}
          >
            <div>
              <h1 className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                Dashboard settings
              </h1>
              <p className="text-sm mt-0.5" style={{ color: theme.colors.textSecondary }}>
                Build your layout, drag resize handles, and click a chart to open its settings.
              </p>
              <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                Backups: {backupCount}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1.5">
                <RotateCcw size={14} />
                Reset defaults
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} className="flex items-center gap-1.5">
                <Save size={14} />
                Save
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4">
            {/* Stat cards toggle */}
            <div
              className="rounded-xl p-4 mb-4 flex items-center justify-between gap-4"
              style={{
                backgroundColor: theme.colors.cardBackground,
                border: `1px solid ${theme.colors.cardBorder}`,
              }}
            >
              <div>
                <h3 className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                  Summary stat cards
                </h3>
                <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>
                  Row of KPI cards above charts on the live dashboard
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.showStatCards}
                  onChange={(e) => setShowStatCards(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            {/* Preview label */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <LayoutDashboard size={16} />
                Live preview
              </h3>
              <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Drag the grip to resize · Click a chart for colors & options
              </span>
            </div>

            <div className="grid grid-cols-12 gap-4 pb-8" style={{ minHeight: 280 }}>
              {sortedVisible.length === 0 ? (
                <div
                  className="col-span-12 rounded-xl flex flex-col items-center justify-center py-16 px-6 text-center"
                  style={{
                    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px dashed ${theme.colors.border}`,
                  }}
                >
                  <BarChart3 size={40} className="mb-3 opacity-40" style={{ color: theme.colors.textSecondary }} />
                  <p className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
                    No charts on the dashboard yet
                  </p>
                  <p className="text-xs mt-1 max-w-sm" style={{ color: theme.colors.textSecondary }}>
                    Choose a chart from the library on the left to add it here.
                  </p>
                </div>
              ) : (
                sortedVisible.map((w) => {
                  const span = effectiveSpan(w)
                  const selected = selectedId === w.id
                  const gridColumn = mdUp ? `span ${span} / span ${span}` : 'span 12 / span 12'
                  return (
                    <div
                      key={w.id}
                      className="relative min-w-0 rounded-xl transition-shadow duration-200"
                      style={{ gridColumn }}
                      onClick={() => setSelectedId(w.id)}
                    >
                      <div
                        className="relative h-full min-h-[260px] rounded-xl overflow-hidden cursor-pointer group/prev"
                        style={{
                          outline: selected ? `2px solid ${theme.colors.primary}` : undefined,
                          outlineOffset: 2,
                          boxShadow: selected ? `0 12px 40px -12px ${theme.colors.primary}44` : undefined,
                        }}
                      >
                        <div
                          className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover/prev:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            title={w.visible ? 'Hide from dashboard' : 'Show'}
                            className="p-1.5 rounded-lg backdrop-blur-sm"
                            style={{
                              backgroundColor: theme.colors.cardBackground,
                              color: theme.colors.textSecondary,
                              border: `1px solid ${theme.colors.border}`,
                            }}
                            onClick={() => toggleWidgetVisibility(w.id)}
                          >
                            {w.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            type="button"
                            title={w.id.startsWith('w-custom') ? 'Remove widget' : 'Remove from dashboard'}
                            className="p-1.5 rounded-lg backdrop-blur-sm text-red-500"
                            style={{
                              backgroundColor: theme.colors.cardBackground,
                              border: `1px solid ${theme.colors.border}`,
                            }}
                            onClick={() => {
                              if (w.id.startsWith('w-custom')) removeWidget(w.id)
                              else updateWidget(w.id, { visible: false })
                              if (selectedId === w.id) setSelectedId(null)
                              toast(w.id.startsWith('w-custom') ? 'Widget removed' : 'Hidden from dashboard')
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <ChartWidget widget={{ ...w, size: 'small' }} enableGridPlacement={false} />

                        <button
                          type="button"
                          aria-label="Resize chart width"
                          className="absolute bottom-2 right-2 z-20 p-1.5 rounded-lg cursor-ew-resize touch-none hover:opacity-100 opacity-80 transition-opacity"
                          style={{
                            backgroundColor: theme.colors.primary,
                            color: theme.colors.cardBackground,
                            boxShadow: `0 4px 12px ${theme.colors.primary}55`,
                          }}
                          onPointerDown={(e) => handleResizePointerDown(e, w)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical size={14} className="rotate-45" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart settings modal */}
      {selectedWidget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chart-settings-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] border-0 cursor-default"
            aria-label="Close settings"
            onClick={() => setSelectedId(null)}
          />
          <div
            className="relative w-full max-w-lg max-h-[min(90vh,720px)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{
              backgroundColor: theme.colors.cardBackground,
              border: `1px solid ${theme.colors.cardBorder}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 px-5 py-4 shrink-0"
              style={{ borderBottom: `1px solid ${theme.colors.border}` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{ backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Palette size={20} style={{ color: theme.colors.primary }} />
                </div>
                <div className="min-w-0">
                  <h2 id="chart-settings-title" className="text-base font-bold truncate" style={{ color: theme.colors.textPrimary }}>
                    Chart settings
                  </h2>
                  <p className="text-xs mt-0.5 truncate" style={{ color: theme.colors.textSecondary }}>
                    {selectedWidget.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg shrink-0 transition-colors hover:opacity-80"
                style={{ color: theme.colors.textSecondary }}
                onClick={() => setSelectedId(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
              >
                <span className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>
                  Order on dashboard
                </span>
                <div className="flex items-center gap-1">
                  {(() => {
                    const w = selectedWidget
                    const idx = sortedVisible.findIndex((x) => x.id === w.id)
                    const globalIdx = sortedAll.findIndex((x) => x.id === w.id)
                    const moveVisibleUp = () => {
                      let prev = globalIdx - 1
                      while (
                        prev >= 0 &&
                        (!sortedAll[prev].visible || sortedAll[prev].type === 'stat-card')
                      ) {
                        prev -= 1
                      }
                      if (prev >= 0) reorderWidgets(globalIdx, prev)
                    }
                    const moveVisibleDown = () => {
                      let next = globalIdx + 1
                      while (
                        next < sortedAll.length &&
                        (!sortedAll[next].visible || sortedAll[next].type === 'stat-card')
                      ) {
                        next += 1
                      }
                      if (next < sortedAll.length) reorderWidgets(globalIdx, next)
                    }
                    return (
                      <>
                        <button
                          type="button"
                          className="p-2 rounded-lg disabled:opacity-30"
                          style={{ color: theme.colors.textPrimary, border: `1px solid ${theme.colors.border}` }}
                          disabled={idx <= 0}
                          onClick={moveVisibleUp}
                          title="Move earlier"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg disabled:opacity-30"
                          style={{ color: theme.colors.textPrimary, border: `1px solid ${theme.colors.border}` }}
                          disabled={idx < 0 || idx >= sortedVisible.length - 1}
                          onClick={moveVisibleDown}
                          title="Move later"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold tracking-wide block mb-1.5" style={{ color: theme.colors.textSecondary }}>
                  Title
                </label>
                <input
                  type="text"
                  value={selectedWidget.title}
                  onChange={(e) => updateWidget(selectedWidget.id, { title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.06)' : '#fff',
                    color: theme.colors.textPrimary,
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-semibold tracking-wide block mb-1.5" style={{ color: theme.colors.textSecondary }}>
                    Chart type
                  </label>
                  <select
                    value={selectedWidget.type}
                    onChange={(e) => updateWidget(selectedWidget.id, { type: e.target.value as ChartType })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.06)' : '#fff',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {getCompatibleTypes(selectedWidget.dataSource).map((t) => {
                      const opt = CHART_TYPE_OPTIONS.find((o) => o.value === t)
                      return (
                        <option key={t} value={t}>
                          {opt?.label ?? t}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold tracking-wide block mb-1.5" style={{ color: theme.colors.textSecondary }}>
                    Size preset
                  </label>
                  <select
                    value={selectedWidget.size}
                    onChange={(e) => {
                      const size = e.target.value as DashboardWidget['size']
                      updateWidget(selectedWidget.id, {
                        size,
                        gridSpan: sizeToSpan(size),
                      })
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.06)' : '#fff',
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {SIZE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label.replace(/\s*\(.*\)/, '')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] uppercase font-semibold tracking-wide mb-2" style={{ color: theme.colors.textSecondary }}>
                  Series colors
                </h3>
                <p className="text-xs mb-3" style={{ color: theme.colors.textSecondary }}>
                  Colors repeat if your data has more points than swatches.
                </p>
                <div className="space-y-2">
                  {selectedWidget.colorScheme.map((hex, i) => (
                    <div
                      key={`${selectedWidget.id}-c-${i}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2"
                      style={{ border: `1px solid ${theme.colors.border}` }}
                    >
                      <input
                        type="color"
                        value={hex.startsWith('#') && hex.length >= 7 ? hex.slice(0, 7) : '#2980B9'}
                        onChange={(e) => {
                          const next = [...selectedWidget.colorScheme]
                          next[i] = e.target.value
                          updateWidget(selectedWidget.id, { colorScheme: next })
                        }}
                        className="w-11 h-11 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
                          Series {i + 1}
                        </p>
                        <p className="text-xs font-mono truncate" style={{ color: theme.colors.textSecondary }}>
                          {hex}
                        </p>
                      </div>
                      {selectedWidget.colorScheme.length > 1 && (
                        <button
                          type="button"
                          className="p-2 rounded-lg"
                          style={{ color: theme.colors.textSecondary }}
                          onClick={() => {
                            const next = selectedWidget.colorScheme.filter((_, j) => j !== i)
                            updateWidget(selectedWidget.id, { colorScheme: next })
                          }}
                          aria-label={`Remove color ${i + 1}`}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      updateWidget(selectedWidget.id, {
                        colorScheme: [
                          ...selectedWidget.colorScheme,
                          CHART_COLORS[selectedWidget.colorScheme.length % CHART_COLORS.length],
                        ],
                      })
                    }
                  >
                    Add color stop
                  </Button>
                </div>
              </div>
            </div>

            <div
              className="px-5 py-3 flex justify-end gap-2 shrink-0"
              style={{ borderTop: `1px solid ${theme.colors.border}` }}
            >
              <Button variant="primary" size="sm" onClick={() => setSelectedId(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toastMessage}
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </div>
  )
}

export default DashboardSettings
