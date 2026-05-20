import {
  Users,
  FileCheck,
  Clock,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { getStatData } from '../../contexts/DashboardContext'

interface StatCardConfig {
  dataSource: 'stat-total-patients' | 'stat-eligibility-today' | 'stat-pending-auth' | 'stat-approved-auth'
  icon: LucideIcon
  bgColor: string
  textColor: string
}

const STAT_CARDS: StatCardConfig[] = [
  {
    dataSource: 'stat-total-patients',
    icon: Users,
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-500',
  },
  {
    dataSource: 'stat-eligibility-today',
    icon: FileCheck,
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-400',
  },
  {
    dataSource: 'stat-pending-auth',
    icon: Clock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-500',
  },
  {
    dataSource: 'stat-approved-auth',
    icon: CheckCircle2,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-500',
  },
]

const StatCards = () => {
  const { theme } = useTheme()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon
        const stat = getStatData(card.dataSource)
        return (
          <div
            key={card.dataSource}
            className="rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            style={{
              backgroundColor: theme.colors.cardBackground,
              border: `1px solid ${theme.colors.cardBorder}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm font-bold"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {stat.label}
                </p>
                <p className={`text-3xl font-bold ${card.textColor} mt-2`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={card.textColor} size={24} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatCards
