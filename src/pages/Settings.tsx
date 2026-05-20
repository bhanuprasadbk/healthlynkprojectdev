import { useState, ChangeEvent, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Shield,
  Lock,
  Globe,
  Key,
  Bell,
  User,
  Database,
  FileText,
  Save,
  Plus,
  X,
  Eye,
  EyeOff,
  Palette,
  Moon,
  Sun,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Table2,
  Navigation,
  Sidebar,
  Layers,
  Search,
} from 'lucide-react'
import Input from '../components/forms/Input'
import Button from '../components/forms/Button'
import Toast from '../components/Toast'
import { useAuthenticatedApiReady } from '../hooks/useAuthenticatedApiReady'
import { useTheme } from '../contexts/ThemeContext'
import { useEligibilityServiceConfig } from '../contexts/EligibilityServiceContext'
import {
  getEligibilityServiceConfig,
  getEligibilityServiceOptions,
  getSettingsFull,
  putEligibilityServiceConfig,
  putSettingsFull,
} from '../services/settingsService'
import {
  fetchProductServiceTypesWithInactive,
  patchProductServiceTypeStatus,
  productServiceTypeRowKey,
  type EligibilityServiceVendor,
  type ProductServiceTypeItem,
} from '../services/productServiceTypesService'

interface SecuritySettings {
  mfaEnabled: boolean
  twoFactorAuthEnabled: boolean
  twoFactorMethod: 'sms' | 'email' | 'authenticator'
  sessionTimeout: number
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSpecialChars: boolean
  ipWhitelistEnabled: boolean
  urlWhitelistEnabled: boolean
  auditLoggingEnabled: boolean
  dataEncryptionEnabled: boolean
}

interface ProfileSettings {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface SystemSettings {
  autoBackupEnabled: boolean
  dataRetentionDays: number
}

interface WhitelistItem {
  id: string
  value: string
  type: 'url' | 'ip'
}

interface EligibilityServiceOption {
  id: 'stedi' | 'pverify'
  title: string
  desc: string
}

const DEFAULT_ELIGIBILITY_SERVICE_OPTIONS: EligibilityServiceOption[] = [
  {
    id: 'stedi',
    title: 'Stedi',
    desc: 'Use Stedi eligibility API',
  },
  {
    id: 'pverify',
    title: 'pVerify',
    desc: 'Use pVerify eligibility API',
  },
]

const Settings = () => {
  const apiReady = useAuthenticatedApiReady()
  const { theme, toggleDarkMode, updateTheme, updateColors, updateLogo, resetTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<
    'theme' | 'security' | 'account' | 'system' | 'eligibility' | 'productServices' | 'compliance'
  >('theme')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    selectedService,
    serviceConfigs,
    setSelectedService,
    updateServiceConfig,
  } = useEligibilityServiceConfig()

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    mfaEnabled: false,
    twoFactorAuthEnabled: false,
    twoFactorMethod: 'sms',
    sessionTimeout: 30,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    ipWhitelistEnabled: false,
    urlWhitelistEnabled: false,
    auditLoggingEnabled: true,
    dataEncryptionEnabled: true,
  })
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    autoBackupEnabled: true,
    dataRetentionDays: 365,
  })

  const [urlWhitelist, setUrlWhitelist] = useState<WhitelistItem[]>([])

  const [ipWhitelist, setIpWhitelist] = useState<WhitelistItem[]>([])

  const [newWhitelistItem, setNewWhitelistItem] = useState({ value: '', type: 'url' as 'url' | 'ip' })
  const [eligibilityServiceOptions, setEligibilityServiceOptions] = useState<EligibilityServiceOption[]>(
    DEFAULT_ELIGIBILITY_SERVICE_OPTIONS
  )

  const [productServiceSubTab, setProductServiceSubTab] = useState<EligibilityServiceVendor>('stedi')
  const [productServiceRows, setProductServiceRows] = useState<ProductServiceTypeItem[]>([])
  const [productServiceSearch, setProductServiceSearch] = useState('')
  /** When false: show active list only. When true: show inactive list only. */
  const [productServiceShowInactiveList, setProductServiceShowInactiveList] = useState(false)
  const [productServiceLoading, setProductServiceLoading] = useState(false)
  const [productServiceTogglingId, setProductServiceTogglingId] = useState<string | null>(null)

  const filteredProductServiceRows = useMemo(() => {
    const q = productServiceSearch.trim().toLowerCase()
    if (!q) return productServiceRows
    return productServiceRows.filter((row) => {
      const label = (row.label || '').toLowerCase()
      const slug = (row.slug || '').toLowerCase()
      const id = (row.id || '').toLowerCase()
      const group = (row.group_label || '').toLowerCase()
      return label.includes(q) || slug.includes(q) || id.includes(q) || group.includes(q)
    })
  }, [productServiceRows, productServiceSearch])

  const filteredActiveProductRows = useMemo(
    () => filteredProductServiceRows.filter((r) => r.status !== 'inactive'),
    [filteredProductServiceRows]
  )
  const filteredInactiveProductRows = useMemo(
    () => filteredProductServiceRows.filter((r) => r.status === 'inactive'),
    [filteredProductServiceRows]
  )

  const visibleProductServiceRows = useMemo(
    () => (productServiceShowInactiveList ? filteredInactiveProductRows : filteredActiveProductRows),
    [productServiceShowInactiveList, filteredActiveProductRows, filteredInactiveProductRows]
  )

  const visibleProductServiceGroups = useMemo(() => {
    const rows = visibleProductServiceRows
    const hasAnyGroup = rows.some((r) => !!r.group_label?.trim())
    if (!hasAnyGroup) {
      return [{ heading: null as string | null, rows }]
    }
    const bucket = new Map<string, ProductServiceTypeItem[]>()
    for (const r of rows) {
      const key = r.group_label?.trim() || 'Other'
      const list = bucket.get(key)
      if (list) list.push(r)
      else bucket.set(key, [r])
    }
    const headings = [...bucket.keys()].sort((a, b) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
    return headings.map((heading) => ({ heading, rows: bucket.get(heading)! }))
  }, [visibleProductServiceRows])

  useEffect(() => {
    if (!apiReady) return

    const asRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

    const pickObject = (source: Record<string, unknown>, keys: string[]): Record<string, unknown> => {
      for (const key of keys) {
        const value = source[key]
        if (value && typeof value === 'object') {
          return value as Record<string, unknown>
        }
      }
      return {}
    }

    const parseBoolean = (value: unknown, fallback: boolean): boolean =>
      typeof value === 'boolean' ? value : fallback

    const parseNumber = (value: unknown, fallback: number): number =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback

    const parseString = (value: unknown, fallback: string): string =>
      typeof value === 'string' ? value : fallback

    const parseWhitelist = (list: unknown, type: 'url' | 'ip'): WhitelistItem[] => {
      if (!Array.isArray(list)) return []
      return list
        .map((item, index) => {
          const record = asRecord(item)
          const value = parseString(record.value ?? record.url ?? record.ip, '').trim()
          if (!value) return null
          return {
            id: parseString(record.id, `${type}-${index + 1}`),
            value,
            type,
          }
        })
        .filter((item): item is WhitelistItem => item !== null)
    }

    const loadSettings = async () => {
      try {
        const response = await getSettingsFull()
        const payload = asRecord(response.data ?? response)

        const securityData = pickObject(payload, ['security', 'securitySettings', 'security_settings'])
        if (Object.keys(securityData).length > 0) {
          setSecuritySettings((prev) => ({
            ...prev,
            mfaEnabled: parseBoolean(securityData.mfaEnabled ?? securityData.mfa_enabled, prev.mfaEnabled),
            twoFactorAuthEnabled: parseBoolean(
              securityData.twoFactorAuthEnabled ?? securityData.two_factor_auth_enabled,
              prev.twoFactorAuthEnabled
            ),
            twoFactorMethod: (['sms', 'email', 'authenticator'] as const).includes(
              securityData.twoFactorMethod as 'sms' | 'email' | 'authenticator'
            )
              ? (securityData.twoFactorMethod as 'sms' | 'email' | 'authenticator')
              : (['sms', 'email', 'authenticator'] as const).includes(
                    securityData.two_factor_method as 'sms' | 'email' | 'authenticator'
                  )
                ? (securityData.two_factor_method as 'sms' | 'email' | 'authenticator')
                : prev.twoFactorMethod,
            sessionTimeout: parseNumber(
              securityData.sessionTimeout ??
                securityData.session_timeout ??
                securityData.session_timeout_minutes,
              prev.sessionTimeout
            ),
            passwordMinLength: parseNumber(
              securityData.passwordMinLength ?? securityData.password_min_length,
              prev.passwordMinLength
            ),
            passwordRequireUppercase: parseBoolean(
              securityData.passwordRequireUppercase ?? securityData.password_require_uppercase,
              prev.passwordRequireUppercase
            ),
            passwordRequireLowercase: parseBoolean(
              securityData.passwordRequireLowercase ?? securityData.password_require_lowercase,
              prev.passwordRequireLowercase
            ),
            passwordRequireNumbers: parseBoolean(
              securityData.passwordRequireNumbers ?? securityData.password_require_numbers,
              prev.passwordRequireNumbers
            ),
            passwordRequireSpecialChars: parseBoolean(
              securityData.passwordRequireSpecialChars ?? securityData.password_require_special_chars,
              prev.passwordRequireSpecialChars
            ),
            ipWhitelistEnabled: parseBoolean(
              securityData.ipWhitelistEnabled ?? securityData.ip_whitelist_enabled,
              prev.ipWhitelistEnabled
            ),
            urlWhitelistEnabled: parseBoolean(
              securityData.urlWhitelistEnabled ?? securityData.url_whitelist_enabled,
              prev.urlWhitelistEnabled
            ),
            auditLoggingEnabled: parseBoolean(
              securityData.auditLoggingEnabled ?? securityData.audit_logging_enabled,
              prev.auditLoggingEnabled
            ),
            dataEncryptionEnabled: parseBoolean(
              securityData.dataEncryptionEnabled ?? securityData.data_encryption_enabled,
              prev.dataEncryptionEnabled
            ),
          }))
        }

        const profileData = pickObject(payload, ['profile', 'userProfile', 'user_profile'])
        if (Object.keys(profileData).length > 0) {
          setProfileSettings((prev) => ({
            ...prev,
            firstName: parseString(profileData.firstName ?? profileData.first_name, prev.firstName),
            lastName: parseString(profileData.lastName ?? profileData.last_name, prev.lastName),
            email: parseString(profileData.email, prev.email),
            phone: parseString(profileData.phone, prev.phone),
          }))
        }

        const systemData = pickObject(payload, ['system', 'systemSettings', 'system_settings'])
        if (Object.keys(systemData).length > 0) {
          setSystemSettings((prev) => ({
            ...prev,
            autoBackupEnabled: parseBoolean(
              systemData.autoBackupEnabled ?? systemData.auto_backup_enabled,
              prev.autoBackupEnabled
            ),
            dataRetentionDays: parseNumber(
              systemData.dataRetentionDays ?? systemData.data_retention_days,
              prev.dataRetentionDays
            ),
          }))
        }

        const urlWhitelistData = payload.urlWhitelist ?? payload.url_whitelist ?? securityData.urlWhitelist ?? securityData.url_whitelist
        const parsedUrlWhitelist = parseWhitelist(urlWhitelistData, 'url')
        if (parsedUrlWhitelist.length > 0) setUrlWhitelist(parsedUrlWhitelist)

        const ipWhitelistData = payload.ipWhitelist ?? payload.ip_whitelist ?? securityData.ipWhitelist ?? securityData.ip_whitelist
        const parsedIpWhitelist = parseWhitelist(ipWhitelistData, 'ip')
        if (parsedIpWhitelist.length > 0) setIpWhitelist(parsedIpWhitelist)

        const themeData = pickObject(payload, ['theme', 'branding', 'themeSettings', 'theme_settings'])
        if (Object.keys(themeData).length > 0) {
          const isDarkMode = themeData.isDarkMode ?? themeData.is_dark_mode
          const logo = themeData.logo ?? themeData.companyLogo ?? themeData.company_logo
          const colors = asRecord(themeData.colors ?? themeData.colorPalette ?? themeData.color_palette)

          if (typeof isDarkMode === 'boolean') {
            updateTheme({ isDarkMode })
          }
          if (typeof logo === 'string') {
            updateLogo(logo)
          }
          if (Object.keys(colors).length > 0) {
            updateColors(colors)
          }
        }

        const eligibilityData = pickObject(payload, [
          'eligibility_services',
          'eligibility',
          'eligibilityService',
          'eligibility_service',
        ])
        if (Object.keys(eligibilityData).length > 0) {
          const service = eligibilityData.selectedService ?? eligibilityData.selected_service
          if (service === 'stedi' || service === 'pverify') {
            setSelectedService(service)
          }

          const servicesData = asRecord(eligibilityData.services)
          const stediConfig = asRecord(
            servicesData.stedi ??
              eligibilityData.stedi ??
              eligibilityData.stediConfig ??
              eligibilityData.stedi_config
          )
          const pverifyConfig = asRecord(
            servicesData.pverify ??
              eligibilityData.pverify ??
              eligibilityData.pverifyConfig ??
              eligibilityData.pverify_config
          )

          if (Object.keys(stediConfig).length > 0) {
            updateServiceConfig('stedi', {
              apiUrl: parseString(stediConfig.apiUrl ?? stediConfig.api_url, serviceConfigs.stedi.apiUrl),
              apiKey: parseString(stediConfig.apiKey ?? stediConfig.api_key, serviceConfigs.stedi.apiKey),
            })
          }

          if (Object.keys(pverifyConfig).length > 0) {
            updateServiceConfig('pverify', {
              apiUrl: parseString(pverifyConfig.apiUrl ?? pverifyConfig.api_url, serviceConfigs.pverify.apiUrl),
              eligibilityPath: parseString(
                pverifyConfig.eligibilityPath ?? pverifyConfig.eligibility_path,
                serviceConfigs.pverify.eligibilityPath
              ),
              clientKey: parseString(
                pverifyConfig.clientKey ?? pverifyConfig.client_key,
                serviceConfigs.pverify.clientKey
              ),
              clientSecret: parseString(
                pverifyConfig.clientSecret ?? pverifyConfig.client_secret,
                serviceConfigs.pverify.clientSecret
              ),
              clientApiId: parseString(
                pverifyConfig.clientApiId ?? pverifyConfig.client_api_id,
                serviceConfigs.pverify.clientApiId
              ),
              clientUserName: parseString(
                pverifyConfig.clientUserName ?? pverifyConfig.client_user_name,
                serviceConfigs.pverify.clientUserName
              ),
            })
          }
        }
      } catch (error) {
        setToastMessage(error instanceof Error ? error.message : 'Unable to load settings')
        setShowToast(true)
      }
    }

    loadSettings()
  }, [apiReady])

  useEffect(() => {
    if (!apiReady) return

    const asRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

    const parseOptions = (list: unknown[]): EligibilityServiceOption[] =>
      list
        .map((item) => {
          const option = asRecord(item)
          const id = option.id
          if (id !== 'stedi' && id !== 'pverify') return null
          return {
            id,
            title:
              typeof option.title === 'string'
                ? option.title
                : id === 'stedi'
                  ? 'Stedi'
                  : 'pVerify',
            desc:
              typeof option.desc === 'string'
                ? option.desc
                : typeof option.description === 'string'
                  ? option.description
                  : `Use ${id === 'stedi' ? 'Stedi' : 'pVerify'} eligibility API`,
          }
        })
        .filter((option): option is EligibilityServiceOption => option !== null)

    const loadEligibilityServiceOptions = async () => {
      try {
        const response = await getEligibilityServiceOptions()
        const maybeArray = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(asRecord(response?.data).options)
              ? (asRecord(response?.data).options as unknown[])
              : []

        const parsed = parseOptions(maybeArray)
        setEligibilityServiceOptions(
          parsed.length > 0 ? parsed : DEFAULT_ELIGIBILITY_SERVICE_OPTIONS
        )
      } catch {
        setEligibilityServiceOptions(DEFAULT_ELIGIBILITY_SERVICE_OPTIONS)
      }
    }

    loadEligibilityServiceOptions()
  }, [apiReady])

  useEffect(() => {
    if (!apiReady) return

    const asRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

    const parseString = (value: unknown, fallback: string): string =>
      typeof value === 'string' ? value : fallback

    const loadEligibilityServiceConfig = async () => {
      try {
        const response = await getEligibilityServiceConfig()

        const payload = asRecord(response.data ?? response)
        const configData = asRecord(
          payload.config ??
            payload.eligibility_services ??
            payload.eligibility ??
            payload.eligibilityService ??
            payload.eligibility_service ??
            payload
        )

        const service = configData.selectedService ?? configData.selected_service
        if (service === 'stedi' || service === 'pverify') {
          setSelectedService(service)
        }

        const servicesData = asRecord(configData.services)
        const stediConfig = asRecord(
          servicesData.stedi ?? configData.stedi ?? configData.stediConfig ?? configData.stedi_config
        )
        const pverifyConfig = asRecord(
          servicesData.pverify ??
            configData.pverify ??
            configData.pverifyConfig ??
            configData.pverify_config
        )

        if (Object.keys(stediConfig).length > 0) {
          updateServiceConfig('stedi', {
            apiUrl: parseString(stediConfig.apiUrl ?? stediConfig.api_url, serviceConfigs.stedi.apiUrl),
            apiKey: parseString(stediConfig.apiKey ?? stediConfig.api_key, serviceConfigs.stedi.apiKey),
          })
        }

        if (Object.keys(pverifyConfig).length > 0) {
          updateServiceConfig('pverify', {
            apiUrl: parseString(pverifyConfig.apiUrl ?? pverifyConfig.api_url, serviceConfigs.pverify.apiUrl),
            eligibilityPath: parseString(
              pverifyConfig.eligibilityPath ?? pverifyConfig.eligibility_path,
              serviceConfigs.pverify.eligibilityPath
            ),
            clientKey: parseString(
              pverifyConfig.clientKey ?? pverifyConfig.client_key,
              serviceConfigs.pverify.clientKey
            ),
            clientSecret: parseString(
              pverifyConfig.clientSecret ?? pverifyConfig.client_secret,
              serviceConfigs.pverify.clientSecret
            ),
            clientApiId: parseString(
              pverifyConfig.clientApiId ?? pverifyConfig.client_api_id,
              serviceConfigs.pverify.clientApiId
            ),
            clientUserName: parseString(
              pverifyConfig.clientUserName ?? pverifyConfig.client_user_name,
              serviceConfigs.pverify.clientUserName
            ),
          })
        }
      } catch {
        // Keep existing local/loaded config when endpoint fails.
      }
    }

    loadEligibilityServiceConfig()
  }, [apiReady])

  useEffect(() => {
    if (!apiReady || activeTab !== 'productServices') return
    let cancelled = false
    const load = async () => {
      setProductServiceLoading(true)
      try {
        const rows = await fetchProductServiceTypesWithInactive(productServiceSubTab)
        if (!cancelled) setProductServiceRows(rows)
      } catch (error) {
        if (!cancelled) {
          setProductServiceRows([])
          setToastMessage(
            error instanceof Error ? error.message : 'Unable to load product service types'
          )
          setShowToast(true)
        }
      } finally {
        if (!cancelled) setProductServiceLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeTab, productServiceSubTab])

  const handleProductServiceToggle = useCallback(
    async (row: ProductServiceTypeItem, nextEnabled: boolean) => {
      const productServiceTypeId = productServiceTypeRowKey(row)
      const status = nextEnabled ? 'active' : 'inactive'

      setProductServiceTogglingId(productServiceTypeId)
      try {
        await patchProductServiceTypeStatus(productServiceTypeId, status)
        setProductServiceRows((prev: ProductServiceTypeItem[]): ProductServiceTypeItem[] => {
          const next = prev.map((r: ProductServiceTypeItem): ProductServiceTypeItem =>
            productServiceTypeRowKey(r) === productServiceTypeId ? { ...r, enabled: nextEnabled, status } : r
          )
          return next.slice().sort((a, b) => {
            const aIn = a.status === 'inactive' ? 1 : 0
            const bIn = b.status === 'inactive' ? 1 : 0
            if (aIn !== bIn) return aIn - bIn
            return (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.slug.localeCompare(b.slug)
          })
        })
        setToastMessage('Product service updated')
        setShowToast(true)
      } catch (error) {
        setToastMessage(error instanceof Error ? error.message : 'Unable to update product service')
        setShowToast(true)
      } finally {
        setProductServiceTogglingId(null)
      }
    },
    []
  )

  const handleSecuritySettingChange = (field: keyof SecuritySettings, value: boolean | number | string) => {
    setSecuritySettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileSettingChange = (
    field: keyof ProfileSettings,
    value: string
  ) => {
    setProfileSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSystemSettingChange = (
    field: keyof SystemSettings,
    value: boolean | number
  ) => {
    setSystemSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddWhitelistItem = () => {
    if (!newWhitelistItem.value.trim()) {
      setToastMessage('Please enter a valid URL or IP address')
      setShowToast(true)
      return
    }

    const newItem: WhitelistItem = {
      id: Date.now().toString(),
      value: newWhitelistItem.value.trim(),
      type: newWhitelistItem.type,
    }

    if (newWhitelistItem.type === 'url') {
      setUrlWhitelist((prev) => [...prev, newItem])
    } else {
      setIpWhitelist((prev) => [...prev, newItem])
    }

    setNewWhitelistItem({ value: '', type: 'url' })
    setToastMessage(`${newWhitelistItem.type === 'url' ? 'URL' : 'IP'} added to whitelist`)
    setShowToast(true)
  }

  const handleRemoveWhitelistItem = (id: string, type: 'url' | 'ip') => {
    if (type === 'url') {
      setUrlWhitelist((prev) => prev.filter((item) => item.id !== id))
    } else {
      setIpWhitelist((prev) => prev.filter((item) => item.id !== id))
    }
    setToastMessage(`${type === 'url' ? 'URL' : 'IP'} removed from whitelist`)
    setShowToast(true)
  }

  const handleSaveSettings = async () => {
    try {
      await putSettingsFull({
        profile: {
          first_name: profileSettings.firstName.trim(),
          last_name: profileSettings.lastName.trim(),
          email: profileSettings.email.trim(),
          phone: profileSettings.phone.trim(),
        },
        security: {
          mfa_enabled: securitySettings.mfaEnabled,
          two_factor_auth_enabled: securitySettings.twoFactorAuthEnabled,
          two_factor_method: securitySettings.twoFactorMethod,
          session_timeout_minutes: securitySettings.sessionTimeout,
          password_min_length: securitySettings.passwordMinLength,
          password_require_uppercase: securitySettings.passwordRequireUppercase,
          password_require_lowercase: securitySettings.passwordRequireLowercase,
          password_require_numbers: securitySettings.passwordRequireNumbers,
          password_require_special_chars: securitySettings.passwordRequireSpecialChars,
          ip_whitelist_enabled: securitySettings.ipWhitelistEnabled,
          url_whitelist_enabled: securitySettings.urlWhitelistEnabled,
        },
        system: {
          auto_backup_enabled: systemSettings.autoBackupEnabled,
          data_retention_days: systemSettings.dataRetentionDays,
        },
        compliance: {
          audit_logging_enabled: securitySettings.auditLoggingEnabled,
          data_encryption_enabled: securitySettings.dataEncryptionEnabled,
        },
        theme: {
          is_dark_mode: theme.isDarkMode,
          colors: theme.colors,
        },
        whitelist_entries: [
          ...urlWhitelist.map((item) => ({
            entry_type: 'url',
            value: item.value.trim(),
            is_active: true,
          })),
          ...ipWhitelist.map((item) => ({
            entry_type: 'ip',
            value: item.value.trim(),
            is_active: true,
          })),
        ],
      })
      setToastMessage('Settings saved successfully!')
      setShowToast(true)
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Unable to save settings')
      setShowToast(true)
    }
  }

  const handleSaveEligibilityServiceConfig = async () => {
    try {
      await putEligibilityServiceConfig({
        selected_service: selectedService,
        services: {
          stedi: {
            api_url: serviceConfigs.stedi.apiUrl.trim(),
            api_key: serviceConfigs.stedi.apiKey.trim(),
          },
          pverify: {
            api_url: serviceConfigs.pverify.apiUrl.trim(),
            eligibility_path: serviceConfigs.pverify.eligibilityPath.trim(),
            client_key: serviceConfigs.pverify.clientKey.trim(),
            client_secret: serviceConfigs.pverify.clientSecret.trim(),
            client_api_id: serviceConfigs.pverify.clientApiId.trim(),
            client_user_name: serviceConfigs.pverify.clientUserName.trim(),
          },
        },
      })
      setToastMessage('Eligibility service config saved successfully!')
      setShowToast(true)
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Unable to save eligibility config')
      setShowToast(true)
    }
  }

  const tabs = [
    { id: 'theme', label: 'Theme & Branding', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'account', label: 'Account', icon: User },
    { id: 'system', label: 'System', icon: Database },
    { id: 'eligibility', label: 'Eligibility Services', icon: Globe },
    { id: 'productServices', label: 'Product Services', icon: Layers },
    { id: 'compliance', label: 'Compliance', icon: FileText },
  ]

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setToastMessage('Logo file size must be less than 2MB')
        setShowToast(true)
        return
      }
      if (!file.type.startsWith('image/')) {
        setToastMessage('Please upload an image file')
        setShowToast(true)
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        updateLogo(base64String)
        setToastMessage('Logo uploaded successfully!')
        setShowToast(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    updateLogo('')
    setToastMessage('Logo removed')
    setShowToast(true)
  }

  const handleColorChange = (colorKey: keyof typeof theme.colors, value: string) => {
    updateColors({ [colorKey]: value })
  }

  const handleSaveTheme = async () => {
    await handleSaveSettings()
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto min-w-0">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account security, preferences, and system configurations
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(
                        tab.id as
                          | 'theme'
                          | 'security'
                          | 'account'
                          | 'system'
                          | 'eligibility'
                          | 'productServices'
                          | 'compliance'
                      )
                    }
                    className={`
                      flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors shrink-0
                      ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeTab === 'theme' && (
              <div className="space-y-8">
                {/* Dark Mode Toggle */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    {theme.isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                    Appearance
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div>
                        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Dark Mode
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Switch between light and dark theme
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={theme.isDarkMode}
                          onChange={toggleDarkMode}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ImageIcon size={20} />
                    Branding
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Company Logo
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Upload your company logo (max 2MB, PNG, JPG, or SVG)
                      </p>
                      <div className="flex items-center gap-4">
                        {theme.logo && (
                          <div className="relative">
                            <img
                              src={theme.logo}
                              alt="Company Logo"
                              className="h-16 w-auto object-contain border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2"
                          >
                            <Upload size={16} />
                            {theme.logo ? 'Change Logo' : 'Upload Logo'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color Customization */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Palette size={20} />
                    Color Customization
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Customize the color scheme of your application
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Color */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.primary}
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="primaryColor"
                          type="text"
                          value={theme.colors.primary}
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                          className="flex-1"
                          placeholder="#0284c7"
                        />
                      </div>
                    </div>

                    {/* Primary Hover */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Primary Hover
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.primaryHover}
                          onChange={(e) => handleColorChange('primaryHover', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="primaryHoverColor"
                          type="text"
                          value={theme.colors.primaryHover}
                          onChange={(e) => handleColorChange('primaryHover', e.target.value)}
                          className="flex-1"
                          placeholder="#0369a1"
                        />
                      </div>
                    </div>

                    {/* Button Primary */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Button Primary
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.buttonPrimary}
                          onChange={(e) => handleColorChange('buttonPrimary', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="buttonPrimaryColor"
                          type="text"
                          value={theme.colors.buttonPrimary}
                          onChange={(e) => handleColorChange('buttonPrimary', e.target.value)}
                          className="flex-1"
                          placeholder="#0284c7"
                        />
                      </div>
                    </div>

                    {/* Button Primary Hover */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Button Primary Hover
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.buttonPrimaryHover}
                          onChange={(e) => handleColorChange('buttonPrimaryHover', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="buttonPrimaryHoverColor"
                          type="text"
                          value={theme.colors.buttonPrimaryHover}
                          onChange={(e) => handleColorChange('buttonPrimaryHover', e.target.value)}
                          className="flex-1"
                          placeholder="#0369a1"
                        />
                      </div>
                    </div>

                    {/* Button Secondary */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Button Secondary
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.buttonSecondary}
                          onChange={(e) => handleColorChange('buttonSecondary', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="buttonSecondaryColor"
                          type="text"
                          value={theme.colors.buttonSecondary}
                          onChange={(e) => handleColorChange('buttonSecondary', e.target.value)}
                          className="flex-1"
                          placeholder="#e5e7eb"
                        />
                      </div>
                    </div>

                    {/* Button Secondary Hover */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Button Secondary Hover
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.buttonSecondaryHover}
                          onChange={(e) => handleColorChange('buttonSecondaryHover', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="buttonSecondaryHoverColor"
                          type="text"
                          value={theme.colors.buttonSecondaryHover}
                          onChange={(e) => handleColorChange('buttonSecondaryHover', e.target.value)}
                          className="flex-1"
                          placeholder="#d1d5db"
                        />
                      </div>
                    </div>

                    {/* Card Background */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Card Background
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.cardBackground}
                          onChange={(e) => handleColorChange('cardBackground', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="cardBackgroundColor"
                          type="text"
                          value={theme.colors.cardBackground}
                          onChange={(e) => handleColorChange('cardBackground', e.target.value)}
                          className="flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Card Border */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Card Border
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.cardBorder}
                          onChange={(e) => handleColorChange('cardBorder', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="cardBorderColor"
                          type="text"
                          value={theme.colors.cardBorder}
                          onChange={(e) => handleColorChange('cardBorder', e.target.value)}
                          className="flex-1"
                          placeholder="#e5e7eb"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Colors */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Table2 size={20} />
                    Table Colors
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Customize table appearance
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Table Header Background */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Table Header Background
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.tableHeaderBackground}
                          onChange={(e) => handleColorChange('tableHeaderBackground', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="tableHeaderBackgroundColor"
                          type="text"
                          value={theme.colors.tableHeaderBackground}
                          onChange={(e) => handleColorChange('tableHeaderBackground', e.target.value)}
                          className="flex-1"
                          placeholder="#f9fafb"
                        />
                      </div>
                    </div>

                    {/* Table Header Text */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Table Header Text
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.tableHeaderText}
                          onChange={(e) => handleColorChange('tableHeaderText', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="tableHeaderTextColor"
                          type="text"
                          value={theme.colors.tableHeaderText}
                          onChange={(e) => handleColorChange('tableHeaderText', e.target.value)}
                          className="flex-1"
                          placeholder="#6b7280"
                        />
                      </div>
                    </div>

                    {/* Table Row Background */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Table Row Background
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.tableRowBackground}
                          onChange={(e) => handleColorChange('tableRowBackground', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="tableRowBackgroundColor"
                          type="text"
                          value={theme.colors.tableRowBackground}
                          onChange={(e) => handleColorChange('tableRowBackground', e.target.value)}
                          className="flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Table Row Hover */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Table Row Hover
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.tableRowHover}
                          onChange={(e) => handleColorChange('tableRowHover', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="tableRowHoverColor"
                          type="text"
                          value={theme.colors.tableRowHover}
                          onChange={(e) => handleColorChange('tableRowHover', e.target.value)}
                          className="flex-1"
                          placeholder="#f9fafb"
                        />
                      </div>
                    </div>

                    {/* Table Border */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Table Border
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.tableBorder}
                          onChange={(e) => handleColorChange('tableBorder', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="tableBorderColor"
                          type="text"
                          value={theme.colors.tableBorder}
                          onChange={(e) => handleColorChange('tableBorder', e.target.value)}
                          className="flex-1"
                          placeholder="#e5e7eb"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Header Colors */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Navigation size={20} />
                    Navigation Header Colors
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Customize the top navigation header appearance
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nav Header Background */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Header Background
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.navHeaderBackground}
                          onChange={(e) => handleColorChange('navHeaderBackground', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="navHeaderBackgroundColor"
                          type="text"
                          value={theme.colors.navHeaderBackground}
                          onChange={(e) => handleColorChange('navHeaderBackground', e.target.value)}
                          className="flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Nav Header Text */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Header Text
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.navHeaderText}
                          onChange={(e) => handleColorChange('navHeaderText', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="navHeaderTextColor"
                          type="text"
                          value={theme.colors.navHeaderText}
                          onChange={(e) => handleColorChange('navHeaderText', e.target.value)}
                          className="flex-1"
                          placeholder="#111827"
                        />
                      </div>
                    </div>

                    {/* Nav Header Border */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Header Border
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.navHeaderBorder}
                          onChange={(e) => handleColorChange('navHeaderBorder', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="navHeaderBorderColor"
                          type="text"
                          value={theme.colors.navHeaderBorder}
                          onChange={(e) => handleColorChange('navHeaderBorder', e.target.value)}
                          className="flex-1"
                          placeholder="#e5e7eb"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Colors */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Sidebar size={20} />
                    Sidebar Colors
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Customize the sidebar appearance
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sidebar Active Background */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Active Item Background
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.sidebarActiveBackground}
                          onChange={(e) => handleColorChange('sidebarActiveBackground', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="sidebarActiveBackgroundColor"
                          type="text"
                          value={theme.colors.sidebarActiveBackground}
                          onChange={(e) => handleColorChange('sidebarActiveBackground', e.target.value)}
                          className="flex-1"
                          placeholder="#e0f2fe"
                        />
                      </div>
                    </div>

                    {/* Sidebar Active Text */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Active Item Text
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.sidebarActiveText}
                          onChange={(e) => handleColorChange('sidebarActiveText', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="sidebarActiveTextColor"
                          type="text"
                          value={theme.colors.sidebarActiveText}
                          onChange={(e) => handleColorChange('sidebarActiveText', e.target.value)}
                          className="flex-1"
                          placeholder="#0284c7"
                        />
                      </div>
                    </div>

                    {/* Sidebar Hover Background */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Hover Item Background
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.sidebarHoverBackground}
                          onChange={(e) => handleColorChange('sidebarHoverBackground', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="sidebarHoverBackgroundColor"
                          type="text"
                          value={theme.colors.sidebarHoverBackground}
                          onChange={(e) => handleColorChange('sidebarHoverBackground', e.target.value)}
                          className="flex-1"
                          placeholder="#e0f2fe"
                        />
                      </div>
                    </div>

                    {/* Sidebar Hover Text */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Hover Item Text
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.sidebarHoverText}
                          onChange={(e) => handleColorChange('sidebarHoverText', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="sidebarHoverTextColor"
                          type="text"
                          value={theme.colors.sidebarHoverText}
                          onChange={(e) => handleColorChange('sidebarHoverText', e.target.value)}
                          className="flex-1"
                          placeholder="#0284c7"
                        />
                      </div>
                    </div>

                    {/* Sidebar Text */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Sidebar Text
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.sidebarText}
                          onChange={(e) => handleColorChange('sidebarText', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="sidebarTextColor"
                          type="text"
                          value={theme.colors.sidebarText}
                          onChange={(e) => handleColorChange('sidebarText', e.target.value)}
                          className="flex-1"
                          placeholder="#374151"
                        />
                      </div>
                    </div>

                    {/* Sidebar Border */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Sidebar Border
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.colors.sidebarBorder}
                          onChange={(e) => handleColorChange('sidebarBorder', e.target.value)}
                          className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <Input
                          name="sidebarBorderColor"
                          type="text"
                          value={theme.colors.sidebarBorder}
                          onChange={(e) => handleColorChange('sidebarBorder', e.target.value)}
                          className="flex-1"
                          placeholder="#e5e7eb"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reset Theme */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Reset to Default</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Reset all theme settings to default values
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetTheme}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Reset Theme
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                {/* Authentication Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock size={20} />
                    Authentication Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Multi-Factor Authentication (MFA)
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Require additional verification for account access
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.mfaEnabled}
                          onChange={(e) => handleSecuritySettingChange('mfaEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Two-Factor Authentication (2FA)
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Enable two-factor authentication for enhanced security
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.twoFactorAuthEnabled}
                          onChange={(e) => handleSecuritySettingChange('twoFactorAuthEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    {securitySettings.twoFactorAuthEnabled && (
                      <div className="ml-4 p-4 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          2FA Method
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'sms', label: 'SMS' },
                            { value: 'email', label: 'Email' },
                            { value: 'authenticator', label: 'Authenticator App' },
                          ].map((method) => (
                            <label key={method.value} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="twoFactorMethod"
                                value={method.value}
                                checked={securitySettings.twoFactorMethod === method.value}
                                onChange={(e) => handleSecuritySettingChange('twoFactorMethod', e.target.value)}
                                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">{method.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Session Timeout (minutes)
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Automatically log out after inactivity
                        </p>
                      </div>
                      <Input
                        name="sessionTimeout"
                        type="number"
                        value={securitySettings.sessionTimeout.toString()}
                        onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value) || 30)}
                        className="w-24"
                        min="5"
                        max="480"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Requirements */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Key size={20} />
                    Password Requirements
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Minimum Length
                        </label>
                      </div>
                      <Input
                        name="passwordMinLength"
                        type="number"
                        value={securitySettings.passwordMinLength.toString()}
                        onChange={(e) => handleSecuritySettingChange('passwordMinLength', parseInt(e.target.value) || 8)}
                        className="w-24"
                        min="6"
                        max="32"
                      />
                    </div>
                    {[
                      { field: 'passwordRequireUppercase', label: 'Require Uppercase Letters' },
                      { field: 'passwordRequireLowercase', label: 'Require Lowercase Letters' },
                      { field: 'passwordRequireNumbers', label: 'Require Numbers' },
                      { field: 'passwordRequireSpecialChars', label: 'Require Special Characters' },
                    ].map((req) => (
                      <div key={req.field} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <label className="text-sm font-medium text-gray-900">{req.label}</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings[req.field as keyof SecuritySettings] as boolean}
                            onChange={(e) => handleSecuritySettingChange(req.field as keyof SecuritySettings, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* URL Whitelisting */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe size={20} />
                    URL Whitelisting
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Enable URL Whitelisting
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Restrict access to only whitelisted URLs
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.urlWhitelistEnabled}
                          onChange={(e) => handleSecuritySettingChange('urlWhitelistEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    {securitySettings.urlWhitelistEnabled && (
                      <div className="ml-4 space-y-4">
                        <div className="space-y-2">
                          {urlWhitelist.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <span className="flex-1 text-sm text-gray-700">{item.value}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWhitelistItem(item.id, 'url')}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            name="newUrl"
                            value={newWhitelistItem.type === 'url' ? newWhitelistItem.value : ''}
                            onChange={(e) => setNewWhitelistItem({ ...newWhitelistItem, value: e.target.value, type: 'url' })}
                            placeholder="Enter URL (e.g., https://example.com)"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleAddWhitelistItem}
                            className="flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Add URL
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* IP Whitelisting */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield size={20} />
                    IP Whitelisting
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Enable IP Whitelisting
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Restrict access to only whitelisted IP addresses
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.ipWhitelistEnabled}
                          onChange={(e) => handleSecuritySettingChange('ipWhitelistEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    {securitySettings.ipWhitelistEnabled && (
                      <div className="ml-4 space-y-4">
                        <div className="space-y-2">
                          {ipWhitelist.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <span className="flex-1 text-sm text-gray-700">{item.value}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWhitelistItem(item.id, 'ip')}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            name="newIp"
                            value={newWhitelistItem.type === 'ip' ? newWhitelistItem.value : ''}
                            onChange={(e) => setNewWhitelistItem({ ...newWhitelistItem, value: e.target.value, type: 'ip' })}
                            placeholder="Enter IP address (e.g., 192.168.1.1)"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleAddWhitelistItem}
                            className="flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Add IP
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* API Key Management */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Key size={20} />
                    API Key Management
                  </h3>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          API Key
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Your API key for external integrations
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="flex items-center gap-2"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showApiKey ? 'Hide' : 'Show'} Key
                      </Button>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm">
                      {showApiKey ? 'sk_live_1234567890abcdefghijklmnopqrstuvwxyz' : '••••••••••••••••••••••••••••••••'}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button type="button" variant="outline" size="sm">
                        Regenerate Key
                      </Button>
                      <Button type="button" variant="outline" size="sm">
                        Copy Key
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      name="firstName"
                      value={profileSettings.firstName}
                      onChange={(e) => handleProfileSettingChange('firstName', e.target.value)}
                    />
                    <Input
                      label="Last Name"
                      name="lastName"
                      value={profileSettings.lastName}
                      onChange={(e) => handleProfileSettingChange('lastName', e.target.value)}
                    />
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={profileSettings.email}
                      onChange={(e) => handleProfileSettingChange('email', e.target.value)}
                    />
                    <Input
                      label="Phone"
                      name="phone"
                      type="tel"
                      value={profileSettings.phone}
                      onChange={(e) => handleProfileSettingChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Bell size={20} />
                    Notification Preferences
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Email Notifications', enabled: true },
                      { label: 'SMS Notifications', enabled: false },
                      { label: 'Push Notifications', enabled: true },
                      { label: 'Eligibility Check Alerts', enabled: true },
                      { label: 'Prior Auth Status Updates', enabled: true },
                    ].map((notif) => (
                      <div key={notif.label} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <label className="text-sm font-medium text-gray-900">{notif.label}</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={notif.enabled}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'productServices' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Product services by eligibility vendor
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Both the active and inactive lists use the vendor you select (Stedi or pVerify)—only that
                    vendor&apos;s items load. Use the list toggle next to search to switch between active and inactive.
                    Each row&apos;s switch moves that item between active and inactive; changes save immediately.
                  </p>
                </div>

                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex gap-1 -mb-px">
                    {(['stedi', 'pverify'] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setProductServiceSubTab(id)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                          productServiceSubTab === id
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        {id === 'stedi' ? 'Stedi Services' : 'pVerify Services'}
                      </button>
                    ))}
                  </nav>
                </div>

                {!productServiceLoading && productServiceRows.length > 0 && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="relative flex-1 min-w-0">
                      <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={productServiceSearch}
                        onChange={(e) => setProductServiceSearch(e.target.value)}
                        placeholder="Search by name, slug, or group…"
                        autoComplete="off"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div
                      className="flex items-center justify-between gap-3 sm:justify-end shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-3 py-2 sm:py-2.5 sm:pl-4 sm:pr-3"
                      role="group"
                      aria-label="Choose active or inactive list"
                    >
                      <span
                        className={`text-sm font-medium whitespace-nowrap ${
                          !productServiceShowInactiveList
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        Active list
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={productServiceShowInactiveList}
                          onChange={(e) => setProductServiceShowInactiveList(e.target.checked)}
                          aria-label={productServiceShowInactiveList ? 'Showing inactive list' : 'Showing active list'}
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                      </label>
                      <span
                        className={`text-sm font-medium whitespace-nowrap ${
                          productServiceShowInactiveList
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        Inactive list
                      </span>
                    </div>
                  </div>
                )}

                {productServiceLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading product services…</p>
                ) : productServiceRows.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No product service types returned.</p>
                ) : filteredProductServiceRows.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No product services match &ldquo;{productServiceSearch.trim()}&rdquo;. Try a different search.
                  </p>
                ) : visibleProductServiceRows.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {productServiceShowInactiveList
                      ? productServiceSearch.trim()
                        ? 'No inactive services match your search. Try the Active list or clear the search.'
                        : 'No inactive services returned. Toggle to Active list to see active items.'
                      : productServiceSearch.trim()
                        ? 'No active services match your search. Try the Inactive list or clear the search.'
                        : 'No active services for this tab. Toggle to Inactive list to see inactive items.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex flex-wrap items-baseline gap-x-2">
                      {productServiceShowInactiveList ? 'Inactive list' : 'Active list'}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        ({visibleProductServiceRows.length})
                      </span>
                    </h4>
                    <div className="space-y-6">
                      {visibleProductServiceGroups.map(({ heading, rows: groupRows }) => (
                        <div key={heading ?? 'all'} className="space-y-2">
                          {heading != null && (
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 pb-1.5">
                              {heading}
                              <span className="ml-1.5 font-normal normal-case text-gray-400 dark:text-gray-500">
                                ({groupRows.length})
                              </span>
                            </h5>
                          )}
                          <div
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                            role="list"
                            aria-label={
                              heading
                                ? `${heading} — ${productServiceShowInactiveList ? 'inactive' : 'active'}`
                                : productServiceShowInactiveList
                                  ? 'Inactive product services'
                                  : 'Active product services'
                            }
                          >
                            {groupRows.map((row) => {
                              const isInactiveCard = row.status === 'inactive'
                              return (
                                <div
                                  key={productServiceTypeRowKey(row)}
                                  role="listitem"
                                  className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-sm ${
                                    isInactiveCard
                                      ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/25'
                                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                                        {row.label}
                                      </p>
                                      {isInactiveCard && (
                                        <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                                          Inactive
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1 truncate">
                                      {row.slug}
                                    </p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={row.enabled}
                                      disabled={productServiceTogglingId === productServiceTypeRowKey(row)}
                                      onChange={(e) => handleProductServiceToggle(row, e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50" />
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'eligibility' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Active Eligibility Service
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {eligibilityServiceOptions.map((svc) => (
                        <label
                          key={svc.id}
                          className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                            selectedService === svc.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="eligibilityService"
                            value={svc.id}
                            checked={selectedService === svc.id}
                            onChange={() => setSelectedService(svc.id as 'stedi' | 'pverify')}
                            className="sr-only"
                          />
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {svc.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{svc.desc}</p>
                        </label>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Stedi Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Stedi API URL"
                      name="stediApiUrl"
                      value={serviceConfigs.stedi.apiUrl}
                      onChange={(e) => updateServiceConfig('stedi', { apiUrl: e.target.value })}
                      placeholder="https://api.stedi.com/..."
                    />
                    <Input
                      label="API Key"
                      name="stediApiKey"
                      type="password"
                      value={serviceConfigs.stedi.apiKey}
                      onChange={(e) =>
                        updateServiceConfig('stedi', { apiKey: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    pVerify Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="pVerify API URL"
                      name="pverifyApiUrl"
                      value={serviceConfigs.pverify.apiUrl}
                      onChange={(e) => updateServiceConfig('pverify', { apiUrl: e.target.value })}
                      placeholder="https://testapi.pverify.com"
                    />
                    <Input
                      label="Eligibility Path"
                      name="pverifyEligibilityPath"
                      value={serviceConfigs.pverify.eligibilityPath}
                      onChange={(e) =>
                        updateServiceConfig('pverify', { eligibilityPath: e.target.value })
                      }
                      placeholder="/api/EligibilitySummary"
                    />
                    <Input
                      label="Client Key"
                      name="pverifyClientKey"
                      value={serviceConfigs.pverify.clientKey}
                      onChange={(e) =>
                        updateServiceConfig('pverify', { clientKey: e.target.value })
                      }
                    />
                    <Input
                      label="Client Secret"
                      name="pverifyClientSecret"
                      type="password"
                      value={serviceConfigs.pverify.clientSecret}
                      onChange={(e) =>
                        updateServiceConfig('pverify', { clientSecret: e.target.value })
                      }
                    />
                    <Input
                      label="Client API ID"
                      name="pverifyClientApiId"
                      value={serviceConfigs.pverify.clientApiId}
                      onChange={(e) =>
                        updateServiceConfig('pverify', { clientApiId: e.target.value })
                      }
                    />
                    <Input
                      label="Client User Name"
                      name="pverifyClientUserName"
                      value={serviceConfigs.pverify.clientUserName}
                      onChange={(e) =>
                        updateServiceConfig('pverify', { clientUserName: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Auto Backup
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Automatically backup data daily
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemSettings.autoBackupEnabled}
                          onChange={(e) => handleSystemSettingChange('autoBackupEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Data Retention (days)
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          How long to keep patient data
                        </p>
                      </div>
                      <Input
                        name="dataRetention"
                        type="number"
                        value={systemSettings.dataRetentionDays.toString()}
                        onChange={(e) =>
                          handleSystemSettingChange('dataRetentionDays', parseInt(e.target.value, 10) || 365)
                        }
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">HIPAA Compliance</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Audit Logging
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Log all system access and data changes
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.auditLoggingEnabled}
                          onChange={(e) => handleSecuritySettingChange('auditLoggingEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Data Encryption
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Encrypt sensitive patient data at rest
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.dataEncryptionEnabled}
                          onChange={(e) => handleSecuritySettingChange('dataEncryptionEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
            </div>
            )}

            {/* Save Button */}
            {activeTab !== 'productServices' && (
              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
                <Button
                  type="button"
                  variant="primary"
                  onClick={
                    activeTab === 'theme'
                      ? handleSaveTheme
                      : activeTab === 'eligibility'
                        ? handleSaveEligibilityServiceConfig
                        : handleSaveSettings
                  }
                  className="flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Settings
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </div>
  )
}

export default Settings
