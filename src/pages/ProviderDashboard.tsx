import { useState, useMemo } from 'react'
import {
  ChevronDown,
  Settings2,
} from 'lucide-react'
import {
  eligibilityChecks,
  payors,
  statuses,
} from '../data/mockData'
import DateRangePicker from '../components/DateRangePicker'
import { useTheme } from '../contexts/ThemeContext'
import { useDashboard } from '../contexts/DashboardContext'
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../components/Table'
import ChartWidget from '../components/dashboard/ChartWidget'
import StatCards from '../components/dashboard/StatCards'
import { Link } from 'react-router-dom'
import { ROUTES } from '../routes/routeMap'

const ProviderDashboard = () => {
  const { theme } = useTheme()
  const { config } = useDashboard()
  const [selectedPayor, setSelectedPayor] = useState<string>('All Payors')
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses')
  const [customFromDate, setCustomFromDate] = useState<string>('')
  const [customToDate, setCustomToDate] = useState<string>('')

  const filteredChecks = useMemo(() => {
    return eligibilityChecks.filter((check) => {
      const payorMatch =
        selectedPayor === 'All Payors' || check.payor === selectedPayor
      const statusMatch =
        selectedStatus === 'All Statuses' || check.status === selectedStatus

      let dateMatch = true
      if (customFromDate && customToDate) {
        const checkDate = new Date(check.date)
        checkDate.setHours(0, 0, 0, 0)
        const start = new Date(customFromDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(customToDate)
        end.setHours(23, 59, 59, 999)
        dateMatch = checkDate >= start && checkDate <= end
      }

      return payorMatch && statusMatch && dateMatch
    })
  }, [selectedPayor, selectedStatus, customFromDate, customToDate])

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800'
      case 'Pending Authorization':
        return 'bg-yellow-100 text-yellow-800'
      case 'Pending Paperwork':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCoverageBadgeClass = (coverage: string): string => {
    switch (coverage) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Inactive':
        return 'bg-red-100 text-red-800'
      case 'Pending Verification':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const visibleWidgets = config.widgets
    .filter((w) => w.visible && w.type !== 'stat-card')
    .sort((a, b) => a.order - b.order)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" style={{ backgroundColor: theme.colors.background }}>
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1
              className="text-xl sm:text-2xl font-bold text-left"
              style={{ color: theme.colors.textPrimary }}
            >
              Provider Dashboard
            </h1>
            <p
              className="mt-1 text-left"
              style={{ color: theme.colors.textSecondary }}
            >
              Overview of your practice metrics and recent activity
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end w-full lg:w-auto">
            <Link
              to={ROUTES.DASHBOARD_SETTINGS}
              className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto shrink-0"
              style={{
                color: theme.colors.textSecondary,
                border: `1px solid ${theme.colors.border}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primaryLight
                e.currentTarget.style.color = theme.colors.primary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = theme.colors.textSecondary
              }}
            >
              <Settings2 size={16} />
              Customize
            </Link>
            <DateRangePicker
              fromDate={customFromDate}
              toDate={customToDate}
              onChange={(from, to) => {
                setCustomFromDate(from)
                setCustomToDate(to)
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {config.showStatCards && <StatCards />}

      {/* Chart Widgets Grid */}
      {visibleWidgets.length > 0 && (
        <div className="grid grid-cols-12 gap-4">
          {visibleWidgets.map((widget) => (
            <ChartWidget key={widget.id} widget={widget} />
          ))}
        </div>
      )}

      {/* Recent Eligibility Checks */}
      <div
        className="rounded-lg shadow-sm min-h-[min(28rem,70vh)] sm:min-h-[400px] lg:min-h-[600px]"
        style={{
          backgroundColor: theme.colors.cardBackground,
          border: `1px solid ${theme.colors.cardBorder}`,
        }}
      >
        <div className="p-4 sm:p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: theme.colors.textPrimary }}
          >
            Recent Patient Eligibility Checks
          </h2>
          <div
            className="mb-4"
            style={{ borderBottom: `1px solid ${theme.colors.border}` }}
          ></div>

          {/* Payor and Status Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payor Filter */}
            <div className="relative w-full">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: theme.colors.textPrimary }}
              >
                Payor
              </label>
              <div className="relative">
                <select
                  value={selectedPayor}
                  onChange={(e) => setSelectedPayor(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent appearance-none text-sm transition-colors"
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    border: `1px solid ${theme.colors.border}`,
                    color: theme.colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.primary
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primaryLight}`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.border
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {payors.map((payor) => (
                    <option key={payor} value={payor}>
                      {payor}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  style={{ color: theme.colors.textSecondary }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative w-full">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: theme.colors.textPrimary }}
              >
                Status
              </label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent appearance-none text-sm transition-colors"
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    border: `1px solid ${theme.colors.border}`,
                    color: theme.colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.primary
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primaryLight}`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.border
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  style={{ color: theme.colors.textSecondary }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <tr>
              <TableHeaderCell>Patient Name</TableHeaderCell>
              <TableHeaderCell>Patient ID</TableHeaderCell>
              <TableHeaderCell>Payor</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Service Type</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Coverage</TableHeaderCell>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredChecks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  <span style={{ color: theme.colors.textSecondary }}>
                    No eligibility checks found matching the selected filters.
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              filteredChecks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {check.patientName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      {check.patientId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{check.payor}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(check.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {check.serviceType}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                        check.status
                      )}`}
                    >
                      {check.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCoverageBadgeClass(
                        check.coverage
                      )}`}
                    >
                      {check.coverage}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Results Count */}
        <div
          className="px-4 sm:px-6 py-4"
          style={{
            borderTop: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.tableHeaderBackground,
          }}
        >
          <p
            className="text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Showing <span className="font-medium" style={{ color: theme.colors.textPrimary }}>{filteredChecks.length}</span>{' '}
            of <span className="font-medium" style={{ color: theme.colors.textPrimary }}>{eligibilityChecks.length}</span>{' '}
            eligibility checks
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProviderDashboard
