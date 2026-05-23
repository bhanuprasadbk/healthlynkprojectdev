import { ChangeEvent, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import type { PayorFeeScheduleRow } from '../../../data/payorData'
import {
  feeBasisOptions,
  feeScheduleModifierOptions,
  feeScheduleYearOptions,
  formatPayorDate,
} from '../../../data/payorData'
import { fieldClass } from '../payorConfigTypes'
import { newFeeScheduleRow } from '../payorConfigUtils'

type PayorFeeSchedulesTabProps = {
  rows: PayorFeeScheduleRow[]
  onChange: (rows: PayorFeeScheduleRow[]) => void
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pb-3 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function modifierBadgeClass(modifier: string): string {
  if (modifier === 'NU') return 'bg-blue-100 text-blue-800'
  if (modifier === 'RR') return 'bg-gray-100 text-gray-700'
  return 'bg-gray-100 text-gray-500'
}

const cellInputClass = `${fieldClass} py-1.5 text-sm`

const PayorFeeSchedulesTab = ({ rows, onChange }: PayorFeeSchedulesTabProps) => {
  const [scheduleYear, setScheduleYear] = useState('2025')
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set())

  const isEditing = (row: PayorFeeScheduleRow) =>
    row.isDraft === true || editingIds.has(row.id)

  const updateRow = (id: string, field: keyof PayorFeeScheduleRow, value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const addRow = () => {
    if (rows.some((row) => row.isDraft)) return
    onChange([...rows, newFeeScheduleRow()])
  }

  const removeRow = (id: string) => {
    onChange(rows.filter((row) => row.id !== id))
    setEditingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const startEdit = (id: string) => {
    setEditingIds((prev) => new Set(prev).add(id))
  }

  const commitRow = (row: PayorFeeScheduleRow) => {
    if (row.isDraft && row.hcpcsCode.trim()) {
      onChange(
        rows.map((r) =>
          r.id === row.id ? { ...r, isDraft: false } : r
        )
      )
    }
    setEditingIds((prev) => {
      const next = new Set(prev)
      next.delete(row.id)
      return next
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <SectionTitle
          title="Fee schedule"
          subtitle="Allowed amounts by procedure code."
        />
        <div className="relative shrink-0">
          <select
            value={scheduleYear}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setScheduleYear(e.target.value)}
            className={`${fieldClass} py-1.5 pr-8 text-sm font-medium min-w-[9.5rem] appearance-none`}
            aria-label="Fee schedule year"
          >
            {feeScheduleYearOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No fee codes configured. Add a fee code below.
          </p>
        ) : (
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  HCPCS/CPT
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Modifier
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Allowed amt
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Fee basis
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  % of Medicare
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Effective
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-16">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const editing = isEditing(row)
                return (
                  <tr key={row.id} className="align-middle">
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          value={row.hcpcsCode}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            updateRow(row.id, 'hcpcsCode', e.target.value)
                          }
                          className={cellInputClass}
                          placeholder="E0000"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{row.hcpcsCode}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          value={row.description}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            updateRow(row.id, 'description', e.target.value)
                          }
                          className={cellInputClass}
                          placeholder="Description"
                        />
                      ) : (
                        <span className="text-sm text-gray-700">{row.description}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <select
                          value={row.modifier}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                            updateRow(row.id, 'modifier', e.target.value)
                          }
                          className={cellInputClass}
                        >
                          {feeScheduleModifierOptions.map((opt) => (
                            <option key={opt.value || 'none'} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : row.modifier ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${modifierBadgeClass(
                            row.modifier
                          )}`}
                        >
                          {row.modifier}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          value={row.allowedAmount}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            updateRow(row.id, 'allowedAmount', e.target.value)
                          }
                          className={cellInputClass}
                          placeholder="$0.00"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{row.allowedAmount || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <select
                          value={row.feeBasis}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                            updateRow(row.id, 'feeBasis', e.target.value)
                          }
                          className={cellInputClass}
                        >
                          {feeBasisOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-700">{row.feeBasis || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          value={row.percentOfMedicare}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            updateRow(row.id, 'percentOfMedicare', e.target.value)
                          }
                          className={cellInputClass}
                          placeholder="100%"
                        />
                      ) : (
                        <span className="text-sm text-gray-700">
                          {row.percentOfMedicare || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          type="date"
                          value={row.effectiveDate}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            updateRow(row.id, 'effectiveDate', e.target.value)
                          }
                          className={cellInputClass}
                        />
                      ) : (
                        <span className="text-sm text-gray-700">
                          {formatPayorDate(row.effectiveDate)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => commitRow(row)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Save fee code"
                              aria-label="Save fee code"
                            >
                              <Check size={16} />
                            </button>
                            {row.isDraft && (
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Remove fee code"
                                aria-label="Remove fee code"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(row.id)}
                              className="text-primary-600 hover:text-primary-900 p-1"
                              title="Edit fee code"
                              aria-label="Edit fee code"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Remove fee code"
                              aria-label="Remove fee code"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800"
      >
        <Plus size={14} />
        Add fee code
      </button>
    </section>
  )
}

export default PayorFeeSchedulesTab
