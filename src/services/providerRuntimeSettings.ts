/**
 * Persisted provider defaults (NPI, practice state) for eligibility and related APIs.
 * Stored in localStorage so they survive refresh without a backend.
 */
import { providerConfig, stateOptions } from '../data/providerConfig'

const STORAGE_KEY = 'healthlynk_provider_runtime_v1'

export type ProviderRuntimeSettings = {
  npi: string
  /** US state code (e.g. CA) — practice / service location at state level */
  practiceState: string
}

function defaults(): ProviderRuntimeSettings {
  return {
    npi: providerConfig.npi,
    practiceState: providerConfig.providerAddress.state,
  }
}

export function loadProviderRuntimeSettings(): ProviderRuntimeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<ProviderRuntimeSettings>
    const d = defaults()
    return {
      npi: typeof parsed.npi === 'string' && /^\d{10}$/.test(parsed.npi.trim())
        ? parsed.npi.trim()
        : d.npi,
      practiceState:
        typeof parsed.practiceState === 'string' && parsed.practiceState.trim()
          ? parsed.practiceState.trim().toUpperCase()
          : d.practiceState,
    }
  } catch {
    return defaults()
  }
}

export function saveProviderRuntimeSettings(next: ProviderRuntimeSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      npi: next.npi.trim(),
      practiceState: next.practiceState.trim().toUpperCase(),
    })
  )
}

/** Value for pVerify `Location` from provider runtime settings. */
export function getPverifyLocationFromRuntime(): string {
  const { practiceState } = loadProviderRuntimeSettings()
  const label = stateOptions.find((o) => o.value === practiceState)?.label
  if (label) return label
  return (
    providerConfig.providerAddress.city ||
    providerConfig.providerName ||
    practiceState
  )
}
