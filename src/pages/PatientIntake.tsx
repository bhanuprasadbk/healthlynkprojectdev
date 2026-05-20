import {
  useState,
  useEffect,
  useMemo,
  useRef,
  ChangeEvent,
  FormEvent,
  DragEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../routes/routeMap'
import {
  AlertCircle,
  X,
  FileImage,
  Loader2,
  CheckCircle2,
  Upload,
  ClipboardList,
  HelpCircle,
  Search,
} from 'lucide-react'
import Stepper from '../components/Stepper'
import Input from '../components/forms/Input'
import DateInput from '../components/forms/DateInput'
import Select from '../components/forms/Select'
import SearchableSelect from '../components/forms/SearchableSelect'
import Button from '../components/forms/Button'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import { initialPayors } from '../data/payorData'
import { getServiceTypeCodeOptions } from '../data/serviceTypeCodes'
import { relationOptions } from '../data/providerConfig'
import { type IntakeEligibilityForm } from '../services/pverifyEligibilityPayload'
import { mapPverifyToEligibilityView } from '../services/mapPverifyToEligibilityView'
import { submitEligibilityCheck } from '../services/eligibilityService'
import { fetchPverifyPayers } from '../services/pverifyService'
import { fetchStediPayers } from '../services/stediService'
import { uploadIntegrationFile } from '../services/cloudinaryUpload'
import { analyzeHealthInsuranceCardFromUrl } from '../services/azureHealthInsuranceCardAnalyze'
import {
  listHealthCardPersons,
  mapAzureHealthInsuranceResultToIntakeForm,
  matchPverifyPayerForInsurer,
  type HealthCardPersonOption,
  type IntakeFormPatchFromHealthCard,
} from '../services/mapAzureHealthCardToIntakeForm'
import {
  searchProviders,
  applyNppesProviderToFormFields,
  getNppesProviderTableRows,
} from '../services/npiRegistry'
import { getDefaultProvider } from '../services/providerNpiService'
import { PatientFlowCogniThemeScope, useTheme } from '../contexts/ThemeContext'
import { useEligibilityServiceConfig } from '../contexts/EligibilityServiceContext'
import { surfacePrefersDarkColorScheme } from '../theme/surfaceColorScheme'

interface FormData {
  patientFirstName: string
  patientLastName: string
  patientDOB: string
  patientGender: string
  patientZip: string
  patientPhone: string
  patientEmail: string
  subscriberFirstName: string
  subscriberLastName: string
  subscriberDOB: string
  subscriberID: string
  relationToSubscriber: string
  subscriberZip: string
  payor: string
  payerCode: string
  groupNumber: string
  policyNumber: string
  cptHcpcCode: string
  serviceTypeCodes: string[]
  npi: string
  providerFirstName: string
  providerLastName: string
  doctorName: string
  doctorSpecialty: string
  /** NPPES address row chosen in Doctor Details table */
  providerPracticeAddress: string
  providerPhone: string
  providerFax: string
  serviceDateFrom: string
  serviceDateTo: string
  diagnosisCode: string
  placeOfService: string
}

interface FormErrors {
  [key: string]: string | undefined
}

type PayerRow = {
  payerName: string
  payerCode: string
  searchText?: string
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addMonthsIso(isoDate: string, months: number): string {
  const base = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(base.getTime())) return isoDate
  const next = new Date(base)
  next.setMonth(next.getMonth() + months)
  return toIsoDate(next)
}

function PatientIntakeContent({ providerMode = false }: { providerMode?: boolean }) {
  const { theme } = useTheme()
  const { colors } = theme
  /** Cogni-style pages use dark gradients / shadows regardless of global light toggle. */
  const isDarkMode = true
  const darkIntakeSurface = surfacePrefersDarkColorScheme(colors.cardBackground)
  const { selectedService, serviceConfigs } = useEligibilityServiceConfig()
  const sectionSurfaceStyle = {
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    boxShadow: `0 0 0 1px color-mix(in srgb, ${colors.primary} 10%, transparent), 0 16px 40px -24px rgba(0, 0, 0, 0.35)`,
  } as const
  const navigate = useNavigate()
  const steps = [
    { id: 'patient', label: 'Patient Details' },
    { id: 'service', label: 'Service Details' },
  ]

  const [currentStep, setCurrentStep] = useState<number>(1)
  const [errors, setErrors] = useState<FormErrors>({})
  const [subscriberSameAsPatient, setSubscriberSameAsPatient] = useState<boolean>(false)
  const [smsOptIn, setSmsOptIn] = useState<boolean>(false)
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false)
  const [otpCode, setOtpCode] = useState<string>('')
  const [otpSent, setOtpSent] = useState<boolean>(false)
  const [otpVerified, setOtpVerified] = useState<boolean>(false)
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false)
  const [otpError, setOtpError] = useState<string>('')
  const [showToast, setShowToast] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [insuranceCardFile, setInsuranceCardFile] = useState<File | null>(null)
  const [isProcessingCard, setIsProcessingCard] = useState<boolean>(false)
  const [cardProcessed, setCardProcessed] = useState<boolean>(false)
  const [dragActive, setDragActive] = useState<boolean>(false)
  const [showInsuranceCardModal, setShowInsuranceCardModal] = useState<boolean>(false)
  const [pendingCardAzureResult, setPendingCardAzureResult] = useState<unknown>(null)
  const [cardPersonChoices, setCardPersonChoices] = useState<HealthCardPersonOption[]>([])
  const [selectedCardPersonId, setSelectedCardPersonId] = useState<string>('')
  const [isSubmittingEligibility, setIsSubmittingEligibility] = useState<boolean>(false)
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  const [doctorResults, setDoctorResults] = useState<unknown[]>([])
  const [isSearchingDoctors, setIsSearchingDoctors] = useState(false)
  const [doctorSearchError, setDoctorSearchError] = useState('')
  const [doctorSearchNoResults, setDoctorSearchNoResults] = useState(false)
  /** Highlights the table row chosen for NPI / provider payload (search-only flow). */
  const [selectedDoctorRowKey, setSelectedDoctorRowKey] = useState<string | null>(
    null
  )

  const [apiPayers, setApiPayers] = useState<PayerRow[]>([])
  const [payersLoading, setPayersLoading] = useState(true)
  const apiPayersRef = useRef<PayerRow[]>([])
  apiPayersRef.current = apiPayers

  const [formData, setFormData] = useState<FormData>(() => ({
      // Patient Details
      patientFirstName: '',
      patientLastName: '',
      patientDOB: '',
      patientGender: '',
      patientZip: '',
      patientPhone: '',
      patientEmail: '',

      // Subscriber Details
      subscriberFirstName: '',
      subscriberLastName: '',
      subscriberDOB: '',
      subscriberID: '',
      relationToSubscriber: '',
      subscriberZip: '',

      // Insurance Details
      payor: '',
      payerCode: '',
      groupNumber: '',
      policyNumber: '',

      // Service Details
      cptHcpcCode: '30',
      serviceTypeCodes: ['30'],
      npi: '',
      providerFirstName: '',
      providerLastName: '',
      doctorName: '',
      doctorSpecialty: '',
      providerPracticeAddress: '',
      providerPhone: '',
      providerFax: '',
      serviceDateFrom: '',
      serviceDateTo: '',
      diagnosisCode: '',
      placeOfService: '',
  }))

  useEffect(() => {
    let cancelled = false
    setPayersLoading(true)
    ;(async () => {
      try {
        const rows =
          selectedService === 'stedi'
            ? await fetchStediPayers(serviceConfigs.stedi)
            : await fetchPverifyPayers(serviceConfigs.pverify)
        if (!cancelled) setApiPayers(rows)
      } catch (e) {
        if (!cancelled) {
          setApiPayers([])
          const msg = e instanceof Error ? e.message : 'Failed to load payers.'
          const serviceLabel = selectedService === 'stedi' ? 'Stedi' : 'pVerify'
          setToastMessage(
            `Could not load payers from ${serviceLabel} (${msg}). Use the local list and enter the payer code manually, or try again later.`
          )
          setToastType('error')
          setShowToast(true)
        }
      } finally {
        if (!cancelled) setPayersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedService, serviceConfigs.pverify, serviceConfigs.stedi])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await getDefaultProvider()
        const payload = response && typeof response === 'object' ? (response as Record<string, unknown>) : {}
        const providerCandidate = payload.data ?? payload.provider ?? payload.default_provider ?? payload
        const provider =
          providerCandidate && typeof providerCandidate === 'object'
            ? (providerCandidate as Record<string, unknown>)
            : null
        if (!provider || cancelled) return
        const providerFirstName =
          typeof provider.first_name === 'string'
            ? provider.first_name.trim()
            : typeof provider.firstName === 'string'
              ? provider.firstName.trim()
              : ''
        const providerLastName =
          typeof provider.last_name === 'string'
            ? provider.last_name.trim()
            : typeof provider.lastName === 'string'
              ? provider.lastName.trim()
              : ''
        const npi =
          typeof provider.npi === 'string'
            ? provider.npi.trim()
            : typeof provider.npi_code === 'string'
              ? provider.npi_code.trim()
              : typeof provider.npiCode === 'string'
                ? provider.npiCode.trim()
                : ''
        if (!providerFirstName && !providerLastName && !npi) return

        setFormData((prev) => ({
          ...prev,
          providerFirstName: prev.providerFirstName || providerFirstName,
          providerLastName: prev.providerLastName || providerLastName,
          npi: prev.npi || npi,
          doctorName:
            prev.doctorName || [providerFirstName, providerLastName].filter(Boolean).join(' '),
        }))
      } catch {
        // Keep manual provider input/search flow when default provider API is unavailable.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (formData.serviceDateTo) return
    const todayIso = toIsoDate(new Date())
    const defaultTo = addMonthsIso(todayIso, 1)
    setFormData((prev) => {
      if (prev.serviceDateTo) return prev
      return {
        ...prev,
        serviceDateTo: defaultTo,
      }
    })
  }, [formData.serviceDateTo])

  const payerCodeLookup = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of apiPayers) {
      m.set(p.payerName, p.payerCode)
    }
    return m
  }, [apiPayers])

  const payorOptions = useMemo(() => {
    if (apiPayers.length > 0) {
      return apiPayers.map((p) => ({
        value: p.payerName,
        label: p.payerName,
        searchText: p.searchText || p.payerCode,
      }))
    }
    return initialPayors
      .filter((p) => p.status === 'active')
      .map((p) => ({ value: p.payorName, label: p.payorName }))
  }, [apiPayers])

  const cptHcpcOptions = useMemo(() => getServiceTypeCodeOptions(), [])

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ]

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {}

    if (step === 1) {
      // Patient Details validation
      if (!formData.patientFirstName.trim()) {
        newErrors.patientFirstName = 'First name is required'
      }
      if (!formData.patientLastName.trim()) {
        newErrors.patientLastName = 'Last name is required'
      }
      if (!formData.patientDOB) {
        newErrors.patientDOB = 'Date of birth is required'
      } else {
        const dob = new Date(formData.patientDOB)
        const today = new Date()
        if (dob > today) {
          newErrors.patientDOB = 'Date of birth cannot be in the future'
        }
      }
      if (!formData.patientGender) {
        newErrors.patientGender = 'Gender is required'
      }
      // Subscriber Details validation
      if (!formData.subscriberFirstName.trim()) {
        newErrors.subscriberFirstName = 'Subscriber first name is required'
      }
      if (!formData.subscriberLastName.trim()) {
        newErrors.subscriberLastName = 'Subscriber last name is required'
      }
      if (!formData.subscriberDOB) {
        newErrors.subscriberDOB = 'Subscriber date of birth is required'
      }
      if (!formData.subscriberID.trim()) {
        newErrors.subscriberID = 'Subscriber ID is required'
      }
      if (!formData.relationToSubscriber) {
        newErrors.relationToSubscriber = 'Relation to subscriber is required'
      }
      // Insurance Details (payer code is required for pVerify)
      if (!formData.payor) {
        newErrors.payor = 'Payor is required'
      } else if (!formData.payerCode.trim()) {
        newErrors.payor =
          selectedService === 'stedi'
            ? 'Could not resolve Stedi trading partner service ID for this payer. Pick a payer from the Stedi list.'
            : 'Could not resolve pVerify payer code for this payor. Pick a payor from the list or try again after payers load.'
      }
    }

    if (step === 2) {
      // Service Details validation
      if (formData.serviceTypeCodes.length === 0) {
        newErrors.cptHcpcCode = 'Service type code is required'
      }
      if (!formData.providerFirstName.trim()) {
        newErrors.providerFirstName = 'Provider first name is required'
      }
      if (!formData.providerLastName.trim()) {
        newErrors.providerLastName = 'Provider last name is required'
      }
      if (!formData.npi.trim()) {
        newErrors.npi = 'NPI is required'
      } else if (!/^\d{10}$/.test(formData.npi)) {
        newErrors.npi = 'NPI must be 10 digits'
      }
      if (!formData.serviceDateFrom) {
        newErrors.serviceDateFrom = 'Service date from is required'
      }
      if (!formData.serviceDateTo) {
        newErrors.serviceDateTo = 'Service date to is required'
      } else if (
        formData.serviceDateFrom &&
        formData.serviceDateTo &&
        new Date(formData.serviceDateTo) < new Date(formData.serviceDateFrom)
      ) {
        newErrors.serviceDateTo =
          'Service date to must be after service date from'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      return { ...prev, [name]: value }
    })
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleServiceTypeCodeToggle = (code: string) => {
    const selected = formData.serviceTypeCodes.includes(code)
      ? formData.serviceTypeCodes.filter((item) => item !== code)
      : [...formData.serviceTypeCodes, code]
    setFormData((prev) => ({
      ...prev,
      serviceTypeCodes: selected,
      cptHcpcCode: selected[0] ?? '',
    }))
    if (errors.cptHcpcCode) {
      setErrors((prev) => ({ ...prev, cptHcpcCode: '' }))
    }
  }

  const handleSelectDoctor = (doc: unknown, addressIndex: number = 0) => {
    const next = applyNppesProviderToFormFields(doc, addressIndex)
    const num = (doc as Record<string, unknown>)?.number
    const digits =
      num != null
        ? String(num).replace(/\D/g, '').slice(0, 10)
        : next.npi || ''
    const rowKey = digits ? `${digits}-${addressIndex}` : null
    if (rowKey) setSelectedDoctorRowKey(rowKey)
    setFormData((prev) => ({
      ...prev,
      npi: next.npi || prev.npi,
      doctorName: next.doctorName,
      doctorSpecialty: next.doctorSpecialty,
      providerFirstName: next.providerFirstName || prev.providerFirstName,
      providerLastName: next.providerLastName || prev.providerLastName,
      providerPracticeAddress: next.providerPracticeAddress,
      providerPhone: next.providerPhone,
      providerFax: next.providerFax,
    }))
    setErrors((prev) => ({
      ...prev,
      ...(next.npi ? { npi: '' } : {}),
      ...(next.providerFirstName.trim() ? { providerFirstName: '' } : {}),
      ...(next.providerLastName.trim() ? { providerLastName: '' } : {}),
    }))
  }

  const handleDoctorSearchClick = async () => {
    const fn = formData.providerFirstName.trim()
    const ln = formData.providerLastName.trim()
    setDoctorSearchNoResults(false)
    setDoctorSearchError('')

    if (!fn || !ln) {
      setErrors((prev) => ({
        ...prev,
        ...(!fn
          ? { providerFirstName: 'Provider first name is required' }
          : { providerFirstName: '' }),
        ...(!ln
          ? { providerLastName: 'Provider last name is required' }
          : { providerLastName: '' }),
      }))
      setDoctorResults([])
      return
    }

    const q = `${fn} ${ln}`.replace(/\s+/g, ' ')
    if (q.length < 3) {
      setDoctorSearchError(
        'Enter at least 3 characters between first and last name to search.'
      )
      setDoctorResults([])
      return
    }

    setErrors((prev) => ({
      ...prev,
      providerFirstName: '',
      providerLastName: '',
      npi: '',
    }))
    setSelectedDoctorRowKey(null)
    setFormData((prev) => ({
      ...prev,
      npi: '',
      doctorName: '',
      doctorSpecialty: '',
      providerPracticeAddress: '',
      providerPhone: '',
      providerFax: '',
    }))
    setIsSearchingDoctors(true)
    try {
      const results = await searchProviders(q)
      if (results.length === 0) {
        setDoctorResults([])
        setDoctorSearchNoResults(true)
      } else {
        setDoctorSearchNoResults(false)
        setDoctorResults(results)
        if (results.length === 1) {
          const rows = getNppesProviderTableRows(results[0])
          if (rows.length === 1) {
            handleSelectDoctor(results[0], 0)
          }
        }
      }
    } catch (err) {
      console.error('Doctor name search failed:', err)
      setDoctorResults([])
      setDoctorSearchNoResults(false)
    } finally {
      setIsSearchingDoctors(false)
    }
  }

  /** Payor: set payer name and auto-fill pVerify payer code from GetAllPayers. */
  const handlePayorChange = (name: string) => {
    const code = name ? payerCodeLookup.get(name) ?? '' : ''
    setFormData((prev) => ({ ...prev, payor: name, payerCode: code }))
    if (errors.payor) setErrors((prev) => ({ ...prev, payor: undefined }))
  }

  const handleSubscriberSameAsPatient = (checked: boolean) => {
    setSubscriberSameAsPatient(checked)
    if (checked) {
      // Copy patient details to subscriber details
      setFormData((prev) => ({
        ...prev,
        subscriberFirstName: prev.patientFirstName,
        subscriberLastName: prev.patientLastName,
        subscriberDOB: prev.patientDOB,
        subscriberZip: prev.patientZip,
        relationToSubscriber: 'self', // Set relation to Self when subscriber same as patient
      }))
    }
  }

  // Update subscriber details when patient details change and checkbox is checked
  const handlePatientInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    handleInputChange(e)
    if (subscriberSameAsPatient) {
      const { name, value } = e.target
      const subscriberFieldMap: { [key: string]: string } = {
        patientFirstName: 'subscriberFirstName',
        patientLastName: 'subscriberLastName',
        patientDOB: 'subscriberDOB',
        patientZip: 'subscriberZip',
      }
      if (subscriberFieldMap[name]) {
        setFormData((prev) => ({
          ...prev,
          [subscriberFieldMap[name]]: value,
        }))
      }
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (stepNumber: number) => {
    // Allow navigation to completed steps
    if (stepNumber <= currentStep) {
      setCurrentStep(stepNumber)
    }
  }

  const applyInsuranceCardExtraction = (extracted: IntakeFormPatchFromHealthCard) => {
    setFormData((prev) => {
      const apiRows = apiPayersRef.current
      const matchedFromApi =
        apiRows.length > 0
          ? matchPverifyPayerForInsurer(extracted.payor, apiRows)
          : undefined
      const matchedFromFallback =
        !matchedFromApi && apiRows.length === 0
          ? matchPverifyPayerForInsurer(
              extracted.payor,
              initialPayors
                .filter((p) => p.status === 'active')
                .map((p) => ({ payerName: p.payorName, payerCode: '' }))
            )
          : undefined
      const payerMatch = matchedFromApi ?? matchedFromFallback
      return {
        ...prev,
        ...extracted,
        payor: payerMatch?.payerName ?? extracted.payor,
        payerCode: payerMatch?.payerCode ?? extracted.payerCode,
      }
    })
    setSubscriberSameAsPatient(extracted.relationToSubscriber === 'self')
    setCardProcessed(true)
    setPendingCardAzureResult(null)
    setCardPersonChoices([])
    setSelectedCardPersonId('')
    setTimeout(() => {
      setShowInsuranceCardModal(false)
    }, 1500)
  }

  const handleApplySelectedCardPerson = () => {
    if (pendingCardAzureResult == null || !selectedCardPersonId) return
    const extracted = mapAzureHealthInsuranceResultToIntakeForm(
      pendingCardAzureResult,
      selectedCardPersonId
    )
    applyInsuranceCardExtraction(extracted)
  }

  const processInsuranceCard = async (fileUrl: string) => {
    setCardProcessed(false)

    try {
      console.log('Insurance card uploaded file URL:', fileUrl)

      const azureResult = await analyzeHealthInsuranceCardFromUrl(fileUrl)
      const choices = listHealthCardPersons(azureResult)

      if (choices.length > 1) {
        setPendingCardAzureResult(azureResult)
        setCardPersonChoices(choices)
        setSelectedCardPersonId(choices[0].id)
        return
      }

      const extracted = mapAzureHealthInsuranceResultToIntakeForm(azureResult)
      applyInsuranceCardExtraction(extracted)
    } catch (err) {
      console.error('Insurance card processing failed:', err)
      setCardProcessed(false)
    } finally {
      setIsProcessingCard(false)
    }
  }

  const runInsuranceCardUploadFlow = async (file: File) => {
    setInsuranceCardFile(file)
    setCardProcessed(false)
    setCardPersonChoices([])
    setPendingCardAzureResult(null)
    setSelectedCardPersonId('')
    setIsProcessingCard(true)
    try {
      const fileUrl = await uploadIntegrationFile(file)
      await processInsuranceCard(fileUrl)
    } catch (err) {
      console.error('Insurance card upload or processing failed:', err)
      setCardProcessed(false)
      setIsProcessingCard(false)
    }
  }

  const handleInsuranceCardUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      void runInsuranceCardUploadFlow(file)
    }
  }

  const handleDrag = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (validTypes.includes(file.type)) {
        void runInsuranceCardUploadFlow(file)
      }
    }
  }

  const handleRemoveInsuranceCard = () => {
    setInsuranceCardFile(null)
    setCardProcessed(false)
    setPendingCardAzureResult(null)
    setCardPersonChoices([])
    setSelectedCardPersonId('')
  }

  const handleSmsOptInChange = (checked: boolean) => {
    if (checked) {
      // Validate phone number before allowing SMS opt-in
      if (!formData.patientPhone || !formData.patientPhone.trim()) {
        setToastMessage('Please enter a phone number before opting in for SMS')
        setShowToast(true)
        return
      }
      // Validate phone number format (basic validation)
      const phoneRegex = /^[\d\s\-\(\)\+]+$/
      if (!phoneRegex.test(formData.patientPhone.replace(/\s/g, ''))) {
        setToastMessage('Please enter a valid phone number')
        setShowToast(true)
        return
      }
      // Open OTP modal
      setShowOtpModal(true)
      setOtpError('')
      setOtpCode('')
      setOtpSent(false)
      setOtpVerified(false)
    } else {
      // Unchecking SMS opt-in
      setSmsOptIn(false)
      setOtpVerified(false)
    }
  }

  const sendOtp = async () => {
    if (!formData.patientPhone || !formData.patientPhone.trim()) {
      setOtpError('Phone number is required')
      return
    }

    setIsSendingOtp(true)
    setOtpError('')

    // Simulate API call to send OTP
    // In a real application, this would call an actual API endpoint
    // Example: await fetch('/api/send-otp', { method: 'POST', body: JSON.stringify({ phone: formData.patientPhone }) })
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      // In a real app, the OTP would be sent via SMS service (Twilio, AWS SNS, etc.)
      // For demo purposes, we'll simulate success
      setOtpSent(true)
      setToastMessage(`OTP sent to ${formData.patientPhone}`)
      setShowToast(true)
    } catch (error) {
      setOtpError('Failed to send OTP. Please try again.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP code')
      return
    }

    setIsVerifyingOtp(true)
    setOtpError('')

    // Simulate API call to verify OTP
    // In a real application, this would call an actual API endpoint
    // Example: await fetch('/api/verify-otp', { method: 'POST', body: JSON.stringify({ phone: formData.patientPhone, otp: otpCode }) })
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      // In a real app, verify the OTP with the backend
      // For demo purposes, accept any 6-digit code
      if (otpCode.length === 6 && /^\d+$/.test(otpCode)) {
        setOtpVerified(true)
        setSmsOptIn(true)
        setToastMessage('Phone number verified successfully! SMS opt-in enabled.')
        setShowToast(true)
        setTimeout(() => {
          setShowOtpModal(false)
        }, 1000)
      } else {
        setOtpError('Invalid OTP code. Please try again.')
      }
    } catch (error) {
      setOtpError('Failed to verify OTP. Please try again.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleOtpModalClose = () => {
    if (!otpVerified) {
      setSmsOptIn(false)
    }
    setShowOtpModal(false)
    setOtpCode('')
    setOtpError('')
    setOtpSent(false)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateStep(2)) return

    setIsSubmittingEligibility(true)
    setToastType('success')
    try {
      const parsed = await submitEligibilityCheck({
        service: selectedService,
        serviceConfigs,
        formData: {
          ...(formData as IntakeEligibilityForm),
          serviceTypeCodes: formData.serviceTypeCodes,
          cptHcpcCode: formData.serviceTypeCodes[0] ?? '',
        },
        options: { isSubscriberPatient: subscriberSameAsPatient },
        intakeContext: {
          cptHcpcCode: formData.serviceTypeCodes.join(', '),
          serviceDateFrom: formData.serviceDateFrom,
          serviceDateTo: formData.serviceDateTo,
          patientName: `${formData.patientFirstName} ${formData.patientLastName}`.trim(),
          patientDOB: formData.patientDOB,
        },
      })
      const routeState = mapPverifyToEligibilityView(parsed, {
        cptHcpcCode: formData.serviceTypeCodes.join(', '),
        serviceDateFrom: formData.serviceDateFrom,
        serviceDateTo: formData.serviceDateTo,
        patientName:
          `${formData.patientFirstName} ${formData.patientLastName}`.trim(),
        patientDOB: formData.patientDOB,
      })
      navigate(providerMode ? ROUTES.PROVIDER_ELIGIBILITY_RESULT : ROUTES.PATIENT_HOME, {
        replace: true,
        state: {
          ...routeState,
          apiMeta: { ...routeState.apiMeta, source: selectedService },
          patientFlow: 'eligibility' as const,
        },
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Eligibility request failed.'
      setToastMessage(msg)
      setToastType('error')
      setShowToast(true)
    } finally {
      setIsSubmittingEligibility(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <section
              className="rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-lg sm:p-6"
              style={sectionSurfaceStyle}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <h2
                  className="text-lg font-semibold sm:text-xl"
                  style={{ color: colors.textPrimary }}
                >
                  Patient Details
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                  setPendingCardAzureResult(null)
                  setCardPersonChoices([])
                  setSelectedCardPersonId('')
                  setShowInsuranceCardModal(true)
                }}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 transition-all duration-200 sm:w-auto"
                >
                  <Upload size={18} aria-hidden />
                  Upload Insurance Card
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                <Input
                  label="First Name"
                  name="patientFirstName"
                  value={formData.patientFirstName}
                  onChange={handlePatientInputChange}
                  error={errors.patientFirstName}
                  placeholder="First name"
                  required
                />
                <Input
                  label="Last Name"
                  name="patientLastName"
                  value={formData.patientLastName}
                  onChange={handlePatientInputChange}
                  error={errors.patientLastName}
                  placeholder="Last name"
                  required
                />
                <DateInput
                  label="Date of Birth"
                  name="patientDOB"
                  value={formData.patientDOB}
                  onChange={handlePatientInputChange}
                  error={errors.patientDOB}
                  required
                />
                <Select
                  label="Gender"
                  name="patientGender"
                  value={formData.patientGender}
                  onChange={handlePatientInputChange}
                  options={genderOptions}
                  placeholder="Select gender"
                  error={errors.patientGender}
                  required
                />
                <Input
                  label="Zip Code"
                  name="patientZip"
                  value={formData.patientZip}
                  onChange={handlePatientInputChange}
                  error={errors.patientZip}
                  placeholder="ZIP code"
                />
                <Input
                  label="Email"
                  name="patientEmail"
                  type="email"
                  value={formData.patientEmail}
                  onChange={handleInputChange}
                  error={errors.patientEmail}
                  placeholder="name@example.com"
                />
                <Input
                  label="Phone"
                  name="patientPhone"
                  type="tel"
                  value={formData.patientPhone}
                  onChange={handleInputChange}
                  error={errors.patientPhone}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2 border-t pt-5" style={{ borderColor: colors.border }}>
                <div className="flex items-center gap-1.5">
                  <label className="flex min-w-0 cursor-pointer items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={smsOptIn}
                      onChange={(e) => handleSmsOptInChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 transition-colors focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Opt-in for SMS
                    </span>
                  </label>
                  <span className="relative inline-flex shrink-0">
                    <button
                      type="button"
                      className="peer rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                      style={{ color: colors.textSecondary }}
                      aria-label="Please opt-in for SMS if you would like to receive SMS updates"
                    >
                      <HelpCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </button>
                    <span
                      className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-max max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border px-3 py-2 text-left text-xs opacity-0 shadow-md transition-opacity duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100"
                      style={{
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.cardBorder,
                        color: colors.textPrimary,
                      }}
                      aria-hidden="true"
                    >
                      Please opt-in for SMS if you would like to receive SMS updates
                    </span>
                  </span>
                </div>
                {otpVerified && (
                  <p className="ml-6 flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-500">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Phone number verified via OTP
                  </p>
                )}
              </div>
            </section>

            <section
              className="rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-lg sm:p-6"
              style={sectionSurfaceStyle}
            >
              <div className="mb-5">
                <label className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={subscriberSameAsPatient}
                    onChange={(e) =>
                      handleSubscriberSameAsPatient(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 transition-colors focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subscriber Details same as Patient Details
                  </span>
                </label>
              </div>
              <h3
                className="mb-5 text-base font-semibold sm:text-lg"
                style={{ color: colors.textPrimary }}
              >
                Subscriber Details
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                <Input
                  label="Subscriber First Name"
                  name="subscriberFirstName"
                  value={formData.subscriberFirstName}
                  onChange={handleInputChange}
                  error={errors.subscriberFirstName}
                  placeholder="First name"
                  required
                  disabled={subscriberSameAsPatient}
                />
                <Input
                  label="Subscriber Last Name"
                  name="subscriberLastName"
                  value={formData.subscriberLastName}
                  onChange={handleInputChange}
                  error={errors.subscriberLastName}
                  placeholder="Last name"
                  required
                  disabled={subscriberSameAsPatient}
                />
                <DateInput
                  label="Subscriber Date of Birth"
                  name="subscriberDOB"
                  value={formData.subscriberDOB}
                  onChange={handleInputChange}
                  error={errors.subscriberDOB}
                  required
                  disabled={subscriberSameAsPatient}
                />
                <Input
                  label="Subscriber ID"
                  name="subscriberID"
                  value={formData.subscriberID}
                  onChange={handleInputChange}
                  error={errors.subscriberID}
                  placeholder="Member ID"
                  required
                />
                <Select
                  label="Relation to Subscriber"
                  name="relationToSubscriber"
                  value={formData.relationToSubscriber}
                  onChange={handleInputChange}
                  options={relationOptions}
                  placeholder="Select relation"
                  error={errors.relationToSubscriber}
                  required
                />
                <Input
                  label="Subscriber Zip Code"
                  name="subscriberZip"
                  value={formData.subscriberZip}
                  onChange={handleInputChange}
                  error={errors.subscriberZip}
                  placeholder="ZIP code"
                  disabled={subscriberSameAsPatient}
                />
              </div>
            </section>

            <section
              className="rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-lg sm:p-6"
              style={sectionSurfaceStyle}
            >
              <h3
                className="mb-5 text-base font-semibold sm:text-lg"
                style={{ color: colors.textPrimary }}
              >
                Insurance Details
              </h3>
              <p className="mb-4 text-xs" style={{ color: colors.textSecondary }}>
                Active eligibility service: {selectedService === 'stedi' ? 'Stedi' : 'pVerify'}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                <div className="md:col-span-2 lg:col-span-2">
                  <SearchableSelect
                    label="Payor"
                    name="payor"
                    value={formData.payor}
                    onValueChange={handlePayorChange}
                    options={payorOptions}
                    placeholder={
                      payersLoading
                        ? `Loading payers from ${selectedService === 'stedi' ? 'Stedi' : 'pVerify'}…`
                        : 'Select or search payor'
                    }
                    searchPlaceholder="Search by payer name or code…"
                    emptyMessage="No payers match your search"
                    error={errors.payor}
                    required
                    disabled={payersLoading}
                  />
                </div>
                <Input
                  label="Group Number"
                  name="groupNumber"
                  value={formData.groupNumber}
                  onChange={handleInputChange}
                  error={errors.groupNumber}
                  placeholder="Group number"
                />
                {/* <Input
                  label="Policy Number"
                  name="policyNumber"
                  value={formData.policyNumber}
                  onChange={handleInputChange}
                  error={errors.policyNumber}
                /> */}
              </div>
            </section>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <section
              className="rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-lg sm:p-6"
              style={sectionSurfaceStyle}
            >
              <h2
                className="mb-5 text-lg font-semibold sm:text-xl"
                style={{ color: colors.textPrimary }}
              >
                Service Details
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                <div className="md:col-span-2 lg:col-span-3">
                  <label
                    className="mb-2 block text-sm font-medium"
                    style={{ color: colors.textPrimary }}
                  >
                    Service type code
                  </label>
                  <div
                    className="rounded-xl border p-3 sm:p-4"
                    style={{
                      borderColor: errors.cptHcpcCode ? '#ef4444' : colors.border,
                      backgroundColor: colors.cardBackground,
                    }}
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.serviceTypeCodes.length === 0 ? (
                        <span
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{ borderColor: colors.border, color: colors.textSecondary }}
                        >
                          No service type code selected
                        </span>
                      ) : (
                        formData.serviceTypeCodes.map((code) => {
                          const label =
                            cptHcpcOptions.find((option) => option.value === code)?.label ?? code
                          return (
                            <span
                              key={code}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${colors.primary} 16%, transparent)`,
                                color: colors.textPrimary,
                              }}
                            >
                              {label}
                            </span>
                          )
                        })
                      )}
                    </div>
                    <div
                      className="max-h-56 overflow-y-auto rounded-lg border p-2"
                      style={{ borderColor: colors.border }}
                    >
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {cptHcpcOptions.map((option) => {
                          const checked = formData.serviceTypeCodes.includes(option.value)
                          return (
                            <label
                              key={option.value}
                              className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                                checked ? 'ring-1' : ''
                              }`}
                              style={{
                                color: colors.textPrimary,
                                backgroundColor: checked
                                  ? `color-mix(in srgb, ${colors.primary} 12%, transparent)`
                                  : 'transparent',
                                boxShadow: checked
                                  ? `inset 0 0 0 1px color-mix(in srgb, ${colors.primary} 35%, transparent)`
                                  : 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleServiceTypeCodeToggle(option.value)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                                style={{ accentColor: colors.primary }}
                              />
                              <span className="leading-snug">{option.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                    Multi-select enabled. Default includes 30 (Health Benefit Plan Coverage).
                  </p>
                  {errors.cptHcpcCode ? (
                    <p className="mt-1 text-xs text-red-500">{errors.cptHcpcCode}</p>
                  ) : null}
                </div>
                <DateInput
                  label="Service Date From"
                  name="serviceDateFrom"
                  value={formData.serviceDateFrom}
                  onChange={handleInputChange}
                  error={errors.serviceDateFrom}
                  required
                />
                <DateInput
                  label="Service Date To"
                  name="serviceDateTo"
                  value={formData.serviceDateTo}
                  onChange={handleInputChange}
                  error={errors.serviceDateTo}
                  required
                />
              </div>
            </section>

            <section
              className="rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-lg sm:p-6"
              style={sectionSurfaceStyle}
            >
              <h2
                className="mb-5 text-lg font-semibold sm:text-xl"
                style={{ color: colors.textPrimary }}
              >
                Doctor Details
              </h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
                <div className="min-w-0 flex-1 sm:min-w-[180px]">
                  <Input
                    label="Provider First Name"
                    name="providerFirstName"
                    value={formData.providerFirstName}
                    onChange={(e) => {
                      handleInputChange(e)
                      if (doctorSearchError) setDoctorSearchError('')
                      setDoctorSearchNoResults(false)
                    }}
                    placeholder="First name"
                    error={errors.providerFirstName}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="min-w-0 flex-1 sm:min-w-[180px]">
                  <Input
                    label="Provider Last Name"
                    name="providerLastName"
                    value={formData.providerLastName}
                    onChange={(e) => {
                      handleInputChange(e)
                      if (doctorSearchError) setDoctorSearchError('')
                      setDoctorSearchNoResults(false)
                    }}
                    placeholder="Last name"
                    error={errors.providerLastName}
                    required
                    autoComplete="off"
                  />
                </div>
                {/* Top padding matches Input label row (text-sm + mb-2) so the button lines up with the fields when validation errors add height below inputs. */}
                <div className="w-full shrink-0 sm:w-auto sm:pt-7">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="flex w-full items-center justify-center gap-2 sm:w-auto"
                    onClick={() => void handleDoctorSearchClick()}
                    disabled={isSearchingDoctors}
                  >
                    {isSearchingDoctors ? (
                      <Loader2 size={18} className="animate-spin" aria-hidden />
                    ) : (
                      <Search size={18} aria-hidden />
                    )}
                    Search
                  </Button>
                </div>
              </div>
              {doctorSearchError ? (
                <p className="mt-3 text-sm text-red-600">{doctorSearchError}</p>
              ) : null}
              {isSearchingDoctors && (
                <p
                  className="mt-3 flex items-center gap-2 text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  <Loader2 size={16} className="shrink-0 animate-spin" aria-hidden />
                  Searching registry…
                </p>
              )}
              {doctorSearchNoResults && !isSearchingDoctors ? (
                <p
                  className="mt-3 text-sm"
                  style={{ color: colors.textSecondary }}
                  role="status"
                >
                  No providers found for this search.
                </p>
              ) : null}
              {doctorResults.length > 0 && !isSearchingDoctors && (
                <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: colors.border }}>
                  <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                    <thead>
                      <tr
                        className="border-b"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          borderColor: colors.border,
                        }}
                      >
                        <th
                          className="w-10 px-2 py-2.5 text-center font-semibold"
                          style={{ color: colors.textPrimary }}
                          scope="col"
                        >
                          <span className="sr-only">Select</span>
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold" style={{ color: colors.textPrimary }}>
                          NPI
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold" style={{ color: colors.textPrimary }}>
                          Name
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold" style={{ color: colors.textPrimary }}>
                          Address use
                        </th>
                        <th className="min-w-[200px] px-3 py-2.5 font-semibold" style={{ color: colors.textPrimary }}>
                          Primary Practice Address
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold" style={{ color: colors.textPrimary }}>
                          Phone
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold" style={{ color: colors.textPrimary }}>
                          Fax
                        </th>
                        <th className="min-w-[140px] px-3 py-2.5 font-semibold" style={{ color: colors.textPrimary }}>
                          Primary Taxonomy
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorResults.flatMap((doc) =>
                        getNppesProviderTableRows(doc).map((row) => {
                          const isSelected = row.rowKey === selectedDoctorRowKey
                          return (
                            <tr
                              key={row.rowKey}
                              role="button"
                              tabIndex={0}
                              className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                              style={{
                                borderColor: colors.border,
                                ...(isSelected
                                  ? {
                                      backgroundColor: `color-mix(in srgb, ${colors.primary} 14%, transparent)`,
                                      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${colors.primary} 40%, transparent)`,
                                    }
                                  : {}),
                              }}
                              onClick={() =>
                                handleSelectDoctor(doc, row.addressIndex)
                              }
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter' || ev.key === ' ') {
                                  ev.preventDefault()
                                  handleSelectDoctor(doc, row.addressIndex)
                                }
                              }}
                            >
                              <td
                                className="px-2 py-2.5 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="radio"
                                  name="intake-doctor-address"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleSelectDoctor(doc, row.addressIndex)
                                  }
                                  className="h-4 w-4 cursor-pointer border-gray-400"
                                  style={{ accentColor: colors.primary }}
                                  aria-label={`Select ${row.addressPurpose || 'practice'} address for NPI ${row.npi}`}
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className="font-medium underline decoration-primary-600/80"
                                  style={{ color: colors.primary }}
                                >
                                  {row.npi || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-medium" style={{ color: colors.textPrimary }}>
                                {row.name || '—'}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                                {row.addressPurpose || '—'}
                              </td>
                              <td className="max-w-xs px-3 py-2.5 text-xs leading-snug" style={{ color: colors.textSecondary }}>
                                {row.address || '—'}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5" style={{ color: colors.textSecondary }}>
                                {row.phone || '—'}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5" style={{ color: colors.textSecondary }}>
                                {row.fax || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-xs" style={{ color: colors.textSecondary }}>
                                {row.taxonomy || '—'}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {errors.npi ? (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {errors.npi}
                </p>
              ) : null}
            </section>
          </div>
        )

      default:
        return null
    }
  }

  const cardSurfaceStyle = {
    backgroundColor: colors.cardBackground,
    border: `1px solid ${colors.cardBorder}`,
    boxShadow: isDarkMode
      ? `0 0 0 1px color-mix(in srgb, ${colors.primary} 14%, transparent), 0 24px 48px -16px rgba(0, 0, 0, 0.5), 0 0 72px -28px color-mix(in srgb, ${colors.primary} 22%, transparent)`
      : '0 20px 50px -12px rgba(15, 23, 42, 0.08)',
  } as const

  /** Full-page ambient layers—hero-style violet haze (CogniCHAMP-like). */
  const layoutBackdropStyle = {
    backgroundColor: colors.background,
    backgroundImage: isDarkMode
      ? `
        radial-gradient(ellipse 120% 80% at 50% -8%, color-mix(in srgb, ${colors.primary} 42%, transparent) 0%, transparent 50%),
        radial-gradient(ellipse 70% 55% at 0% 32%, color-mix(in srgb, ${colors.primary} 26%, transparent) 0%, transparent 58%),
        radial-gradient(ellipse 65% 52% at 100% 52%, color-mix(in srgb, ${colors.primary} 22%, transparent) 0%, transparent 58%),
        radial-gradient(ellipse 90% 60% at 50% 102%, color-mix(in srgb, ${colors.primary} 16%, transparent) 0%, transparent 55%),
        linear-gradient(180deg,
          color-mix(in srgb, ${colors.primary} 12%, ${colors.background}) 0%,
          ${colors.background} 40%,
          color-mix(in srgb, ${colors.primary} 10%, ${colors.background}) 100%)`
      : `
        radial-gradient(ellipse 115% 72% at 50% -4%, color-mix(in srgb, ${colors.primary} 20%, transparent) 0%, transparent 54%),
        radial-gradient(ellipse 68% 52% at 0% 38%, color-mix(in srgb, ${colors.primary} 12%, transparent) 0%, transparent 58%),
        radial-gradient(ellipse 62% 50% at 100% 58%, color-mix(in srgb, ${colors.primary} 10%, transparent) 0%, transparent 56%),
        radial-gradient(ellipse 85% 58% at 50% 102%, color-mix(in srgb, ${colors.primary} 8%, transparent) 0%, transparent 54%),
        linear-gradient(180deg,
          color-mix(in srgb, ${colors.primary} 6%, ${colors.cardBackground}) 0%,
          ${colors.background} 45%,
          color-mix(in srgb, ${colors.primary} 5%, ${colors.background}) 100%)`,
  } as const

  return (
    <div className="relative min-h-screen">
      {!providerMode && (
        <>
          <div
            className="pointer-events-none absolute inset-0 min-h-full"
            style={layoutBackdropStyle}
            aria-hidden
          />
          <header
            className="relative z-[1] w-full border-b"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.navHeaderBackground,
            }}
          >
            <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-3.5">
              {theme.logo ? (
                <img
                  src={theme.logo}
                  alt="Health Lynk"
                  className="h-6 w-auto max-w-[min(100%,200px)] shrink-0 object-contain object-left sm:h-7"
                />
              ) : (
                <p
                  className="shrink-0 text-base font-bold leading-none tracking-tight sm:text-lg"
                  style={{ color: colors.primary }}
                >
                  Health Lynk
                </p>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${colors.primary} 18%, transparent)`,
                    color: colors.primary,
                    boxShadow: `0 0 0 1px color-mix(in srgb, ${colors.primary} 35%, transparent)`,
                  }}
                >
                  <ClipboardList className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h1
                    className="text-lg font-semibold leading-tight tracking-tight sm:text-xl"
                    style={{ color: colors.textPrimary }}
                  >
                    Patient intake
                  </h1>
                  <p
                    className="mt-0.5 max-w-2xl text-xs leading-snug sm:text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    Complete your information to verify coverage and continue your care.
                  </p>
                </div>
              </div>
            </div>
          </header>
        </>
      )}

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {providerMode && (
          <div className="mb-4 sm:mb-6">
            <h1
              className="text-xl sm:text-2xl font-bold text-left"
              style={{ color: colors.textPrimary }}
            >
              Patient Intake
            </h1>
            <p
              className="mt-1 text-left"
              style={{ color: colors.textSecondary }}
            >
              Complete patient and service details to run eligibility verification.
            </p>
          </div>
        )}

        {/* Stepper */}
        <div
          className="mb-4 overflow-x-auto rounded-xl p-4 transition-all duration-200 sm:mb-6 sm:p-6"
          style={cardSurfaceStyle}
        >
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: colors.border }}>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="w-full transition-all duration-200 sm:w-auto"
            >
              Previous
            </Button>

            {currentStep < steps.length ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleNext}
                className="w-full transition-all duration-200 sm:w-auto"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingEligibility}
                className="inline-flex w-full items-center justify-center gap-2 transition-all duration-200 sm:w-auto"
              >
                {isSubmittingEligibility ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Checking eligibility…
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            )}
          </div>
        </form>

        {/* Validation Summary */}
        {Object.keys(errors).length > 0 && (
          <div
            className="mt-6 rounded-xl border p-4 shadow-sm transition-all duration-200"
            style={{
              borderColor: 'rgba(248, 113, 113, 0.4)',
              backgroundColor: 'rgba(127, 29, 29, 0.2)',
              boxShadow: `0 0 0 1px color-mix(in srgb, ${colors.primary} 6%, transparent)`,
            }}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-red-400"
                aria-hidden
              />
              <div className="min-w-0">
                <h3 className="mb-1.5 text-sm font-semibold text-red-200">
                  Please fix the following errors:
                </h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-red-100/90">
                  {Object.values(errors)
                    .filter((error) => error)
                    .map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Toast */}
      <Toast
        message={
          toastMessage ||
          (toastType === 'success'
            ? 'Patient intake form submitted successfully!'
            : 'Something went wrong.')
        }
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={toastType === 'error' ? 5000 : 3000}
      />

      {/* OTP Verification Modal */}
      <Modal
        isOpen={showOtpModal}
        onClose={handleOtpModalClose}
        title="Verify Phone Number for SMS Opt-in"
        size="md"
        showCloseButton={!isVerifyingOtp}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            We'll send a verification code to <span className="font-medium">{formData.patientPhone}</span> to confirm your phone number for SMS notifications.
          </p>

          {!otpSent ? (
            <div className="space-y-4">
              <Button
                type="button"
                variant="primary"
                onClick={sendOtp}
                disabled={isSendingOtp}
                className="w-full"
              >
                {isSendingOtp ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  'Send OTP Code'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  name="otpCode"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtpCode(value)
                    setOtpError('')
                  }}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-center text-2xl tracking-widest ${
                    otpError
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code sent to {formData.patientPhone}
                </p>
                {otpError && (
                  <p className="mt-1 text-sm text-red-600">{otpError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOtpSent(false)
                    setOtpCode('')
                    setOtpError('')
                  }}
                  disabled={isVerifyingOtp}
                  className="flex-1"
                >
                  Resend OTP
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={verifyOtp}
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifyingOtp ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify OTP'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Insurance Card Upload Modal */}
      <Modal
        isOpen={showInsuranceCardModal}
        onClose={() => {
          if (!isProcessingCard) {
            setShowInsuranceCardModal(false)
            setPendingCardAzureResult(null)
            setCardPersonChoices([])
            setSelectedCardPersonId('')
          }
        }}
        title="Upload Insurance Card"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Upload a photo of your insurance card and we'll automatically extract the information to populate the Patient Details fields.
          </p>

          {!insuranceCardFile ? (
            <label
              className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 sm:min-h-[240px] sm:p-10 ${
                isProcessingCard
                  ? 'pointer-events-none cursor-not-allowed opacity-60'
                  : ''
              } ${dragActive ? 'scale-[1.01]' : ''}`}
              style={{
                borderColor: dragActive ? colors.primary : colors.border,
                backgroundColor: dragActive
                  ? `color-mix(in srgb, ${colors.primary} 16%, ${colors.cardBackground})`
                  : `color-mix(in srgb, ${colors.primary} 8%, ${colors.cardBackground})`,
                boxShadow: dragActive ? `0 0 0 2px ${colors.primaryLight}` : undefined,
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                onChange={handleInsuranceCardUpload}
                className="sr-only"
                disabled={isProcessingCard}
                aria-label="Choose insurance card file to upload"
              />
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-200"
                style={{
                  backgroundColor: dragActive
                    ? `color-mix(in srgb, ${colors.primary} 22%, ${colors.buttonSecondary})`
                    : colors.buttonSecondary,
                  color: colors.primary,
                  boxShadow: `inset 0 0 0 1px ${colors.border}`,
                }}
              >
                <FileImage size={28} aria-hidden />
              </div>
              <p className="mb-2 text-sm" style={{ color: colors.textPrimary }}>
                <span className="font-semibold" style={{ color: colors.primary }}>
                  Click to upload
                </span>{' '}
                <span style={{ color: colors.textSecondary }}>or drag and drop</span>
              </p>
              <p className="mb-6 text-xs" style={{ color: colors.textSecondary }}>
                JPG, PNG, PDF (max. 10MB)
              </p>
              <span
                className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 active:scale-[0.99]"
                style={{
                  backgroundColor: isProcessingCard
                    ? colors.primary
                    : colors.buttonPrimary,
                  color: '#fafafa',
                }}
                onMouseEnter={(e) => {
                  if (!isProcessingCard)
                    e.currentTarget.style.backgroundColor = colors.buttonPrimaryHover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isProcessingCard
                    ? colors.primary
                    : colors.buttonPrimary
                }}
              >
                {isProcessingCard ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                    Processing...
                  </>
                ) : (
                  'Select insurance card'
                )}
              </span>
            </label>
          ) : (
            <div
              className="rounded-xl border p-4 shadow-sm transition-all duration-200"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.cardBackground,
                boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex-shrink-0">
                    {isProcessingCard ? (
                      <Loader2
                        size={24}
                        className="animate-spin"
                        style={{ color: colors.primary }}
                        aria-hidden
                      />
                    ) : cardProcessed ? (
                      <CheckCircle2
                        size={24}
                        className="text-green-500"
                        aria-hidden
                      />
                    ) : (
                      <FileImage
                        size={24}
                        aria-hidden
                        style={{ color: colors.textSecondary }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: colors.textPrimary }}
                    >
                      {insuranceCardFile.name}
                    </p>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      {isProcessingCard
                        ? 'Processing with AI...'
                        : cardProcessed
                          ? 'Card processed successfully. Patient Details fields have been populated.'
                          : cardPersonChoices.length > 1 && pendingCardAzureResult
                            ? 'Multiple people found — select the patient below, then apply.'
                            : 'Ready to process'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveInsuranceCard}
                  disabled={isProcessingCard}
                  className="shrink-0 rounded-lg p-1.5 transition-colors duration-200 disabled:opacity-50"
                  style={{ color: colors.textSecondary }}
                  onMouseEnter={(e) => {
                    if (!isProcessingCard) {
                      e.currentTarget.style.color = '#f87171'
                      e.currentTarget.style.backgroundColor =
                        'rgba(248, 113, 113, 0.12)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colors.textSecondary
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  title="Remove card"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
            </div>
          )}

          {insuranceCardFile &&
            !isProcessingCard &&
            cardPersonChoices.length > 1 &&
            pendingCardAzureResult != null &&
            !cardProcessed && (
              <div
                className="rounded-xl border p-4 shadow-sm"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.cardBackground,
                }}
                role="region"
                aria-label="Select patient from card"
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: colors.textPrimary }}
                >
                  Who is the patient?
                </p>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: colors.textSecondary }}
                >
                  This card lists more than one person. Choose the correct name to fill
                  patient first and last name (and subscriber fields when the subscriber
                  is listed separately).
                </p>
                <div className="mt-3 space-y-2">
                  {cardPersonChoices.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500"
                      style={{ borderColor: colors.border }}
                    >
                      <input
                        type="radio"
                        name="health-card-person"
                        value={p.id}
                        checked={selectedCardPersonId === p.id}
                        onChange={() => setSelectedCardPersonId(p.id)}
                        className="h-4 w-4 shrink-0 border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: colors.textPrimary }}
                      >
                        {p.label}
                      </span>
                    </label>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="primary"
                  className="mt-4 w-full sm:w-auto"
                  onClick={handleApplySelectedCardPerson}
                  disabled={!selectedCardPersonId}
                >
                  Apply
                </Button>
              </div>
            )}

          {cardProcessed && (
            <div
              className="rounded-lg border p-4"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                borderColor: 'rgba(34, 197, 94, 0.35)',
              }}
            >
              <div className="flex items-start">
                <CheckCircle2
                  size={20}
                  className="mr-2 mt-0.5 flex-shrink-0 text-green-500"
                />
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: darkIntakeSurface ? '#bbf7d0' : '#166534',
                    }}
                  >
                    Insurance card processed successfully!
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{
                      color: darkIntakeSurface ? 'rgba(220, 252, 231, 0.92)' : '#15803d',
                    }}
                  >
                    Patient Details fields have been automatically populated. You can review and edit them as needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div
            className="flex items-center justify-end gap-3 border-t pt-4"
            style={{ borderColor: colors.border }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!isProcessingCard) {
                  setShowInsuranceCardModal(false)
                }
              }}
              disabled={isProcessingCard}
            >
              {cardProcessed ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function PatientIntake({ providerMode = false }: { providerMode?: boolean }) {
  if (providerMode) {
    return <PatientIntakeContent providerMode />
  }

  return (
    <PatientFlowCogniThemeScope className="relative overflow-x-hidden">
      <PatientIntakeContent />
    </PatientFlowCogniThemeScope>
  )
}

