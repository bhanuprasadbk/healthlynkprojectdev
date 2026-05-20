import { useState, ChangeEvent, FormEvent, useEffect, useCallback } from 'react'
import { MapPin, Plus, Save, Star, Pencil, Trash2 } from 'lucide-react'
import Input from '../components/forms/Input'
import Select from '../components/forms/Select'
import Button from '../components/forms/Button'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import { stateOptions } from '../data/providerConfig'
import {
  createProvider,
  deleteProvider,
  listProviders,
  setDefaultProviderLocation,
  updateProvider,
  type ApiProvider,
  type ApiProviderLocation,
} from '../services/providerNpiService'

interface ProviderLocation {
  id: string
  apiId?: string
  location: string
  practiceState: string
  isPrimary: boolean
}

interface ProviderEntry {
  id: string
  firstName: string
  lastName: string
  npiCode: string
  faxNumber: string
  taxNumber: string
  pin: string
  isDefault: boolean
  locations: ProviderLocation[]
}

interface ProviderFormState {
  firstName: string
  lastName: string
  npiCode: string
  faxNumber: string
  taxNumber: string
  pin: string
  locations: ProviderLocation[]
}

const createEmptyLocation = (index = 0): ProviderLocation => ({
  id: `${Date.now()}-${index}`,
  apiId: undefined,
  location: '',
  practiceState: '',
  isPrimary: index === 0,
})

const createInitialFormState = (): ProviderFormState => ({
  firstName: '',
  lastName: '',
  npiCode: '',
  faxNumber: '',
  taxNumber: '',
  pin: '',
  locations: [createEmptyLocation(0)],
})

const ProviderNpiLocation = () => {
  const [providers, setProviders] = useState<ProviderEntry[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [formData, setFormData] = useState<ProviderFormState>(createInitialFormState())
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [isLoadingProviders, setIsLoadingProviders] = useState(false)
  const [isSubmittingProvider, setIsSubmittingProvider] = useState(false)
  const [isDeletingProviderId, setIsDeletingProviderId] = useState<string | null>(null)
  const [providerDeleteConfirm, setProviderDeleteConfirm] = useState<ProviderEntry | null>(null)
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null)
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(null)
  const [isSettingDefaultProviderId, setIsSettingDefaultProviderId] = useState<string | null>(null)

  const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  const parseString = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : fallback

  const normalizeLocation = useCallback(
    (location: ApiProviderLocation, providerId: string, index: number): ProviderLocation => ({
      id: parseString(location.id, `${providerId}-loc-${index + 1}`),
      apiId: parseString(location.id, ''),
      location: parseString(location.location_name ?? location.location, ''),
      practiceState: parseString(
        location.state_code ?? location.practiceState ?? location.practice_state,
        ''
      ),
      isPrimary:
        typeof location.isPrimary === 'boolean'
          ? location.isPrimary
          : Boolean(location.is_primary),
    }),
    []
  )

  const normalizeProvider = useCallback(
    (provider: ApiProvider, index: number): ProviderEntry => {
      const providerId = parseString(provider.id, `provider-${index + 1}`)
      const normalizedLocations = Array.isArray(provider.locations)
        ? provider.locations.map((location, locationIndex) =>
            normalizeLocation(location, providerId, locationIndex)
          )
        : []
      const hasPrimary = normalizedLocations.some((location) => location.isPrimary)
      const locations =
        normalizedLocations.length > 0
          ? hasPrimary
            ? normalizedLocations
            : normalizedLocations.map((location, locationIndex) =>
                locationIndex === 0 ? { ...location, isPrimary: true } : location
              )
          : []

      return {
        id: providerId,
        firstName: parseString(provider.firstName ?? provider.first_name, ''),
        lastName: parseString(provider.lastName ?? provider.last_name, ''),
        npiCode: parseString(provider.npi ?? provider.npiCode ?? provider.npi_code, ''),
        faxNumber: parseString(provider.faxNumber ?? provider.fax_number, ''),
        taxNumber: parseString(asRecord(provider).tax_number, ''),
        pin: parseString(provider.pin, ''),
        isDefault:
          typeof provider.isDefault === 'boolean'
            ? provider.isDefault
            : Boolean(provider.is_default),
        locations,
      }
    },
    [normalizeLocation]
  )

  const loadProviders = useCallback(async () => {
    setIsLoadingProviders(true)
    try {
      const response = await listProviders()
      const responseRecord = asRecord(response)
      const maybeArray = Array.isArray(response)
        ? response
        : Array.isArray(responseRecord.data)
          ? (responseRecord.data as ApiProvider[])
          : Array.isArray(asRecord(responseRecord.data).providers)
            ? (asRecord(responseRecord.data).providers as ApiProvider[])
            : []
      const normalized = maybeArray.map((provider, index) => normalizeProvider(provider, index))
      setProviders(normalized)
      const apiDefaultProvider =
        normalized.find((provider) => provider.isDefault) ??
        normalized.find((provider) =>
          provider.locations.some((location) => location.isPrimary)
        )
      setDefaultProviderId(apiDefaultProvider?.id ?? null)
    } catch (error) {
      setToastType('error')
      setToastMessage(error instanceof Error ? error.message : 'Unable to load providers')
      setShowToast(true)
    } finally {
      setIsLoadingProviders(false)
    }
  }, [normalizeProvider])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  const resetForm = () => {
    setFormData(createInitialFormState())
  }

  const handleProviderFieldChange =
    (field: keyof Omit<ProviderFormState, 'locations'>) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (field === 'npiCode') {
        setFormData((prev) => ({
          ...prev,
          npiCode: value.replace(/\D/g, '').slice(0, 10),
        }))
        return
      }
      if (field === 'faxNumber') {
        setFormData((prev) => ({
          ...prev,
          faxNumber: value.replace(/[^\d()-\s+]/g, '').slice(0, 20),
        }))
        return
      }
      if (field === 'pin') {
        setFormData((prev) => ({
          ...prev,
          pin: value.replace(/\D/g, '').slice(0, 10),
        }))
        return
      }
      setFormData((prev) => ({ ...prev, [field]: value }))
    }

  const handleLocationChange =
    (locationId: string, field: 'location' | 'practiceState') =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value
      setFormData((prev) => ({
        ...prev,
        locations: prev.locations.map((location) =>
          location.id === locationId ? { ...location, [field]: value } : location
        ),
      }))
    }

  const addLocationRow = () => {
    setFormData((prev) => ({
      ...prev,
      locations: [...prev.locations, createEmptyLocation(prev.locations.length)],
    }))
  }

  const removeLocationRow = (locationId: string) => {
    setFormData((prev) => {
      if (prev.locations.length === 1) {
        return prev
      }

      const filtered = prev.locations.filter((location) => location.id !== locationId)
      const hasPrimary = filtered.some((location) => location.isPrimary)
      return {
        ...prev,
        locations: hasPrimary
          ? filtered
          : filtered.map((location, index) =>
              index === 0 ? { ...location, isPrimary: true } : location
            ),
      }
    })
  }

  const setPrimaryLocation = (locationId: string) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.map((location) => ({
        ...location,
        isPrimary: location.id === locationId,
      })),
    }))
  }

  const openAddModal = () => {
    setEditingProviderId(null)
    resetForm()
    setIsAddModalOpen(true)
  }

  const openEditModal = (provider: ProviderEntry) => {
    setEditingProviderId(provider.id)
    setFormData({
      firstName: provider.firstName,
      lastName: provider.lastName,
      npiCode: provider.npiCode,
      faxNumber: provider.faxNumber,
      taxNumber: provider.taxNumber,
      pin: provider.pin,
      locations:
        provider.locations.length > 0
          ? provider.locations.map((location) => ({ ...location }))
          : [createEmptyLocation(0)],
    })
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
    setEditingProviderId(null)
    resetForm()
  }

  const handleAddProvider = async (e: FormEvent) => {
    e.preventDefault()
    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    const npiCode = formData.npiCode.trim()
    const faxNumber = formData.faxNumber.trim()
    const taxNumber = formData.taxNumber.trim()
    const pin = formData.pin.trim()
    const normalizedLocations = formData.locations.map((location) => ({
      ...location,
      location: location.location.trim(),
      practiceState: location.practiceState,
    }))

    if (!firstName || !lastName) {
      setToastType('error')
      setToastMessage('Doctor first name and last name are required.')
      setShowToast(true)
      return
    }
    if (!/^\d{10}$/.test(npiCode)) {
      setToastType('error')
      setToastMessage('NPI code must be exactly 10 digits.')
      setShowToast(true)
      return
    }
    if (!pin) {
      setToastType('error')
      setToastMessage('PIN is required.')
      setShowToast(true)
      return
    }
    if (normalizedLocations.some((location) => !location.location || !location.practiceState)) {
      setToastType('error')
      setToastMessage('Each location requires location name and practice state.')
      setShowToast(true)
      return
    }

    const hasPrimary = normalizedLocations.some((location) => location.isPrimary)
    const locations = hasPrimary
      ? normalizedLocations
      : normalizedLocations.map((location, index) =>
          index === 0 ? { ...location, isPrimary: true } : location
        )

    setIsSubmittingProvider(true)
    try {
      const payloadLocations = locations.map((location) => ({
        ...(location.apiId ? { id: location.apiId } : {}),
        location_name: location.location,
        state_code: location.practiceState,
        is_primary: location.isPrimary,
      }))

      if (editingProviderId) {
        await updateProvider(editingProviderId, {
          first_name: firstName,
          last_name: lastName,
          fax_number: faxNumber,
          tax_number: taxNumber,
          pin,
          locations: payloadLocations,
        })
      } else {
        await createProvider({
          first_name: firstName,
          last_name: lastName,
          npi: npiCode,
          fax_number: faxNumber,
          tax_number: taxNumber,
          pin,
          locations: payloadLocations,
        })
      }

      await loadProviders()
      setToastType('success')
      setToastMessage(
        editingProviderId
          ? 'Provider details updated successfully.'
          : 'NPI and location details added successfully.'
      )
      setShowToast(true)
      closeAddModal()
    } catch (error) {
      setToastType('error')
      setToastMessage(
        error instanceof Error
          ? error.message
          : editingProviderId
            ? 'Unable to update provider'
            : 'Unable to create provider'
      )
      setShowToast(true)
    } finally {
      setIsSubmittingProvider(false)
    }
  }

  const handleSetDefault = async (provider: ProviderEntry) => {
    const primary = provider.locations.find((location) => location.isPrimary)
    const targetLocation = primary ?? provider.locations[0]
    if (!targetLocation) {
      setToastType('error')
      setToastMessage('No location available to set as default.')
      setShowToast(true)
      return
    }

    setIsSettingDefaultProviderId(provider.id)
    try {
      const response = await setDefaultProviderLocation(provider.id)
      setDefaultProviderId(provider.id)
      setProviders((prev) =>
        prev.map((row) => {
          if (row.id === provider.id) {
            return {
              ...row,
              isDefault: true,
              locations: row.locations.map((location) => ({
                ...location,
                isPrimary: location.id === targetLocation.id,
              })),
            }
          }
          return {
            ...row,
            isDefault: false,
          }
        })
      )
      setToastType('success')
      setToastMessage(
        (typeof response?.message === 'string' && response.message) ||
          'Default location updated successfully.'
      )
      setShowToast(true)
    } catch (error) {
      setToastType('error')
      setToastMessage(error instanceof Error ? error.message : 'Unable to set default location.')
      setShowToast(true)
    } finally {
      setIsSettingDefaultProviderId(null)
    }
  }

  const handleDeleteProvider = async (provider: ProviderEntry) => {
    setIsDeletingProviderId(provider.id)
    try {
      await deleteProvider(provider.id)
      setProviders((prev) => prev.filter((row) => row.id !== provider.id))
      setDefaultProviderId((prev) => (prev === provider.id ? null : prev))
      setProviderDeleteConfirm(null)
      setToastType('success')
      setToastMessage('Provider deleted successfully.')
      setShowToast(true)
    } catch (error) {
      setToastType('error')
      setToastMessage(error instanceof Error ? error.message : 'Unable to delete provider')
      setShowToast(true)
    } finally {
      setIsDeletingProviderId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="h-7 w-7 text-gray-700 shrink-0" aria-hidden />
          NPI &amp; location
        </h1>
        <Button variant="primary" onClick={openAddModal} className="w-full sm:w-auto">
          <span className="inline-flex items-center gap-2">
            <Plus size={18} aria-hidden />
            Add NPI and Location
          </span>
        </Button>
      </div>
      <p className="text-gray-600 text-sm sm:text-base">
        Manage provider records with NPI, PIN, fax and multiple practice locations. Mark one location as primary for each doctor.
      </p>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">
                  Doctor Name
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">
                  NPI Code
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">
                  Location
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">
                  Default
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">
                  Fax Number
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">
                  PIN
                </th>
                <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingProviders ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                    Loading providers...
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No provider records yet. Click &quot;Add NPI and Location&quot; to create one.
                  </td>
                </tr>
              ) : (
                providers.map((provider) => {
                  const primaryLocation = provider.locations.find((location) => location.isPrimary)
                  return (
                    <tr key={provider.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 text-sm text-gray-900">{`${provider.firstName} ${provider.lastName}`}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{provider.npiCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="space-y-1">
                          {provider.locations.length === 0 ? (
                            <span>-</span>
                          ) : (
                            provider.locations.map((location) => (
                              <div key={location.id} className="flex items-center gap-2">
                                <span>{`${location.location} (${location.practiceState})`}</span>
                                {location.isPrimary && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                                    <Star size={12} aria-hidden />
                                    Primary
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                          {!primaryLocation && provider.locations.length > 0 && (
                            <span className="text-xs text-gray-500">No primary location selected</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={defaultProviderId === provider.id}
                          aria-label={`Set ${provider.firstName} ${provider.lastName} as default`}
                          disabled={
                            provider.locations.length === 0 ||
                            isSettingDefaultProviderId !== null
                          }
                          onClick={() => handleSetDefault(provider)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            defaultProviderId === provider.id
                              ? 'bg-primary-600'
                              : 'bg-gray-300'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              defaultProviderId === provider.id ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{provider.faxNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{provider.pin}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            className="text-primary-600 hover:text-primary-900 transition-colors"
                            title="Edit Provider"
                            onClick={() => openEditModal(provider)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete Provider"
                            disabled={isDeletingProviderId === provider.id}
                            onClick={() => setProviderDeleteConfirm(provider)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title={editingProviderId ? 'Edit Provider' : 'Add NPI and Location'}
        size="lg"
      >
        <form onSubmit={handleAddProvider} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Provider First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleProviderFieldChange('firstName')}
              placeholder="Enter first name"
              required
            />
            <Input
              label="Provider Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleProviderFieldChange('lastName')}
              placeholder="Enter last name"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="NPI Code"
              name="npiCode"
              value={formData.npiCode}
              onChange={handleProviderFieldChange('npiCode')}
              placeholder="10-digit NPI code"
              disabled={editingProviderId !== null}
              required
            />
            <Input
              label="Fax Number"
              name="faxNumber"
              value={formData.faxNumber}
              onChange={handleProviderFieldChange('faxNumber')}
              placeholder="Enter fax number"
            />
            <Input
              label="PIN"
              name="pin"
              value={formData.pin}
              onChange={handleProviderFieldChange('pin')}
              placeholder="Enter PIN"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tax Number"
              name="taxNumber"
              value={formData.taxNumber}
              onChange={handleProviderFieldChange('taxNumber')}
              placeholder="12-3456789"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Locations</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addLocationRow}>
                Add another location
              </Button>
            </div>

            {formData.locations.map((location, index) => (
              <div key={location.id} className="rounded-lg border border-gray-200 p-3 sm:p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label={`Location ${index + 1}`}
                    name={`location-${location.id}`}
                    value={location.location}
                    onChange={handleLocationChange(location.id, 'location')}
                    placeholder="Enter location"
                    required
                  />
                  <Select
                    label="Practice Location (State)"
                    name={`state-${location.id}`}
                    value={location.practiceState}
                    onChange={handleLocationChange(location.id, 'practiceState')}
                    options={stateOptions}
                    placeholder="Select state"
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={location.isPrimary}
                      onChange={() => setPrimaryLocation(location.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Mark as Primary Location
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLocationRow(location.id)}
                    disabled={formData.locations.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingProvider}>
              <span className="inline-flex items-center gap-2">
                <Save size={18} aria-hidden />
                {isSubmittingProvider
                  ? 'Saving...'
                  : editingProviderId
                    ? 'Update Provider'
                    : 'Save NPI and Location'}
              </span>
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={providerDeleteConfirm !== null}
        onClose={() => setProviderDeleteConfirm(null)}
        title="Delete Provider"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {providerDeleteConfirm
              ? `Are you sure you want to delete "${providerDeleteConfirm.firstName} ${providerDeleteConfirm.lastName}"? This action cannot be undone.`
              : 'Are you sure you want to delete this provider?'}
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingProviderId !== null}
              onClick={() => setProviderDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={providerDeleteConfirm === null || isDeletingProviderId !== null}
              onClick={() => providerDeleteConfirm && handleDeleteProvider(providerDeleteConfirm)}
            >
              {isDeletingProviderId !== null ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
      />
    </div>
  )
}

export default ProviderNpiLocation
