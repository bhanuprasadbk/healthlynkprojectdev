import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface TimelineItem {
  id: string
  date: string
  status: string
  action: string
  performedBy?: string
  details: string
  result: string
}

interface TimelineProps {
  items: TimelineItem[]
}

const Timeline = ({ items }: TimelineProps) => {
  const { theme } = useTheme()
  const { colors } = theme

  const getStatusIcon = (status: string) => {
    const common = { size: 20 as const, 'aria-hidden': true as const }
    switch (status) {
      case 'eligible':
      case 'active':
      case 'approved':
        return <CheckCircle2 {...common} className="text-green-400" />
      case 'pending':
        return <Clock {...common} className="text-amber-400" />
      case 'warning':
        return <AlertCircle {...common} className="text-amber-400" />
      case 'not-eligible':
      case 'denied':
        return <XCircle {...common} className="text-red-400" />
      default:
        return (
          <Clock
            size={20}
            style={{ color: colors.textSecondary }}
            aria-hidden
          />
        )
    }
  }

  const getStatusBadgeStyle = (
    status: string
  ): { backgroundColor: string; color: string } => {
    switch (status) {
      case 'eligible':
      case 'active':
      case 'approved':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          color: '#166534',
        }
      case 'pending':
        return {
          backgroundColor: 'rgba(251, 191, 36, 0.28)',
          color: '#92400e',
        }
      case 'not-eligible':
      case 'denied':
        return {
          backgroundColor: 'rgba(248, 113, 113, 0.2)',
          color: '#991b1b',
        }
      default:
        return {
          backgroundColor: `color-mix(in srgb, ${colors.textSecondary} 22%, transparent)`,
          color: colors.textPrimary,
        }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const lineColor = colors.border
  const nodeBg = colors.cardBackground
  const nodeBorder = colors.primary
  const cardBg = `color-mix(in srgb, ${colors.primary} 8%, ${colors.cardBackground})`
  const cardBorder = colors.border

  return (
    <div className="relative">
      <div
        className="absolute bottom-0 left-5 top-0 w-0.5"
        style={{ backgroundColor: lineColor }}
        aria-hidden
      />

      <div className="space-y-6">
        {items.map((item) => {
          const badgeStyle = getStatusBadgeStyle(item.status)
          return (
            <div key={item.id} className="relative flex items-start gap-4">
              <div
                className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow-sm"
                style={{
                  backgroundColor: nodeBg,
                  borderColor: nodeBorder,
                  boxShadow: `0 0 0 1px color-mix(in srgb, ${colors.primary} 25%, transparent)`,
                }}
              >
                {getStatusIcon(item.status)}
              </div>

              <div className="min-w-0 flex-1 pb-6">
                <div
                  className="rounded-xl border p-4 shadow-sm"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    boxShadow: `0 1px 0 color-mix(in srgb, ${colors.primary} 12%, transparent)`,
                  }}
                >
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h4
                        className="text-sm font-semibold"
                        style={{ color: colors.textPrimary }}
                      >
                        {item.action}
                      </h4>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: colors.textSecondary }}
                      >
                        {formatDate(item.date)}
                      </p>
                    </div>
                    <span
                      className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={badgeStyle}
                    >
                      {item.result}
                    </span>
                  </div>
                  <p
                    className="mb-2 text-sm leading-relaxed"
                    style={{ color: colors.textSecondary }}
                  >
                    {item.details}
                  </p>
                  {item.performedBy ? (
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      Performed by: {item.performedBy}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Timeline
