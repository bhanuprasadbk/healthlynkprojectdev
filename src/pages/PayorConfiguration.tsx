import { useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/forms/Button'
import PayorConfigurationDrawer from '../components/payor/PayorConfigurationDrawer'
import { Payor, initialPayors, formatPayorDate } from '../data/payorData'
import { useToast } from '../contexts/ToastContext'

function statusDotClass(status: Payor['status']): string {
  if (status === 'active') return 'bg-green-500'
  if (status === 'pending') return 'bg-orange-400'
  return 'bg-gray-400'
}

function statusBadgeClass(status: Payor['status']): string {
  if (status === 'active') return 'bg-green-100 text-green-800'
  if (status === 'pending') return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-600'
}

const PayorConfiguration = () => {
  const { showToast } = useToast()
  const [payors, setPayors] = useState<Payor[]>(initialPayors)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editingPayor, setEditingPayor] = useState<Payor | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletePayorConfirm, setDeletePayorConfirm] = useState<string | null>(null)

  const filteredPayors = payors.filter((payor) => {
    const term = searchTerm.toLowerCase()
    return (
      payor.payorName.toLowerCase().includes(term) ||
      payor.payorId.toLowerCase().includes(term) ||
      payor.contractType.toLowerCase().includes(term)
    )
  })

  const openCreateDrawer = () => {
    setDrawerMode('create')
    setEditingPayor(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = (payor: Payor) => {
    setDrawerMode('edit')
    setEditingPayor(payor)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingPayor(null)
  }

  const handleSavePayor = (payor: Payor) => {
    if (drawerMode === 'edit' && editingPayor) {
      setPayors((prev) => prev.map((p) => (p.id === editingPayor.id ? payor : p)))
      showToast('Payor updated successfully.', { type: 'success' })
    } else {
      setPayors((prev) => [...prev, payor])
      showToast('Payor created successfully.', { type: 'success' })
    }
  }

  const handleDeletePayor = (payorId: string) => {
    setPayors((prev) => prev.filter((payor) => payor.id !== payorId))
    setDeletePayorConfirm(null)
    showToast('Payor deleted successfully.', { type: 'success' })
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payor Configuration</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage insurance payors, contract details, and plan coverage settings.
          </p>
        </div>
        <Button
          onClick={openCreateDrawer}
          variant="primary"
          className="w-full sm:w-auto shrink-0 justify-center"
        >
          <div className="flex items-center justify-center">
            <Plus size={18} className="mr-2" />
            Add payor
          </div>
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900">All payors</h2>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {payors.length} configured
            </span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search payors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredPayors.length === 0 ? (
          <div className="px-4 sm:px-6 py-12 text-center text-gray-500 text-sm">
            {searchTerm
              ? 'No payors found matching your search.'
              : 'No payors configured. Click "Add payor" to get started.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payor name
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payor ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract type
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plans
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayors.map((payor) => (
                  <tr key={payor.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(payor.status)}`}
                          aria-hidden
                        />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {payor.payorName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{payor.payorId}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{payor.contractType}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">
                      {formatPayorDate(payor.effectiveDate)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">{payor.plans.length}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${statusBadgeClass(
                          payor.status
                        )}`}
                      >
                        {payor.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(payor)}
                          className="text-primary-600 hover:text-primary-900 transition-colors p-1.5"
                          title="Edit Payor"
                          aria-label="Edit Payor"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletePayorConfirm(payor.id)}
                          className="text-red-600 hover:text-red-900 transition-colors p-1.5"
                          title="Delete Payor"
                          aria-label="Delete Payor"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredPayors.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredPayors.length}</span> of{' '}
              <span className="font-medium">{payors.length}</span> payors
            </p>
          </div>
        )}
      </div>

      <PayorConfigurationDrawer
        open={drawerOpen}
        mode={drawerMode}
        payor={editingPayor}
        onClose={closeDrawer}
        onSave={handleSavePayor}
      />

      <Modal
        isOpen={deletePayorConfirm !== null}
        onClose={() => setDeletePayorConfirm(null)}
        title="Delete Payor"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this payor? This will also remove all associated plans.
            This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setDeletePayorConfirm(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => deletePayorConfirm && handleDeletePayor(deletePayorConfirm)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PayorConfiguration
