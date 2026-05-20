import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  buildDefaultServiceConfigs,
  type EligibilityServiceConfigs,
  type EligibilityServiceType,
} from '../services/eligibilityService'

const STORAGE_KEY = 'healthlynk_eligibility_service_v1'

type EligibilityServiceContextValue = {
  selectedService: EligibilityServiceType
  serviceConfigs: EligibilityServiceConfigs
  setSelectedService: (service: EligibilityServiceType) => void
  updateServiceConfig: (
    service: EligibilityServiceType,
    patch: Partial<EligibilityServiceConfigs[EligibilityServiceType]>
  ) => void
}

function preferNonEmpty(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed ? trimmed : fallback
}

function readStoredSettings(): {
  selectedService: EligibilityServiceType
  serviceConfigs: EligibilityServiceConfigs
} {
  const defaults = buildDefaultServiceConfigs()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { selectedService: 'stedi', serviceConfigs: defaults }
    }
    const parsed = JSON.parse(raw) as {
      selectedService?: EligibilityServiceType
      serviceConfigs?: Partial<EligibilityServiceConfigs>
    }
    const selectedService =
      parsed.selectedService === 'pverify' || parsed.selectedService === 'stedi'
        ? parsed.selectedService
        : 'stedi'
    const stediFromStorage = parsed.serviceConfigs?.stedi as
      | (Partial<EligibilityServiceConfigs['stedi']> & { clientKey?: string })
      | undefined
    const pverifyFromStorage = parsed.serviceConfigs?.pverify
    return {
      selectedService,
      serviceConfigs: {
        stedi: {
          apiUrl: preferNonEmpty(stediFromStorage?.apiUrl, defaults.stedi.apiUrl),
          apiKey: preferNonEmpty(
            stediFromStorage?.apiKey ?? stediFromStorage?.clientKey,
            defaults.stedi.apiKey
          ),
        },
        pverify: {
          apiUrl: preferNonEmpty(pverifyFromStorage?.apiUrl, defaults.pverify.apiUrl),
          clientKey: preferNonEmpty(pverifyFromStorage?.clientKey, defaults.pverify.clientKey),
          clientSecret: preferNonEmpty(
            pverifyFromStorage?.clientSecret,
            defaults.pverify.clientSecret
          ),
          clientApiId: preferNonEmpty(pverifyFromStorage?.clientApiId, defaults.pverify.clientApiId),
          clientUserName: preferNonEmpty(
            pverifyFromStorage?.clientUserName,
            defaults.pverify.clientUserName
          ),
          eligibilityPath: preferNonEmpty(
            pverifyFromStorage?.eligibilityPath,
            defaults.pverify.eligibilityPath
          ),
        },
      },
    }
  } catch {
    return { selectedService: 'stedi', serviceConfigs: defaults }
  }
}

const EligibilityServiceContext = createContext<EligibilityServiceContextValue | null>(null)

export function EligibilityServiceProvider({ children }: { children: ReactNode }) {
  const initial = readStoredSettings()
  const [selectedService, setSelectedServiceState] = useState<EligibilityServiceType>(
    initial.selectedService
  )
  const [serviceConfigs, setServiceConfigs] = useState<EligibilityServiceConfigs>(
    initial.serviceConfigs
  )

  const persist = useCallback(
    (nextService: EligibilityServiceType, nextConfigs: EligibilityServiceConfigs) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ selectedService: nextService, serviceConfigs: nextConfigs })
      )
    },
    []
  )

  const setSelectedService = useCallback(
    (service: EligibilityServiceType) => {
      setSelectedServiceState(service)
      persist(service, serviceConfigs)
    },
    [persist, serviceConfigs]
  )

  const updateServiceConfig = useCallback(
    (
      service: EligibilityServiceType,
      patch: Partial<EligibilityServiceConfigs[EligibilityServiceType]>
    ) => {
      setServiceConfigs((prev) => {
        const next: EligibilityServiceConfigs = {
          ...prev,
          [service]: { ...prev[service], ...patch },
        }
        persist(selectedService, next)
        return next
      })
    },
    [persist, selectedService]
  )

  const value = useMemo(
    () => ({
      selectedService,
      serviceConfigs,
      setSelectedService,
      updateServiceConfig,
    }),
    [selectedService, serviceConfigs, setSelectedService, updateServiceConfig]
  )

  return (
    <EligibilityServiceContext.Provider value={value}>
      {children}
    </EligibilityServiceContext.Provider>
  )
}

export function useEligibilityServiceConfig() {
  const ctx = useContext(EligibilityServiceContext)
  if (!ctx) {
    throw new Error('useEligibilityServiceConfig must be used within EligibilityServiceProvider')
  }
  return ctx
}
