import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

interface DateRangePickerProps {
  fromDate: string
  toDate: string
  onChange: (fromDate: string, toDate: string) => void
}

type PresetRange = 
  | 'today'
  | 'last7days'
  | 'last14days'
  | 'last30days'
  | 'last3months'
  | 'last12months'
  | 'monthToDate'
  | 'quarterToDate'
  | 'allTime'
  | 'custom'

const DateRangePicker = ({ fromDate, toDate, onChange }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [leftMonth, setLeftMonth] = useState(new Date())
  const [rightMonth, setRightMonth] = useState(() => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth
  })
  const [selectedPreset, setSelectedPreset] = useState<PresetRange | null>(null)
  const [tempFromDate, setTempFromDate] = useState(fromDate)
  const [tempToDate, setTempToDate] = useState(toDate)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setTempFromDate(fromDate)
    setTempToDate(toDate)
  }, [fromDate, toDate])

  const formatDateRange = (): string => {
    if (!fromDate && !toDate) return 'Select date range'
    if (fromDate && toDate) {
      const from = new Date(fromDate)
      const to = new Date(toDate)
      return `${formatDateDisplay(from)} - ${formatDateDisplay(to)}`
    }
    return 'Select date range'
  }

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateInput = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day} / ${month} / ${year}`
  }

  const parseDateInput = (value: string): string => {
    // Parse DD / MM / YYYY format
    const parts = value.split('/').map(p => p.trim())
    if (parts.length === 3) {
      const [day, month, year] = parts
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      return date.toISOString().split('T')[0]
    }
    return ''
  }

  const getPresetDates = (preset: PresetRange): { from: string; to: string } => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const toDate = today.toISOString().split('T')[0]

    let fromDate = new Date()

    switch (preset) {
      case 'today':
        fromDate = new Date(today)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'last7days':
        fromDate.setDate(today.getDate() - 6)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'last14days':
        fromDate.setDate(today.getDate() - 13)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'last30days':
        fromDate.setDate(today.getDate() - 29)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'last3months':
        fromDate.setMonth(today.getMonth() - 3)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'last12months':
        fromDate.setMonth(today.getMonth() - 12)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'monthToDate':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'quarterToDate':
        const quarter = Math.floor(today.getMonth() / 3)
        fromDate = new Date(today.getFullYear(), quarter * 3, 1)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'allTime':
        fromDate = new Date(2000, 0, 1) // Arbitrary old date
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'custom':
        return { from: tempFromDate, to: tempToDate }
      default:
        return { from: tempFromDate, to: tempToDate }
    }

    fromDate.setHours(0, 0, 0, 0)
    return {
      from: fromDate.toISOString().split('T')[0],
      to: toDate,
    }
  }

  const handlePresetClick = (preset: PresetRange) => {
    setSelectedPreset(preset)
    if (preset !== 'custom') {
      const dates = getPresetDates(preset)
      setTempFromDate(dates.from)
      setTempToDate(dates.to)
      
      // Update calendar months to show the date range
      if (dates.from) {
        const fromDate = new Date(dates.from)
        setLeftMonth(new Date(fromDate.getFullYear(), fromDate.getMonth(), 1))
        setRightMonth(new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1))
      }
    }
  }

  const handleDateClick = (day: number, month: Date) => {
    const selectedDate = new Date(month.getFullYear(), month.getMonth(), day)
    const dateString = selectedDate.toISOString().split('T')[0]

    if (!tempFromDate || (tempFromDate && tempToDate) || dateString < tempFromDate) {
      // Start new selection
      setTempFromDate(dateString)
      setTempToDate('')
      setSelectedPreset(null)
    } else if (tempFromDate && !tempToDate) {
      // Complete selection
      if (dateString >= tempFromDate) {
        setTempToDate(dateString)
        setSelectedPreset(null)
      } else {
        setTempFromDate(dateString)
        setTempToDate('')
      }
    }
  }

  const handleSetDate = () => {
    onChange(tempFromDate, tempToDate)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempFromDate(fromDate)
    setTempToDate(toDate)
    setIsOpen(false)
  }

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date): number => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    return firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  }

  const isDateInRange = (date: Date): boolean => {
    if (!tempFromDate || !tempToDate) return false
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const from = new Date(tempFromDate)
    const to = new Date(tempToDate)
    return checkDate > from && checkDate < to
  }

  const isStartDate = (date: Date): boolean => {
    if (!tempFromDate) return false
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const from = new Date(tempFromDate)
    return checkDate.getTime() === from.getTime()
  }

  const isEndDate = (date: Date): boolean => {
    if (!tempToDate) return false
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const to = new Date(tempToDate)
    return checkDate.getTime() === to.getTime()
  }

  const renderCalendar = (month: Date, onMonthChange: (date: Date) => void, isLeft: boolean) => {
    const daysInMonth = getDaysInMonth(month)
    const firstDay = getFirstDayOfMonth(month)
    const days: (number | null)[] = []

    // Previous month days
    const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(prevMonthDays - i)
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    // Next month days to fill the grid
    const remainingCells = 42 - days.length // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      days.push(day)
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]

    const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

    return (
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => {
              const newMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1)
              onMonthChange(newMonth)
              if (isLeft) {
                setRightMonth(new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 1))
              }
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900">
            {monthNames[month.getMonth()]} {month.getFullYear()}
          </h3>
          <button
            type="button"
            onClick={() => {
              const newMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1)
              onMonthChange(newMonth)
              if (!isLeft) {
                setLeftMonth(new Date(newMonth.getFullYear(), newMonth.getMonth() - 1, 1))
              }
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-xs font-medium text-gray-500 text-center py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isPrevMonth = index < firstDay
            const isNextMonth = index >= firstDay + daysInMonth
            let date: Date
            let displayDay: number

            if (isPrevMonth) {
              date = new Date(month.getFullYear(), month.getMonth() - 1, day!)
              displayDay = day!
            } else if (isNextMonth) {
              date = new Date(month.getFullYear(), month.getMonth() + 1, day!)
              displayDay = day!
            } else {
              date = new Date(month.getFullYear(), month.getMonth(), day!)
              displayDay = day!
            }

            const isInRange = isDateInRange(date)
            const isStart = isStartDate(date)
            const isEnd = isEndDate(date)
            const isToday = !isPrevMonth && !isNextMonth && date.toDateString() === new Date().toDateString()

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (!isPrevMonth && !isNextMonth) {
                    handleDateClick(displayDay, month)
                  } else {
                    handleDateClick(displayDay, date)
                  }
                }}
                className={`aspect-square text-sm rounded transition-colors ${
                  isStart || isEnd
                    ? 'bg-purple-600 text-white font-semibold'
                    : isInRange
                    ? 'bg-purple-100 text-purple-900'
                    : isPrevMonth || isNextMonth
                    ? 'text-gray-400 hover:bg-gray-50'
                    : isToday
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {displayDay}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const presets: { label: string; value: PresetRange }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: 'last7days' },
    { label: 'Last 14 Days', value: 'last14days' },
    { label: 'Last 30 Days', value: 'last30days' },
    { label: 'Last 3 months', value: 'last3months' },
    { label: 'Last 12 months', value: 'last12months' },
    { label: 'Month to date', value: 'monthToDate' },
    { label: 'Quarter to date', value: 'quarterToDate' },
    { label: 'All time', value: 'allTime' },
    { label: 'Custom', value: 'custom' },
  ]

  return (
    <div className="relative" ref={pickerRef}>
      {/* Input Field */}
      <div
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer bg-white hover:border-gray-400 transition-colors w-full min-w-0 sm:min-w-[12.5rem] sm:max-w-[20rem]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={18} className="text-gray-400" />
        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
          {formatDateRange()}
        </span>
      </div>

      {/* Calendar Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-full max-w-[min(100vw-1rem,800px)] sm:w-[min(100vw-2rem,800px)] max-h-[min(90vh,880px)] overflow-y-auto overscroll-contain">
          <div className="flex flex-col xl:flex-row min-w-0">
            {/* Left Sidebar - Presets */}
            <div className="w-full xl:w-48 shrink-0 border-b xl:border-b-0 xl:border-r border-gray-200 p-4 bg-gray-50 max-h-[40vh] xl:max-h-none overflow-y-auto xl:overflow-visible">
              <div className="space-y-1">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetClick(preset.value)}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      selectedPreset === preset.value
                        ? 'bg-purple-100 text-purple-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Center - Two Calendars */}
            <div className="flex-1 min-w-0 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-4 justify-center">
                {renderCalendar(leftMonth, setLeftMonth, true)}
                {renderCalendar(rightMonth, setRightMonth, false)}
              </div>
            </div>
          </div>

          {/* Bottom - Date Inputs and Buttons */}
          <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <input
                  type="text"
                  value={formatDateInput(tempFromDate)}
                  onChange={(e) => {
                    const parsed = parseDateInput(e.target.value)
                    if (parsed) setTempFromDate(parsed)
                  }}
                  placeholder="DD / MM / YYYY"
                  className="w-full sm:w-36 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <ArrowRight size={16} className="text-gray-400 shrink-0 hidden sm:block" aria-hidden />
                <input
                  type="text"
                  value={formatDateInput(tempToDate)}
                  onChange={(e) => {
                    const parsed = parseDateInput(e.target.value)
                    if (parsed) setTempToDate(parsed)
                  }}
                  placeholder="DD / MM / YYYY"
                  className="w-full sm:w-36 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-end shrink-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetDate}
                  disabled={!tempFromDate || !tempToDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set Date
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
