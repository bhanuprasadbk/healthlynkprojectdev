import { apiJsonRequest } from './apiClient'

export type EligibilityServiceVendor = 'stedi' | 'pverify'

export interface ProductServiceTypeItem {
  /** Prefer API `id` when present; falls back to `slug` for URL path. */
  id?: string
  slug: string
  label: string
  /** Section heading; from API `group`, `category`, `product_group`, etc. */
  group_label?: string
  sort_order?: number
  status?: 'active' | 'inactive'
  eligibility_services?: EligibilityServiceVendor[]
  eligibility_service?: EligibilityServiceVendor
  enabled: boolean
}

type ListResponse = {
  data?: ProductServiceTypeItem[]
  message?: string
  status?: number
}

function normalizeListResponse(body: ListResponse | ProductServiceTypeItem[] | null | undefined): ProductServiceTypeItem[] {
  if (!body) return []
  if (Array.isArray(body)) return body
  if (Array.isArray(body.data)) return body.data
  return []
}

const DEFAULT_VENDORS: EligibilityServiceVendor[] = ['stedi', 'pverify']

export function productServiceTypeRowKey(row: ProductServiceTypeItem): string {
  return row.id ?? row.slug
}

function normalizeGroupLabel(row: ProductServiceTypeItem & Record<string, unknown>): string {
  const candidates = [
    row.group_label,
    row.group,
    row.group_name,
    row.groupName,
    row.category,
    row.product_group,
    row.productGroup,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return ''
}

function mapRow(
  row: ProductServiceTypeItem,
  eligibilityService: EligibilityServiceVendor,
  statusHint?: 'active' | 'inactive'
): ProductServiceTypeItem {
  const rec = row as ProductServiceTypeItem & Record<string, unknown>
  const groupLabel = normalizeGroupLabel(rec)
  const eligibility_services =
    Array.isArray(row.eligibility_services) && row.eligibility_services.length > 0
      ? (row.eligibility_services as EligibilityServiceVendor[])
      : DEFAULT_VENDORS
  const rowStatus: 'active' | 'inactive' =
    statusHint ?? (row.status === 'inactive' ? 'inactive' : 'active')
  const enabledFromStatus = rowStatus === 'active'
  const enabled = typeof row.enabled === 'boolean' ? row.enabled : enabledFromStatus
  return {
    ...row,
    group_label: groupLabel || undefined,
    eligibility_services,
    enabled,
    status: rowStatus,
  }
}

/** Active or inactive rows for the selected eligibility vendor. */
export async function fetchProductServiceTypes(
  eligibilityService: EligibilityServiceVendor,
  status: 'active' | 'inactive' = 'active'
): Promise<ProductServiceTypeItem[]> {
  const params = new URLSearchParams({
    status,
    eligibility_service: eligibilityService,
  })
  const res = await apiJsonRequest<ListResponse | ProductServiceTypeItem[]>(
    `/product-service-types?${params.toString()}`,
    { method: 'GET' }
  )
  return normalizeListResponse(res).map((row) =>
    mapRow(row, eligibilityService, status === 'inactive' ? 'inactive' : undefined)
  )
}

/**
 * Active + inactive for one vendor: `status=active|inactive` and `eligibility_service=stedi|pverify` on both calls.
 */
export async function fetchProductServiceTypesWithInactive(
  eligibilityService: EligibilityServiceVendor
): Promise<ProductServiceTypeItem[]> {
  const [activeRows, inactiveRows] = await Promise.all([
    fetchProductServiceTypes(eligibilityService, 'active'),
    fetchProductServiceTypes(eligibilityService, 'inactive'),
  ])

  const seen = new Set<string>()
  const merged: ProductServiceTypeItem[] = []

  for (const row of activeRows) {
    const k = productServiceTypeRowKey(row)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(row)
  }
  for (const row of inactiveRows) {
    const k = productServiceTypeRowKey(row)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(row)
  }

  merged.sort((a, b) => {
    const aIn = a.status === 'inactive' ? 1 : 0
    const bIn = b.status === 'inactive' ? 1 : 0
    if (aIn !== bIn) return aIn - bIn
    return (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.slug.localeCompare(b.slug)
  })

  return merged
}

/** `PATCH /product-service-types/:id/status` — body `{ status: "active" | "inactive" }` */
export async function patchProductServiceTypeStatus(
  productServiceTypeId: string,
  status: 'active' | 'inactive'
): Promise<void> {
  await apiJsonRequest(
    `/product-service-types/${encodeURIComponent(productServiceTypeId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  )
}
