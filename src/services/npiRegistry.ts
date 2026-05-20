/**
 * NPI provider search / lookup via Exwyn Healthify API (NPPES-shaped `data` records).
 * @see https://npiregistry.cms.hhs.gov/api-page (underlying registry format)
 *
 * - **Production:** `http://rainbow.exwyn.com/api/healthify/npi` (same as
 *   `?first_name=&last_name=` name search).
 * - **Dev:** `/api/healthify/npi` → Vite proxies to rainbow (vite.config.js), avoids CORS.
 * - **Override:** `VITE_HEALTHIFY_NPI_URL` (no trailing slash).
 */
import { env } from '../config/env'

function resolveHealthifyNpiBase(): string {
  return env.healthifyNpiUrl()
}

/** Healthify `{ success, data }` or legacy `{ results }` → provider rows. */
function normalizeProviderListPayload(json: unknown): unknown[] {
  if (!json || typeof json !== 'object') return []
  const o = json as Record<string, unknown>
  if (
    o.data != null &&
    typeof o.data === 'object' &&
    !Array.isArray(o.data)
  ) {
    const nested = o.data as Record<string, unknown>
    if (Array.isArray(nested.results)) return nested.results
    if (Array.isArray(nested.data)) return nested.data
  }
  if (Array.isArray(o.data)) return o.data
  if (Array.isArray(o.results)) return o.results
  return []
}

export async function fetchNpiDetails(npi: string): Promise<unknown> {
  const base = resolveHealthifyNpiBase()
  const digits = npi.trim()
  const url = `${base}?number=${encodeURIComponent(digits)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`NPI lookup failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

/** First token → first_name, remainder → last_name (NPPES name search). */
export function splitNameForNppesSearch(name: string): {
  first: string
  last: string
} {
  const t = name.trim().replace(/\s+/g, ' ')
  if (!t) return { first: '', last: '' }
  const parts = t.split(' ')
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

/**
 * Search providers by name (first_name + last_name query params).
 * Returns a list of NPPES-shaped provider objects (Healthify `data` or NPPES `results`).
 */
export async function searchProviders(name: string): Promise<unknown[]> {
  const trimmed = name.trim()
  if (trimmed.length < 3) return []
  const { first, last } = splitNameForNppesSearch(trimmed)
  const base = resolveHealthifyNpiBase()
  const qs = new URLSearchParams({
    first_name: first,
    last_name: last,
  })
  const url = `${base}?${qs.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`NPI search failed: ${res.status} ${res.statusText}`)
  }
  return normalizeProviderListPayload(await res.json())
}

/** Display strings for one NPPES result object (list row). */
export function getProviderListItemDisplay(doc: unknown): {
  name: string
  specialty: string
} {
  if (!doc || typeof doc !== 'object') {
    return { name: '', specialty: '' }
  }
  const d = doc as Record<string, unknown>
  const basic = d.basic as Record<string, unknown> | undefined
  let name = ''
  if (basic && typeof basic === 'object') {
    if (typeof basic.name === 'string' && basic.name.trim()) {
      name = basic.name.trim()
    } else {
      const fn =
        typeof basic.first_name === 'string' ? basic.first_name.trim() : ''
      const ln =
        typeof basic.last_name === 'string' ? basic.last_name.trim() : ''
      name = [fn, ln].filter(Boolean).join(' ')
    }
  }
  let specialty = ''
  const tax = d.taxonomies
  if (Array.isArray(tax) && tax.length > 0) {
    const t0 = tax[0] as Record<string, unknown>
    if (typeof t0.desc === 'string') specialty = t0.desc.trim()
  }
  return { name, specialty }
}

/** Maps one NPPES result row to intake fields (npi, doctor name, specialty, selected practice row). */
export function applyNppesProviderToFormFields(
  doc: unknown,
  addressIndex: number = 0
): {
  npi: string
  doctorName: string
  doctorSpecialty: string
  providerFirstName: string
  providerLastName: string
  providerPracticeAddress: string
  providerPhone: string
  providerFax: string
} {
  const empty = {
    npi: '',
    doctorName: '',
    doctorSpecialty: '',
    providerFirstName: '',
    providerLastName: '',
    providerPracticeAddress: '',
    providerPhone: '',
    providerFax: '',
  }
  if (!doc || typeof doc !== 'object') {
    return empty
  }
  const d = doc as Record<string, unknown>
  const raw = d.number
  const digits =
    raw != null ? String(raw).replace(/\D/g, '').slice(0, 10) : ''
  const { name: doctorName, specialty: doctorSpecialty } =
    getProviderListItemDisplay(doc)
  const basic = d.basic as Record<string, unknown> | undefined
  let providerFirstName = ''
  let providerLastName = ''
  if (basic && typeof basic === 'object') {
    providerFirstName =
      typeof basic.first_name === 'string' ? basic.first_name.trim() : ''
    providerLastName =
      typeof basic.last_name === 'string' ? basic.last_name.trim() : ''
  }

  let addrObj: Record<string, unknown> | undefined
  const addresses = d.addresses
  if (
    Array.isArray(addresses) &&
    addresses.length > 0 &&
    addresses[addressIndex] != null &&
    typeof addresses[addressIndex] === 'object'
  ) {
    addrObj = addresses[addressIndex] as Record<string, unknown>
  } else {
    addrObj = pickPracticeAddress(d.addresses)
  }

  let providerPracticeAddress = ''
  let providerPhone = ''
  let providerFax = ''
  if (addrObj) {
    providerPracticeAddress = formatNppesStreetAddress(addrObj)
    if (typeof addrObj.telephone_number === 'string') {
      providerPhone = addrObj.telephone_number.trim()
    }
    if (typeof addrObj.fax_number === 'string') {
      providerFax = addrObj.fax_number.trim()
    }
  }

  return {
    npi: digits,
    doctorName,
    doctorSpecialty,
    providerFirstName,
    providerLastName,
    providerPracticeAddress,
    providerPhone,
    providerFax,
  }
}

/** Maps NPPES 2.1 JSON to doctor display fields. */
export function mapNpiRegistryResponse(data: unknown): {
  doctorName: string
  doctorSpecialty: string
  providerFirstName: string
  providerLastName: string
} {
  if (!data || typeof data !== 'object') {
    return {
      doctorName: '',
      doctorSpecialty: '',
      providerFirstName: '',
      providerLastName: '',
    }
  }
  const root = data as Record<string, unknown>
  let list: unknown[] = []
  if (Array.isArray(root.results) && root.results.length > 0) {
    list = root.results
  } else if (Array.isArray(root.data) && root.data.length > 0) {
    list = root.data
  } else if (
    root.data != null &&
    typeof root.data === 'object' &&
    !Array.isArray(root.data)
  ) {
    const nested = root.data as Record<string, unknown>
    if (Array.isArray(nested.results) && nested.results.length > 0) {
      list = nested.results
    } else if (Array.isArray(nested.data) && nested.data.length > 0) {
      list = nested.data
    } else {
      list = [nested]
    }
  }
  if (list.length === 0) {
    return {
      doctorName: '',
      doctorSpecialty: '',
      providerFirstName: '',
      providerLastName: '',
    }
  }

  const provider = list[0] as Record<string, unknown>
  const basic = provider.basic as Record<string, unknown> | undefined

  let doctorName = ''
  let providerFirstName = ''
  let providerLastName = ''
  if (basic && typeof basic === 'object') {
    providerFirstName =
      typeof basic.first_name === 'string' ? basic.first_name.trim() : ''
    providerLastName =
      typeof basic.last_name === 'string' ? basic.last_name.trim() : ''
    if (typeof basic.name === 'string' && basic.name.trim()) {
      doctorName = basic.name.trim()
    } else {
      doctorName = [providerFirstName, providerLastName]
        .filter(Boolean)
        .join(' ')
    }
  }

  let doctorSpecialty = ''
  const tax = provider.taxonomies
  if (Array.isArray(tax) && tax.length > 0) {
    const t0 = tax[0] as Record<string, unknown>
    if (typeof t0.desc === 'string') {
      doctorSpecialty = t0.desc.trim()
    }
  }

  return {
    doctorName,
    doctorSpecialty,
    providerFirstName,
    providerLastName,
  }
}

export type NppesProviderTableRow = {
  /** Stable id for selection: `${npi}-${addressIndex}` */
  rowKey: string
  addressIndex: number
  npi: string
  name: string
  /** e.g. LOCATION, MAILING */
  addressPurpose: string
  address: string
  phone: string
  fax: string
  taxonomy: string
}

function pickPracticeAddress(
  addresses: unknown
): Record<string, unknown> | undefined {
  if (!Array.isArray(addresses) || addresses.length === 0) return undefined
  const loc = addresses.find((a) => {
    if (!a || typeof a !== 'object') return false
    return String((a as Record<string, unknown>).address_purpose ?? '')
      .toUpperCase()
      .includes('LOCATION')
  })
  return (loc ?? addresses[0]) as Record<string, unknown>
}

function formatNppesStreetAddress(addr: Record<string, unknown>): string {
  const a1 = String(addr.address_1 ?? '').trim()
  const a2 = String(addr.address_2 ?? '').trim()
  const city = String(addr.city ?? '').trim()
  const state = String(addr.state ?? '').trim()
  const zip = String(addr.postal_code ?? '').trim()
  const line3 = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [a1, a2, line3].filter(Boolean).join(' ')
}

function taxonomyPrimaryDesc(d: Record<string, unknown>): string {
  const tax = d.taxonomies
  if (!Array.isArray(tax) || tax.length === 0) return ''
  const primary = tax.find(
    (t) => (t as Record<string, unknown>).primary === true
  ) as Record<string, unknown> | undefined
  const chosen = primary ?? (tax[0] as Record<string, unknown>)
  return typeof chosen.desc === 'string' ? chosen.desc.trim() : ''
}

/**
 * One table row per NPPES `addresses[]` entry so LOCATION vs MAILING (etc.) are separate selectable rows.
 */
export function getNppesProviderTableRows(doc: unknown): NppesProviderTableRow[] {
  if (!doc || typeof doc !== 'object') return []
  const d = doc as Record<string, unknown>
  const npi = String(d.number ?? '')
    .replace(/\D/g, '')
    .slice(0, 10)

  const basic = d.basic as Record<string, unknown> | undefined
  let name = ''
  if (basic && typeof basic === 'object') {
    if (typeof basic.name === 'string' && basic.name.trim()) {
      name = basic.name.trim()
    } else {
      const fn =
        typeof basic.first_name === 'string' ? basic.first_name.trim() : ''
      const ln =
        typeof basic.last_name === 'string' ? basic.last_name.trim() : ''
      name = [fn, ln].filter(Boolean).join(' ')
    }
  }

  const taxonomy = taxonomyPrimaryDesc(d)
  const addresses = d.addresses

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return [
      {
        rowKey: `${npi}-0`,
        addressIndex: 0,
        npi,
        name,
        addressPurpose: '',
        address: '',
        phone: '',
        fax: '',
        taxonomy,
      },
    ]
  }

  return addresses.map((raw, idx) => {
    const a =
      raw && typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : ({} as Record<string, unknown>)
    const purpose = String(a.address_purpose ?? '').trim()
    const phone =
      typeof a.telephone_number === 'string'
        ? a.telephone_number.trim()
        : ''
    const fax =
      typeof a.fax_number === 'string' ? a.fax_number.trim() : ''
    return {
      rowKey: `${npi}-${idx}`,
      addressIndex: idx,
      npi,
      name,
      addressPurpose: purpose,
      address: formatNppesStreetAddress(a),
      phone,
      fax,
      taxonomy,
    }
  })
}
