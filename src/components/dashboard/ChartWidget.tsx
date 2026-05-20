import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar,
  Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { ChartDataPoint, DashboardWidget, getChartData, getWidgetGridSpan } from '../../contexts/DashboardContext'

interface ChartWidgetProps {
  widget: DashboardWidget
  /** When false, parent sets grid placement (e.g. dashboard settings preview). */
  enableGridPlacement?: boolean
}

const RADIAN = Math.PI / 180

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

const ChartWidget = ({ widget, enableGridPlacement = true }: ChartWidgetProps) => {
  const { theme } = useTheme()
  const mdUp = useMdUp()
  const data = getChartData(widget.dataSource)
  const colors = widget.colorScheme

  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
    if (!percent || percent < 0.05) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text
        x={x}
        y={y}
        fill={theme.colors.textPrimary}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const dataWithFill: ChartDataPoint[] = data.map((d, i) => ({
    ...d,
    fill: colors[i % colors.length],
  }))

  const tooltipStyle = {
    backgroundColor: theme.colors.cardBackground,
    border: `1px solid ${theme.colors.cardBorder}`,
    borderRadius: '8px',
    color: theme.colors.textPrimary,
    fontSize: '13px',
  }

  const axisStyle = { fill: theme.colors.textSecondary, fontSize: 12 }

  const gridColor = theme.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  const span = getWidgetGridSpan(widget)
  const gridColumn = mdUp ? `span ${span} / span ${span}` : 'span 12 / span 12'

  const getSizeClass = () => (enableGridPlacement ? 'min-w-0' : 'min-w-0 h-full')

  const chartHeight = widget.size === 'small' ? 260 : 300

  const renderChart = () => {
    switch (widget.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={dataWithFill} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridColor }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                {dataWithFill.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors[0]}
                strokeWidth={2.5}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors[0]}
                strokeWidth={2.5}
                fill={`url(#gradient-${widget.id})`}
                dot={{ fill: colors[0], strokeWidth: 2, r: 3 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={dataWithFill}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={chartHeight / 2 - 40}
                dataKey="value"
                strokeWidth={2}
                stroke={theme.colors.cardBackground}
              >
                {dataWithFill.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: theme.colors.textSecondary }}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={dataWithFill}
                cx="50%"
                cy="50%"
                innerRadius={chartHeight / 2 - 90}
                outerRadius={chartHeight / 2 - 40}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {dataWithFill.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: theme.colors.textSecondary }}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'horizontalBar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={dataWithFill} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} width={80} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridColor }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {dataWithFill.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis dataKey="name" tick={{ fill: theme.colors.textSecondary, fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: theme.colors.textSecondary, fontSize: 10 }} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Radar
                dataKey="value"
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.25}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[0] }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )

      case 'radialBar': {
        const radialData = dataWithFill.map((d, i) => ({
          ...d,
          fill: colors[i % colors.length],
        }))
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="20%"
              outerRadius="90%"
              barSize={16}
              data={radialData}
              startAngle={180}
              endAngle={-180}
            >
              <RadialBar
                background={{ fill: theme.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                dataKey="value"
                cornerRadius={8}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                iconSize={10}
                wrapperStyle={{ fontSize: '11px', color: theme.colors.textSecondary }}
                {...{ payload: radialData.map((d, i) => ({
                  value: d.name,
                  type: 'circle' as const,
                  color: colors[i % colors.length],
                })) }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        )
      }

      case 'treemap': {
        const treemapData = dataWithFill.map((d, i) => ({
          ...d,
          fill: colors[i % colors.length],
        }))
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <Treemap
              data={treemapData}
              dataKey="value"
              nameKey="name"
              aspectRatio={4 / 3}
              stroke={theme.colors.cardBackground}
              content={(props: any) => {
                const { x, y, width, height, name, value, fill } = props
                return (
                  <g>
                    <rect x={x} y={y} width={width} height={height} rx={6} fill={fill} opacity={0.9} />
                    {width > 50 && height > 40 && (
                      <>
                        <text
                          x={x + width / 2}
                          y={y + height / 2 - 8}
                          textAnchor="middle"
                          fill={theme.colors.textPrimary}
                          fontSize={12}
                          fontWeight={600}
                        >
                          {name}
                        </text>
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 10}
                          textAnchor="middle"
                          fill={theme.colors.textSecondary}
                          fontSize={11}
                        >
                          {value}
                        </text>
                      </>
                    )}
                  </g>
                )
              }}
            />
          </ResponsiveContainer>
        )
      }

      default:
        return <div className="text-center py-8" style={{ color: theme.colors.textSecondary }}>Unsupported chart type</div>
    }
  }

  return (
    <div
      className={`${getSizeClass()} rounded-lg shadow-sm hover:shadow-md transition-shadow`}
      style={{
        backgroundColor: theme.colors.cardBackground,
        border: `1px solid ${theme.colors.cardBorder}`,
        ...(enableGridPlacement ? { gridColumn } : {}),
      }}
    >
      <div className="p-5">
        <h3
          className="text-sm font-semibold mb-4"
          style={{ color: theme.colors.textPrimary }}
        >
          {widget.title}
        </h3>
        {renderChart()}
      </div>
    </div>
  )
}

export default ChartWidget
