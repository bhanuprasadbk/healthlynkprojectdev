import { useState, useMemo, DragEvent, ChangeEvent, FormEvent, useEffect } from 'react'
import { Search, Upload, Download, Filter, Plus, Pencil, Trash2, X } from 'lucide-react'
import Select from '../components/forms/Select'
import SearchableSelect, { type SearchableOption } from '../components/forms/SearchableSelect'
import Button from '../components/forms/Button'
import Input from '../components/forms/Input'
import { apiJsonRequest } from '../services/apiClient'
import { useToast } from '../contexts/ToastContext'
import { useEligibilityServiceConfig } from '../contexts/EligibilityServiceContext'
import { fetchProductServiceTypes } from '../services/productServiceTypesService'
import { categoryOptions, authorizationOptions } from '../data/cptHcpcData'

interface CptHcpcCode {
  id: string
  code: string
  description: string
  authorizationRequired: boolean
  /** Primary slug (matches API ``product_service_slug``; first of ``productServiceSlugs``). */
  productService: string
  productServiceSlugs: string[]
  category: string
}

type ApiCptHcpcCode = {
  id?: string
  code?: string
  cpt_hcpc_code?: string
  description?: string
  authorization_required?: boolean | string
  authorizationRequired?: boolean | string
  product_service_slug?: string
  product_service_slugs?: unknown
  product_service?: string
  productService?: string
  category?: string
}

function normalizeProductServiceSlugsFromApi(row: ApiCptHcpcCode): string[] {
  const raw = row.product_service_slugs
  if (Array.isArray(raw)) {
    const u = [...new Set(raw.map((x) => String(x).trim()).filter(Boolean))]
    if (u.length) return u
  }
  const single =
    (typeof row.product_service_slug === 'string' ? row.product_service_slug.trim() : '') ||
    (typeof row.product_service === 'string' ? row.product_service.trim() : '') ||
    (typeof row.productService === 'string' ? row.productService.trim() : '') ||
    ''
  return single ? [single] : ['other']
}

type ApiCptHcpcResponse = {
  data?: ApiCptHcpcCode[] | { codes?: ApiCptHcpcCode[] }
}

type CreateCptHcpcResponse = {
  data?: ApiCptHcpcCode
  message?: string
}

type UpdateCptHcpcResponse = {
  data?: ApiCptHcpcCode
  message?: string
}

function normalizeCptCategory(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return raw === 'HCPC' ? 'HCPC' : 'CPT'
}

type ProductServiceSelectOption = {
  value: string
  label: string
  /** API `group_label` — used for search and display prefix. */
  groupKey?: string
  /** Extra tokens for search only (group, product name, slug). */
  searchHaystack?: string
}

const CptHcpcConfiguration = () => {
  const { showToast } = useToast()
  const { selectedService: eligibilityServiceVendor } = useEligibilityServiceConfig()
  const [codes, setCodes] = useState<CptHcpcCode[]>([])
  const [isLoadingCodes, setIsLoadingCodes] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedAuthorization, setSelectedAuthorization] = useState<string>('all')
  const [selectedProductService, setSelectedProductService] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [dragActive, setDragActive] = useState<boolean>(false)
  
  // Form state for manual add
  const [newCode, setNewCode] = useState({
    code: '',
    description: '',
    category: 'CPT',
    authorizationRequired: 'yes',
    productServiceSlugs: [] as string[],
  })
  const [addProductPickerReset, setAddProductPickerReset] = useState(0)
  const [editProductPickerReset, setEditProductPickerReset] = useState(0)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmittingCode, setIsSubmittingCode] = useState(false)
  const [editingCode, setEditingCode] = useState<CptHcpcCode | null>(null)
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<CptHcpcCode | null>(null)
  const [apiProductServiceOptions, setApiProductServiceOptions] = useState<ProductServiceSelectOption[]>([])
  const [productServiceTypesLoading, setProductServiceTypesLoading] = useState(false)

  useEffect(() => {
    setSelectedProductService('all')
  }, [eligibilityServiceVendor])

  useEffect(() => {
    let cancelled = false
    setProductServiceTypesLoading(true)
    fetchProductServiceTypes(eligibilityServiceVendor, 'active')
      .then((rows) => {
        if (cancelled) return
        const seen = new Set<string>()
        const opts: ProductServiceSelectOption[] = []
        for (const r of rows) {
          const slug = (r.slug || '').trim()
          if (!slug || seen.has(slug)) continue
          seen.add(slug)
          const groupKey = (r.group_label || '').trim()
          const bare = (r.label || '').trim() || slug
          const label = groupKey ? `${groupKey} — ${bare}` : bare
          const searchHaystack = [groupKey, bare, slug].filter(Boolean).join(' ')
          opts.push({
            value: slug,
            label,
            groupKey: groupKey || undefined,
            searchHaystack,
          })
        }
        opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
        setApiProductServiceOptions(opts)
      })
      .catch((error) => {
        if (cancelled) return
        setApiProductServiceOptions([])
        showToast(
          error instanceof Error ? error.message : 'Unable to load product service types.',
          { type: 'error', duration: 5000 }
        )
      })
      .finally(() => {
        if (!cancelled) setProductServiceTypesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eligibilityServiceVendor, showToast])

  useEffect(() => {
    const normalizeAuthorization = (value: unknown): boolean => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase()
        return v === 'true' || v === 'yes' || v === 'required' || v === '1'
      }
      return false
    }

    const normalizeCode = (row: ApiCptHcpcCode, index: number): CptHcpcCode => {
      const slugs = normalizeProductServiceSlugsFromApi(row)
      return {
        id: row.id || `code-${index + 1}`,
        code: row.code || row.cpt_hcpc_code || '',
        description: row.description || '',
        authorizationRequired: normalizeAuthorization(
          row.authorizationRequired ?? row.authorization_required
        ),
        productService: slugs[0] || 'other',
        productServiceSlugs: slugs,
        category: normalizeCptCategory(row.category),
      }
    }

    const loadCodes = async () => {
      setIsLoadingCodes(true)
      try {
        const response = await apiJsonRequest<ApiCptHcpcResponse | ApiCptHcpcCode[]>(
          '/cpt-hcpc-codes',
          { method: 'GET' }
        )
        const maybeArray = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.codes)
              ? response.data.codes
              : []
        setCodes(maybeArray.map((row, index) => normalizeCode(row, index)))
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to load CPT/HCPC codes.', {
          type: 'error',
          duration: 5000,
        })
      } finally {
        setIsLoadingCodes(false)
      }
    }

    loadCodes()
  }, [showToast])

  const serviceScopedCodes = useMemo(() => {
    const allowedSlugs = new Set(apiProductServiceOptions.map((o) => o.value))
    if (allowedSlugs.size === 0) return []
    return codes.filter((code) => code.productServiceSlugs.some((s) => allowedSlugs.has(s)))
  }, [codes, apiProductServiceOptions])

  // Filter codes based on selected eligibility service + search and filters
  const filteredCodes = useMemo(() => {
    return serviceScopedCodes.filter((code) => {
      const matchesSearch =
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategory === 'all' || code.category === selectedCategory

      const matchesAuthorization =
        selectedAuthorization === 'all' ||
        (selectedAuthorization === 'required' && code.authorizationRequired) ||
        (selectedAuthorization === 'not-required' && !code.authorizationRequired)

      const matchesProductService =
        selectedProductService === 'all' ||
        code.productServiceSlugs.includes(selectedProductService)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAuthorization &&
        matchesProductService
      )
    })
  }, [serviceScopedCodes, searchTerm, selectedCategory, selectedAuthorization, selectedProductService])

  const productServiceFilterSelectOptions = useMemo(() => {
    const slugsInCodes = new Set<string>()
    for (const c of serviceScopedCodes) {
      for (const s of c.productServiceSlugs) {
        if (s && s !== 'other') slugsInCodes.add(s)
      }
    }
    const extra = [...slugsInCodes].filter((s) => !apiProductServiceOptions.some((o) => o.value === s))
    extra.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    const extraOpts = extra.map((s) => ({ value: s, label: s }))
    return [{ value: 'all', label: 'All Products/Services' }, ...apiProductServiceOptions, ...extraOpts]
  }, [apiProductServiceOptions, serviceScopedCodes])

  const editProductServiceOptions = useMemo(() => {
    const extra = new Set<string>()
    if (editingCode) {
      for (const s of editingCode.productServiceSlugs) {
        if (s && !apiProductServiceOptions.some((o) => o.value === s)) extra.add(s)
      }
    }
    const extraOpts = [...extra]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((s) => ({ value: s, label: s }))
    return [...apiProductServiceOptions, ...extraOpts]
  }, [editingCode?.productServiceSlugs, apiProductServiceOptions])

  const withSlugSearch = (opts: ProductServiceSelectOption[]): SearchableOption[] =>
    opts.map((o) => ({
      value: o.value,
      label: o.label,
      searchText: o.value === 'all' ? undefined : o.value,
      searchMatchOnly:
        o.value === 'all'
          ? undefined
          : (o.searchHaystack ?? [o.groupKey, o.label, o.value].filter(Boolean).join(' ')),
    }))

  const productServiceFilterSearchableOptions = useMemo(
    () => withSlugSearch(productServiceFilterSelectOptions),
    [productServiceFilterSelectOptions]
  )

  const addModalProductServiceSearchableOptions = useMemo(
    () =>
      withSlugSearch(
        apiProductServiceOptions.filter((o) => !newCode.productServiceSlugs.includes(o.value))
      ),
    [apiProductServiceOptions, newCode.productServiceSlugs]
  )

  const editModalProductServiceSearchableOptions = useMemo(
    () =>
      withSlugSearch(
        editProductServiceOptions.filter((o) => !editingCode?.productServiceSlugs.includes(o.value))
      ),
    [editProductServiceOptions, editingCode?.productServiceSlugs]
  )

  /** Slug → display label from active product-service types (for grid column). */
  const productServiceNameBySlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of apiProductServiceOptions) {
      m.set(o.value, o.label)
    }
    return m
  }, [apiProductServiceOptions])

  const eligibilityVendorLabel = eligibilityServiceVendor === 'stedi' ? 'Stedi' : 'pVerify'

  const productServiceGridCell = (slug: string, rowCategory: string) => {
    if (!slug || slug === 'other') {
      return <span className="text-sm text-gray-500">—</span>
    }
    const serviceName = productServiceNameBySlug.get(slug)
    const hasDistinctName = Boolean(serviceName?.trim() && serviceName.trim() !== slug)
    const cat = rowCategory === 'HCPC' ? 'HCPC' : 'CPT'
    const catBadge = (
      <span
        className={`inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          cat === 'HCPC'
            ? 'bg-purple-100 text-purple-800'
            : 'bg-blue-100 text-blue-800'
        }`}
      >
        {cat}
      </span>
    )
    if (hasDistinctName && serviceName) {
      const fullTitle = `${serviceName} (${slug}) · ${cat}`
      return (
        <div className="min-w-0 max-w-[14rem] lg:max-w-xs xl:max-w-sm" title={fullTitle}>
          <div className="flex flex-wrap items-center gap-1.5">
            {catBadge}
            <div className="text-sm text-gray-900 break-words">{serviceName}</div>
          </div>
          <div className="text-xs font-mono text-gray-500 mt-0.5 break-all">{slug}</div>
        </div>
      )
    }
    return (
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {catBadge}
        <span className="text-sm font-mono text-gray-900 break-all" title={`${slug} · ${cat}`}>
          {slug}
        </span>
      </div>
    )
  }

  const productServiceGridCellMany = (slugs: string[], rowCategory: string) => {
    const list = [...new Set(slugs.filter((s) => s && s !== 'other'))]
    if (list.length === 0) return <span className="text-sm text-gray-500">—</span>
    return (
      <div className="flex flex-col gap-2 min-w-0">
        {list.map((slug) => (
          <div key={slug}>{productServiceGridCell(slug, rowCategory)}</div>
        ))}
      </div>
    )
  }

  const appendNewProductServiceSlug = (value: string) => {
    if (!value || newCode.productServiceSlugs.includes(value)) return
    setNewCode((prev) => ({ ...prev, productServiceSlugs: [...prev.productServiceSlugs, value] }))
    setAddProductPickerReset((k) => k + 1)
    if (formErrors.productService) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next.productService
        return next
      })
    }
  }

  const removeNewProductServiceSlug = (slug: string) => {
    setNewCode((prev) => ({
      ...prev,
      productServiceSlugs: prev.productServiceSlugs.filter((s) => s !== slug),
    }))
  }

  const appendEditProductServiceSlug = (value: string) => {
    if (!editingCode || !value || editingCode.productServiceSlugs.includes(value)) return
    const nextSlugs = [...editingCode.productServiceSlugs, value]
    setEditingCode({
      ...editingCode,
      productServiceSlugs: nextSlugs,
      productService: nextSlugs[0],
    })
    setEditProductPickerReset((k) => k + 1)
    if (editFormErrors.productService) {
      setEditFormErrors((prev) => {
        const next = { ...prev }
        delete next.productService
        return next
      })
    }
  }

  const removeEditProductServiceSlug = (slug: string) => {
    setEditingCode((prev) => {
      if (!prev) return null
      const nextSlugs = prev.productServiceSlugs.filter((s) => s !== slug)
      return { ...prev, productServiceSlugs: nextSlugs, productService: nextSlugs[0] || 'other' }
    })
  }

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Placeholder for file handling
      console.log('File dropped:', e.dataTransfer.files[0])
      // In a real implementation, you would process the CSV file here
    }
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Placeholder for file handling
      console.log('File selected:', e.target.files[0])
      // In a real implementation, you would process the CSV file here
    }
  }

  const handleAddCodeInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewCode((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!newCode.code.trim()) {
      errors.code = 'Code is required'
    }
    
    if (!newCode.description.trim()) {
      errors.description = 'Description is required'
    }
    
    if (newCode.productServiceSlugs.length === 0) {
      errors.productService = 'Select at least one product/service'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddCodeSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    // Check if code already exists
    const codeExists = codes.some(
      (code) => code.code.toLowerCase() === newCode.code.trim().toLowerCase()
    )
    
    if (codeExists) {
      setFormErrors({ code: 'This code already exists' })
      return
    }
    
    setIsSubmittingCode(true)
    try {
      const slugs = newCode.productServiceSlugs
      const payload = {
        code: newCode.code.trim(),
        category: newCode.category,
        description: newCode.description.trim(),
        authorization_required: newCode.authorizationRequired === 'yes',
        product_service_slugs: slugs,
      }
      const response = await apiJsonRequest<CreateCptHcpcResponse>('/cpt-hcpc-codes', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const created = response?.data
      const slugsFromResponse = created
        ? normalizeProductServiceSlugsFromApi(created)
        : newCode.productServiceSlugs
      const codeToAdd: CptHcpcCode = {
        id: created?.id || `${Date.now()}`,
        code: created?.code || payload.code,
        description: created?.description || payload.description,
        category: (created?.category || payload.category || 'CPT').toUpperCase(),
        authorizationRequired:
          typeof created?.authorization_required === 'boolean'
            ? created.authorization_required
            : payload.authorization_required,
        productService: slugsFromResponse[0] || 'other',
        productServiceSlugs: slugsFromResponse.length > 0 ? slugsFromResponse : newCode.productServiceSlugs,
      }
      setCodes((prev) => [...prev, codeToAdd])
      setNewCode({
        code: '',
        description: '',
        category: 'CPT',
        authorizationRequired: 'yes',
        productServiceSlugs: [],
      })
      setAddProductPickerReset((k) => k + 1)
      setFormErrors({})
      setShowAddModal(false)
      showToast(response?.message || 'CPT / HCPC code created successfully.', { type: 'success' })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to create CPT / HCPC code.', {
        type: 'error',
        duration: 5000,
      })
    } finally {
      setIsSubmittingCode(false)
    }
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setNewCode({
      code: '',
      description: '',
      category: 'CPT',
      authorizationRequired: 'yes',
      productServiceSlugs: [],
    })
    setAddProductPickerReset((k) => k + 1)
    setFormErrors({})
  }

  const handleCloseEditModal = () => {
    setEditingCode(null)
    setEditFormErrors({})
  }

  const handleEditInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setEditingCode((prev) => {
      if (!prev) return null
      if (name === 'authorizationRequired') {
        return { ...prev, authorizationRequired: value === 'yes' }
      }
      return { ...prev, [name]: value }
    })
    if (editFormErrors[name]) {
      setEditFormErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validateEditForm = (draft: CptHcpcCode): boolean => {
    const errors: Record<string, string> = {}
    if (!draft.code.trim()) errors.code = 'Code is required'
    if (!draft.description.trim()) errors.description = 'Description is required'
    if (draft.productServiceSlugs.length === 0) errors.productService = 'Select at least one product/service'
    setEditFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingCode) return
    if (!validateEditForm(editingCode)) return

    const slugs = editingCode.productServiceSlugs
    const payload = {
      code: editingCode.code.trim(),
      category: editingCode.category.trim().toUpperCase(),
      description: editingCode.description.trim(),
      authorization_required: editingCode.authorizationRequired,
      product_service_slugs: slugs,
    }

    setIsSavingEdit(true)
    try {
      const response = await apiJsonRequest<UpdateCptHcpcResponse>(
        `/cpt-hcpc-codes/${encodeURIComponent(editingCode.id)}`,
        { method: 'PUT', body: JSON.stringify(payload) }
      )
      const updated = response?.data
      const slugsFromResponse = updated
        ? normalizeProductServiceSlugsFromApi(updated)
        : editingCode.productServiceSlugs
      setCodes((prev) =>
        prev.map((c) =>
          c.id === editingCode.id
            ? {
                ...c,
                code: updated?.code ?? payload.code,
                description: updated?.description ?? payload.description,
                category: normalizeCptCategory(updated?.category ?? payload.category),
                authorizationRequired:
                  typeof updated?.authorization_required === 'boolean'
                    ? updated.authorization_required
                    : payload.authorization_required,
                productService: slugsFromResponse[0] || 'other',
                productServiceSlugs: slugsFromResponse.length > 0 ? slugsFromResponse : editingCode.productServiceSlugs,
              }
            : c
        )
      )
      handleCloseEditModal()
      showToast(response?.message || 'CPT / HCPC code updated.', { type: 'success' })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update CPT / HCPC code.', {
        type: 'error',
        duration: 5000,
      })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleCloseDeleteConfirm = () => {
    if (deletingId) return
    setDeleteConfirmCode(null)
  }

  const handleConfirmDeleteCode = async () => {
    const code = deleteConfirmCode
    if (!code) return
    setDeletingId(code.id)
    try {
      await apiJsonRequest(`/cpt-hcpc-codes/${encodeURIComponent(code.id)}`, {
        method: 'DELETE',
      })
      setCodes((prev) => prev.filter((c) => c.id !== code.id))
      setDeleteConfirmCode(null)
      showToast('CPT / HCPC code deleted.', { type: 'success' })
      if (editingCode?.id === code.id) handleCloseEditModal()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete CPT / HCPC code.', {
        type: 'error',
        duration: 5000,
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            CPT / HCPC Configuration
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage CPT and HCPC codes, descriptions, and authorization requirements
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto lg:justify-end">
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto justify-center"
          >
            <div className="flex items-center justify-center">
              <Plus size={18} className="mr-2" />
              Add New
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowUploadModal(true)}
            className="w-full sm:w-auto justify-center"
          >
            <div className="flex items-center justify-center">
              <Upload size={18} className="mr-2" />
              Bulk Upload
            </div>
          </Button>
          <Button variant="outline" className="w-full sm:w-auto justify-center">
            <div className="flex items-center justify-center">
              <Download size={18} className="mr-2" />
              Export CSV
            </div>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by code or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Category"
            name="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={categoryOptions}
          />

          <Select
            label="Authorization Required"
            name="authorization"
            value={selectedAuthorization}
            onChange={(e) => setSelectedAuthorization(e.target.value)}
            options={authorizationOptions}
          />

          <SearchableSelect
            label="Product/Service"
            name="filterProductService"
            value={selectedProductService}
            onValueChange={(v) => setSelectedProductService(v || 'all')}
            options={productServiceFilterSearchableOptions}
            placeholder="All Products/Services"
            searchPlaceholder="Search name, slug, or category…"
            emptyMessage="No matching product types"
          />
        </div>

        {/* Active Filters Indicator */}
        {(selectedCategory !== 'all' ||
          selectedAuthorization !== 'all' ||
          selectedProductService !== 'all' ||
          searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm text-gray-600">Active filters:</span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Category: {categoryOptions.find((o) => o.value === selectedCategory)?.label}
              </span>
            )}
            {selectedAuthorization !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {authorizationOptions.find((o) => o.value === selectedAuthorization)?.label}
              </span>
            )}
            {selectedProductService !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {productServiceFilterSelectOptions.find((o) => o.value === selectedProductService)?.label ??
                  selectedProductService}
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Search: {searchTerm}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setSelectedAuthorization('all')
                setSelectedProductService('all')
              }}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoadingCodes && (
          <div className="px-4 sm:px-6 py-3 text-sm text-gray-500 border-b border-gray-200 bg-gray-50">
            Loading CPT / HCPC codes...
          </div>
        )}
        {filteredCodes.length === 0 ? (
          <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
            No codes found matching your search criteria.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Authorization Required
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product/Service
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCodes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {code.code}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            code.category === 'CPT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {code.category}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md">
                          {code.description}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            code.authorizationRequired
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {code.authorizationRequired ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 align-top">
                        {productServiceGridCellMany(code.productServiceSlugs, code.category)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="text-primary-600 hover:text-primary-900 transition-colors p-1 rounded"
                            title="Edit code"
                            onClick={() => {
                              setEditFormErrors({})
                              setEditingCode({ ...code })
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-900 transition-colors p-1 rounded disabled:opacity-50"
                            title="Delete code"
                            disabled={deletingId === code.id}
                            onClick={() => setDeleteConfirmCode(code)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {filteredCodes.map((code) => (
                <div key={code.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Code</p>
                      <p className="text-base font-semibold text-gray-900 font-mono mt-0.5">{code.code}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          code.category === 'CPT'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {code.category}
                      </span>
                      <button
                        type="button"
                        className="text-primary-600 hover:text-primary-900 transition-colors p-1 rounded"
                        title="Edit code"
                        onClick={() => {
                          setEditFormErrors({})
                          setEditingCode({ ...code })
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-900 transition-colors p-1 rounded disabled:opacity-50"
                        title="Delete code"
                        disabled={deletingId === code.id}
                        onClick={() => setDeleteConfirmCode(code)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Description</p>
                    <p className="text-sm text-gray-900 mt-1">{code.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Authorization required</p>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          code.authorizationRequired
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {code.authorizationRequired ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Product / Service</p>
                    <div className="mt-1">{productServiceGridCellMany(code.productServiceSlugs, code.category)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Results Count */}
        {filteredCodes.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredCodes.length}</span>{' '}
              of <span className="font-medium">{serviceScopedCodes.length}</span> codes
            </p>
          </div>
        )}
      </div>

      {/* Add New Code Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleCloseAddModal}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New CPT / HCPC Code
                </h3>
                <button
                  onClick={handleCloseAddModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleAddCodeSubmit}>
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-start">
                      <Input
                        label="Code"
                        name="code"
                        value={newCode.code}
                        onChange={handleAddCodeInputChange}
                        placeholder="e.g., 99213"
                        error={formErrors.code}
                        required
                      />
                      <Select
                        label="Category"
                        name="category"
                        value={newCode.category}
                        onChange={handleAddCodeInputChange}
                        options={categoryOptions.filter((opt) => opt.value !== 'all')}
                        error={formErrors.category}
                        required
                      />
                      <Select
                        label="Authorization Required"
                        name="authorizationRequired"
                        value={newCode.authorizationRequired}
                        onChange={handleAddCodeInputChange}
                        options={[
                          { value: 'yes', label: 'Yes' },
                          { value: 'no', label: 'No' },
                        ]}
                        error={formErrors.authorizationRequired}
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={newCode.description}
                        onChange={handleAddCodeInputChange}
                        placeholder="Enter code description..."
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          formErrors.description
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        } bg-white`}
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.description}
                        </p>
                      )}
                    </div>

                    <div className="w-full min-w-0">
                      <div className="mb-1">
                        <span className="block text-sm font-medium text-gray-700">
                          Product/Service <span className="text-red-500">*</span>
                        </span>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Add one or more types. The first in the list is the primary link; order is the order you
                          add them.
                        </p>
                      </div>
                      {newCode.productServiceSlugs.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {newCode.productServiceSlugs.map((slug) => (
                            <span
                              key={slug}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs text-gray-800"
                              title={productServiceNameBySlug.get(slug) ?? slug}
                            >
                              <span className="truncate font-mono">{slug}</span>
                              <button
                                type="button"
                                onClick={() => removeNewProductServiceSlug(slug)}
                                className="rounded p-0.5 text-gray-500 hover:bg-primary-100 hover:text-gray-900"
                                aria-label={`Remove ${slug}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <SearchableSelect
                        key={addProductPickerReset}
                        label="Add product/service"
                        name="productServiceAdd"
                        value=""
                        onValueChange={appendNewProductServiceSlug}
                        options={addModalProductServiceSearchableOptions}
                        placeholder={
                          productServiceTypesLoading
                            ? 'Loading product types…'
                            : apiProductServiceOptions.length === 0
                              ? 'No product types available'
                              : addModalProductServiceSearchableOptions.length === 0
                                ? 'All listed types are selected'
                                : 'Search and add…'
                        }
                        searchPlaceholder="Search name, slug, or category…"
                        emptyMessage="No matches"
                        disabled={
                          productServiceTypesLoading ||
                          apiProductServiceOptions.length === 0 ||
                          addModalProductServiceSearchableOptions.length === 0
                        }
                        error={formErrors.productService}
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Loaded for <span className="font-medium">{eligibilityVendorLabel}</span> (active
                        product types). Change the eligibility service under Settings if needed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseAddModal}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSubmittingCode}>
                    {isSubmittingCode ? 'Adding...' : 'Add Code'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Code Modal */}
      {editingCode && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="edit-cpt-modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleCloseEditModal}
          ></div>

          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 id="edit-cpt-modal-title" className="text-lg font-semibold text-gray-900">
                  Edit CPT / HCPC Code
                </h3>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-start">
                      <Input
                        label="Code"
                        name="code"
                        value={editingCode.code}
                        onChange={handleEditInputChange}
                        placeholder="e.g., 99213"
                        error={editFormErrors.code}
                        required
                      />
                      <Select
                        label="Category"
                        name="category"
                        value={editingCode.category}
                        onChange={handleEditInputChange}
                        options={categoryOptions.filter((opt) => opt.value !== 'all')}
                        error={editFormErrors.category}
                        required
                      />
                      <Select
                        label="Authorization Required"
                        name="authorizationRequired"
                        value={editingCode.authorizationRequired ? 'yes' : 'no'}
                        onChange={handleEditInputChange}
                        options={[
                          { value: 'yes', label: 'Yes' },
                          { value: 'no', label: 'No' },
                        ]}
                        error={editFormErrors.authorizationRequired}
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-description"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="edit-description"
                        name="description"
                        value={editingCode.description}
                        onChange={handleEditInputChange}
                        placeholder="Enter code description..."
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          editFormErrors.description
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        } bg-white`}
                      />
                      {editFormErrors.description && (
                        <p className="mt-1 text-sm text-red-600">{editFormErrors.description}</p>
                      )}
                    </div>

                    <div className="w-full min-w-0">
                      <div className="mb-1">
                        <span className="block text-sm font-medium text-gray-700">
                          Product/Service <span className="text-red-500">*</span>
                        </span>
                        <p className="mt-0.5 text-xs text-gray-500">
                          First type in the list is the primary link. Remove with ×; add more below.
                        </p>
                      </div>
                      {editingCode.productServiceSlugs.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {editingCode.productServiceSlugs.map((slug) => (
                            <span
                              key={slug}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs text-gray-800"
                              title={productServiceNameBySlug.get(slug) ?? slug}
                            >
                              <span className="truncate font-mono">{slug}</span>
                              <button
                                type="button"
                                onClick={() => removeEditProductServiceSlug(slug)}
                                className="rounded p-0.5 text-gray-500 hover:bg-primary-100 hover:text-gray-900"
                                aria-label={`Remove ${slug}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <SearchableSelect
                        key={editProductPickerReset}
                        label="Add product/service"
                        name="productServiceEditAdd"
                        value=""
                        onValueChange={appendEditProductServiceSlug}
                        options={editModalProductServiceSearchableOptions}
                        placeholder={
                          productServiceTypesLoading
                            ? 'Loading product types…'
                            : editProductServiceOptions.length === 0
                              ? 'No product types available'
                              : editModalProductServiceSearchableOptions.length === 0
                                ? 'All listed types are selected'
                                : 'Search and add…'
                        }
                        searchPlaceholder="Search name, slug, or category…"
                        emptyMessage="No matches"
                        disabled={
                          productServiceTypesLoading ||
                          editProductServiceOptions.length === 0 ||
                          editModalProductServiceSearchableOptions.length === 0
                        }
                        error={editFormErrors.productService}
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Options match <span className="font-medium">{eligibilityVendorLabel}</span> active
                        product types from Settings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                  <Button type="button" variant="outline" onClick={handleCloseEditModal}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSavingEdit}>
                    {isSavingEdit ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmCode && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-cpt-title"
        >
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleCloseDeleteConfirm}
            aria-hidden
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 id="delete-cpt-title" className="text-lg font-semibold text-gray-900">
                  Delete CPT / HCPC code
                </h3>
                <button
                  type="button"
                  onClick={handleCloseDeleteConfirm}
                  disabled={!!deletingId}
                  className="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600">
                  Delete{' '}
                  <span className="font-mono font-medium text-gray-900">{deleteConfirmCode.code}</span>
                  {deleteConfirmCode.category ? (
                    <span className="text-gray-500"> ({deleteConfirmCode.category})</span>
                  ) : null}
                  ? This cannot be undone.
                </p>
                {deleteConfirmCode.description ? (
                  <p className="mt-3 text-xs text-gray-500 line-clamp-3">{deleteConfirmCode.description}</p>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDeleteConfirm}
                  disabled={!!deletingId}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void handleConfirmDeleteCode()}
                  disabled={!!deletingId}
                >
                  {deletingId ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setShowUploadModal(false)}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Bulk Upload CPT / HCPC Codes
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload a CSV file containing CPT/HCPC codes. The file should
                      include columns for: Code, Description, Authorization Required
                      (Yes/No), and Product/Service.
                    </p>

                    {/* Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <Upload
                        size={48}
                        className={`mx-auto mb-4 ${
                          dragActive ? 'text-primary-500' : 'text-gray-400'
                        }`}
                      />
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium text-primary-600">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        CSV file (max. 10MB)
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileInput}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="mt-4 inline-block"
                      >
                        <Button variant="primary" size="sm" type="button">
                          Select File
                        </Button>
                      </label>
                    </div>
                  </div>

                  {/* Sample Format */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Expected CSV Format:
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-white">
                            <th className="px-3 py-2 text-left border border-gray-300">
                              Code
                            </th>
                            <th className="px-3 py-2 text-left border border-gray-300">
                              Description
                            </th>
                            <th className="px-3 py-2 text-left border border-gray-300">
                              Authorization Required
                            </th>
                            <th className="px-3 py-2 text-left border border-gray-300">
                              Product/Service
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 border border-gray-300 bg-white">
                              99213
                            </td>
                            <td className="px-3 py-2 border border-gray-300 bg-white">
                              Office visit
                            </td>
                            <td className="px-3 py-2 border border-gray-300 bg-white">
                              Yes
                            </td>
                            <td className="px-3 py-2 border border-gray-300 bg-white">
                              office-visit
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button type="button" variant="primary" disabled>
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CptHcpcConfiguration

