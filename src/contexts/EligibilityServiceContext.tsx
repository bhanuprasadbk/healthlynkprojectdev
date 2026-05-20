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

/** Never persist integration secrets in localStorage — backend holds credentials. */
function sanitizeConfigsForStorage(
  configs: EligibilityServiceConfigs
): EligibilityServiceConfigs {
  return {
    stedi: {
      apiUrl: configs.stedi.apiUrl,
      apiKey: '',
    },
    pverify: {
      apiUrl: configs.pverify.apiUrl,
      eligibilityPath: configs.pverify.eligibilityPath,
      clientKey: '',
      clientSecret: '',
      clientApiId: configs.pverify.clientApiId,
      clientUserName: configs.pverify.clientUserName,
    },
  }
}

type EligibilityServiceContextValue = {
  selectedService: EligibilityServiceType
  serviceConfigs: EligibilityServiceConfigs
  setSelectedService: (service: EligibilityServiceType) => void
  updateServiceConfig: (
    service: EligibilityServiceType,
    patch: Partial<EligibilityServiceConfigs[EligibilityServiceType]>
  ) => void
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
    const stediFromStorage = parsed.serviceConfigs?.stedi
    const pverifyFromStorage = parsed.serviceConfigs?.pverify
    return {
      selectedService,
      serviceConfigs: sanitizeConfigsForStorage({
        stedi: { ...defaults.stedi, ...(stediFromStorage ?? {}) },
        pverify: { ...defaults.pverify, ...(pverifyFromStorage ?? {}) },
      }),
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
        JSON.stringify({
          selectedService: nextService,
          serviceConfigs: sanitizeConfigsForStorage(nextConfigs),
        })
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
