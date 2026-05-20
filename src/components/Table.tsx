import { ReactNode } from 'react'
import { useTheme } from '../contexts/ThemeContext'

interface TableProps {
  children: ReactNode
  className?: string
}

interface TableHeaderProps {
  children: ReactNode
  className?: string
}

interface TableRowProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

interface TableCellProps {
  children: ReactNode
  className?: string
  colSpan?: number
}

export const Table = ({ children, className = '' }: TableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className}`}>{children}</table>
    </div>
  )
}

export const TableHeader = ({ children, className = '' }: TableHeaderProps) => {
  const { theme } = useTheme()
  
  return (
    <thead
      className={className}
      style={{
        backgroundColor: theme.colors.tableHeaderBackground,
      }}
    >
      {children}
    </thead>
  )
}

export const TableHeaderCell = ({ children, className = '' }: TableCellProps) => {
  const { theme } = useTheme()
  
  return (
    <th
      className={`px-3 py-2.5 sm:px-6 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${className}`}
      style={{
        color: theme.colors.tableHeaderText,
      }}
    >
      {children}
    </th>
  )
}

export const TableBody = ({ children, className = '' }: TableProps) => {
  return <tbody className={className}>{children}</tbody>
}

export const TableRow = ({ children, className = '', onClick }: TableRowProps) => {
  const { theme } = useTheme()
  
  return (
    <tr
      className={`transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        backgroundColor: theme.colors.tableRowBackground,
        borderBottom: `1px solid ${theme.colors.tableBorder}`,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.tableRowHover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.tableRowBackground
      }}
    >
      {children}
    </tr>
  )
}

export const TableCell = ({ children, className = '', colSpan }: TableCellProps) => {
  const { theme } = useTheme()
  
  return (
    <td
      colSpan={colSpan}
      className={`px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm ${className}`}
      style={{
        color: theme.colors.textPrimary,
      }}
    >
      {children}
    </td>
  )
}

