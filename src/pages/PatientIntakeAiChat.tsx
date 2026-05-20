import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Upload, Loader2, Send, CheckCircle2, PencilLine, Bot, UserRound } from 'lucide-react'
import Button from '../components/forms/Button'
import Toast from '../components/Toast'
import { ROUTES } from '../routes/routeMap'
import { submitEligibilityCheck } from '../services/eligibilityService'
import { mapPverifyToEligibilityView } from '../services/mapPverifyToEligibilityView'
import { useEligibilityServiceConfig } from '../contexts/EligibilityServiceContext'
import { fetchPverifyPayers } from '../services/pverifyService'
import { fetchStediPayers } from '../services/stediService'
import { uploadIntegrationFile } from '../services/cloudinaryUpload'
import { analyzeHealthInsuranceCardFromUrl } from '../services/azureHealthInsuranceCardAnalyze'
import {
  listHealthCardPersons,
  matchPverifyPayerForInsurer,
  mapAzureHealthInsuranceResultToIntakeForm,
  type HealthCardPersonOption,
} from '../services/mapAzureHealthCardToIntakeForm'
import { getNppesProviderTableRows, searchProviders } from '../services/npiRegistry'
import type { IntakeEligibilityForm } from '../services/pverifyEligibilityPayload'
import { getDefaultProvider } from '../services/providerNpiService'
import { serviceTypeCodes as allServiceTypeCodes } from '../data/serviceTypeCodes'
import { useTheme } from '../contexts/ThemeContext'
import {
  darkIntakeChatUi,
  intakeChatGradientClass,
  providerIntakeChatUi,
} from '../theme/intakeChatUi'

type PromptKey =
  | 'intakeMode'
  | 'patientFirstName'
  | 'patientLastName'
  | 'patientDOB'
  | 'patientGender'
  | 'subscriberID'
  | 'payor'
  | 'serviceDateFrom'
  | 'serviceDateTo'
  | 'providerFirstName'
  | 'providerLastName'
  | 'npiSelection'

type PayerRow = { payerName: string; payerCode: string; searchText?: string }
type ChatMessage = { role: 'bot' | 'user'; text: string }

const promptOrderManual: PromptKey[] = [
  'intakeMode',
  'patientFirstName',
  'patientLastName',
  'patientDOB',
  'patientGender',
  'subscriberID',
  'payor',
  'serviceDateFrom',
  'serviceDateTo',
]

function normalizeText(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase()
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

const DATE_YEAR_MIN = 1900
const DATE_YEAR_MAX = 2100

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** Native date input value: YYYY-MM-DD only; year must be exactly 4 digits (1000–9999) and in allowed range. */
function parseNativeDateInputValue(raw: string): string | null {
  const s = raw.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!iso) return null
  const y = Number(iso[1])
  const mo = Number(iso[2])
  const d = Number(iso[3])
  if (y < DATE_YEAR_MIN || y > DATE_YEAR_MAX) return null
  if (!isValidCalendarDate(y, mo, d)) return null
  return `${y}-${pad2(mo)}-${pad2(d)}`
}

function isInvalidInsuranceCardExtraction(
  extracted: Partial<Pick<IntakeEligibilityForm, 'patientFirstName' | 'patientLastName' | 'subscriberID'>>
): boolean {
  const firstName = extracted.patientFirstName?.trim() ?? ''
  const lastName = extracted.patientLastName?.trim() ?? ''
  const subscriberId = extracted.subscriberID?.trim() ?? ''
  return firstName === '' && lastName === '' && subscriberId === ''
}

export default function PatientIntakeAiChat({ providerMode = false }: { providerMode?: boolean }) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const ui = providerMode ? providerIntakeChatUi(theme.colors) : darkIntakeChatUi()
  const resultRoute = providerMode ? ROUTES.PROVIDER_ELIGIBILITY_RESULT : ROUTES.PATIENT_AI_RESULT
  const { selectedService, serviceConfigs } = useEligibilityServiceConfig()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReadingCard, setIsReadingCard] = useState(false)
  const [payersLoading, setPayersLoading] = useState(true)
  const [payersError, setPayersError] = useState('')
  const [toast, setToast] = useState('')
  const [isLoadingDefaultProvider, setIsLoadingDefaultProvider] = useState(false)
  const hasRequestedDefaultProviderRef = useRef(false)
  const [payorSearch, setPayorSearch] = useState('')
  const [payers, setPayers] = useState<PayerRow[]>([])
  const [form, setForm] = useState({
    intakeMode: '',
    patientFirstName: '',
    patientLastName: '',
    patientDOB: '',
    patientGender: '',
    subscriberID: '',
    payor: '',
    payerCode: '',
    providerFirstName: '',
    providerLastName: '',
    npi: '',
    serviceDateFrom: '',
    serviceDateTo: '',
  })
  const serviceTypeCodes = useMemo(
    () => allServiceTypeCodes.map((item) => item.code),
    []
  )
  const [npiRows, setNpiRows] = useState<Array<{ rowKey: string; addressIndex: number; npi: string; name: string; taxonomy: string; phone: string }>>([])
  const [isSearchingNpi, setIsSearchingNpi] = useState(false)
  const [npiSearchError, setNpiSearchError] = useState('')
  const [pendingCardAzureResult, setPendingCardAzureResult] = useState<unknown>(null)
  const [cardPersonChoices, setCardPersonChoices] = useState<HealthCardPersonOption[]>([])
  const [selectedCardPersonId, setSelectedCardPersonId] = useState('')
  const [invalidCardDetected, setInvalidCardDetected] = useState(false)
  const [answered, setAnswered] = useState<Set<PromptKey>>(new Set())
  const [draft, setDraft] = useState('')
  const [botTyping, setBotTyping] = useState(false)
  const [animatedQuestion, setAnimatedQuestion] = useState('')
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setPayersLoading(true)
    setPayersError('')
    ;(async () => {
      try {
        const rows =
          selectedService === 'stedi'
            ? await fetchStediPayers(serviceConfigs.stedi)
            : await fetchPverifyPayers(serviceConfigs.pverify)
        if (!cancelled) setPayers(rows)
      } catch (e) {
        if (!cancelled) {
          setPayers([])
          setPayersError(e instanceof Error ? e.message : 'Failed to load payors from API.')
        }
      } finally {
        if (!cancelled) setPayersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedService, serviceConfigs.pverify, serviceConfigs.stedi])

  const fetchAndApplyDefaultProvider = useCallback(async () => {
    if (hasRequestedDefaultProviderRef.current) return
    hasRequestedDefaultProviderRef.current = true
    setIsLoadingDefaultProvider(true)
    try {
      const response = await getDefaultProvider()
      const payload = response && typeof response === 'object' ? (response as Record<string, unknown>) : {}
      const providerCandidate = payload.data ?? payload.provider ?? payload.default_provider ?? payload
      const provider =
        providerCandidate && typeof providerCandidate === 'object'
          ? (providerCandidate as Record<string, unknown>)
          : null
      if (!provider) return
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

      setForm((prev) => ({
        ...prev,
        providerFirstName: providerFirstName || prev.providerFirstName,
        providerLastName: providerLastName || prev.providerLastName,
        npi: npi || prev.npi,
      }))
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : 'Unable to load default provider details.'
      )
    } finally {
      setIsLoadingDefaultProvider(false)
    }
  }, [])

  const activePromptOrder = promptOrderManual
  const nextPrompt = activePromptOrder.find((key) => !answered.has(key)) ?? null
  const completedCount = answered.size
  const totalCount = activePromptOrder.length
  const progress = Math.round((completedCount / totalCount) * 100)
  const showActiveServiceBadge = false
  const showConversationProgress = false
  const isAwaitingCardPerson =
    !isReadingCard && pendingCardAzureResult != null && cardPersonChoices.length > 1

  const messages = useMemo<ChatMessage[]>(() => {
    const base: ChatMessage[] = [
      {
        role: 'bot',
        text: 'Hi! I am your eligibility assistant. I will collect only the required details step by step.',
      },
    ]
    for (const key of activePromptOrder) {
      if (!answered.has(key)) continue
      const question = getPromptLabel(key)
      const value =
        key === 'intakeMode'
          ? form.intakeMode === 'upload'
            ? 'Upload insurance card'
            : 'Type details manually'
          : key === 'npiSelection'
              ? `${form.npi} ${form.providerFirstName} ${form.providerLastName}`.trim()
          : getAnswerValue(key, form)
      base.push({ role: 'bot', text: question })
      base.push({ role: 'user', text: value || '—' })
    }
    return base
  }, [activePromptOrder, answered, form, serviceTypeCodes])

  useEffect(() => {
    setBotTyping(true)
    const t = setTimeout(() => setBotTyping(false), 500)
    return () => clearTimeout(t)
  }, [nextPrompt])

  useEffect(() => {
    if (!nextPrompt) {
      setAnimatedQuestion('')
      return
    }
    const full = getPromptLabel(nextPrompt)
    setAnimatedQuestion('')
    let i = 0
    const timer = window.setInterval(() => {
      i += 1
      setAnimatedQuestion(full.slice(0, i))
      if (i >= full.length) {
        window.clearInterval(timer)
      }
    }, 14)
    return () => window.clearInterval(timer)
  }, [nextPrompt])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, botTyping, isReadingCard, nextPrompt])

  useEffect(() => {
    if (nextPrompt !== 'npiSelection') return
    const first = form.providerFirstName.trim()
    const last = form.providerLastName.trim()
    if (!first || !last) return
    let cancelled = false
    setIsSearchingNpi(true)
    setNpiSearchError('')
    setNpiRows([])
    ;(async () => {
      try {
        const docs = await searchProviders(`${first} ${last}`)
        if (cancelled) return
        const rows = docs.flatMap((doc) =>
          getNppesProviderTableRows(doc).map((r) => ({
            rowKey: r.rowKey,
            addressIndex: r.addressIndex,
            npi: r.npi,
            name: r.name,
            taxonomy: r.taxonomy,
            phone: r.phone,
          }))
        )
        setNpiRows(rows.slice(0, 15))
        if (rows.length === 0) setNpiSearchError('No matching NPI records found.')
      } catch (e) {
        if (!cancelled) setNpiSearchError(e instanceof Error ? e.message : 'NPI search failed.')
      } finally {
        if (!cancelled) setIsSearchingNpi(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [nextPrompt, form.providerFirstName, form.providerLastName])

  useEffect(() => {
    if (nextPrompt !== 'payor') return
    if (form.intakeMode !== 'upload') return
    if (selectedService !== 'stedi') return
    if (payersLoading || payers.length === 0) return
    const sourcePayor = form.payor.trim()
    if (!sourcePayor) return
    const normalizedSource = normalizeText(sourcePayor)
    if (!normalizedSource) return

    const exactHit = payers.find((payer) => normalizeText(payer.payerName) === normalizedSource)
    const partialHit =
      exactHit ??
      payers.find((payer) => {
        const normalizedName = normalizeText(payer.payerName)
        return normalizedName.includes(normalizedSource) || normalizedSource.includes(normalizedName)
      })
    if (partialHit) {
      submitAnswer('payor', partialHit.payerName)
    }
  }, [nextPrompt, selectedService, payersLoading, payers, form.payor])

  const submitAnswer = (key: PromptKey, value: string) => {
    if (!value.trim()) return
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'payor') {
        const hit = payers.find((p) => p.payerName.toLowerCase() === value.toLowerCase())
        next.payerCode = hit?.payerCode ?? prev.payerCode
      }
      return next
    })
    setAnswered((prev) => new Set(prev).add(key))
    setDraft('')
    if (key === 'patientGender') {
      void fetchAndApplyDefaultProvider()
    }
  }

  const submitCurrentDraft = () => {
    if (!nextPrompt) return
    const trimmed = draft.trim()
    if (!trimmed) return
    if (
      nextPrompt === 'patientDOB' ||
      nextPrompt === 'serviceDateFrom' ||
      nextPrompt === 'serviceDateTo'
    ) {
      const iso = parseNativeDateInputValue(trimmed)
      if (!iso) {
        setToast(
          `Choose a valid date. The year must be exactly 4 digits (${DATE_YEAR_MIN}–${DATE_YEAR_MAX}).`
        )
        return
      }
      submitAnswer(nextPrompt, iso)
      return
    }
    submitAnswer(nextPrompt, trimmed)
  }

  const selectNpiRow = (rowKey: string) => {
    const hit = npiRows.find((r) => r.rowKey === rowKey)
    if (!hit) return
    setForm((prev) => ({
      ...prev,
      npi: hit.npi,
    }))
    setAnswered((prev) => new Set(prev).add('npiSelection'))
  }

  const handleUploadFile = (file: File) => {
    if (!file) return
    setIsReadingCard(true)
    void onCardUpload(file)
  }

  const onCardUpload = async (file: File) => {
    try {
      setInvalidCardDetected(false)
      const url = await uploadIntegrationFile(file)
      const azure = await analyzeHealthInsuranceCardFromUrl(url)
      const choices = listHealthCardPersons(azure)
      if (choices.length > 1) {
        setForm((prev) => ({ ...prev, intakeMode: 'upload' }))
        setPendingCardAzureResult(azure)
        setCardPersonChoices(choices)
        setSelectedCardPersonId(choices[0].id)
        setToast('Multiple people found on this card. Please select one person to continue.')
        return
      }
      const extracted = mapAzureHealthInsuranceResultToIntakeForm(azure)
      if (isInvalidInsuranceCardExtraction(extracted)) {
        setInvalidCardDetected(true)
        setPendingCardAzureResult(null)
        setCardPersonChoices([])
        setSelectedCardPersonId('')
        setToast('Invalid Insurance card: please re-upload.')
        return
      }
      const todayIso = toIsoDate(new Date())
      const defaultToIso = addMonthsIso(todayIso, 1)
      const extractedPayorName = (extracted.payor || '').trim()
      const matchedPayer = extractedPayorName
        ? matchPverifyPayerForInsurer(extractedPayorName, payers)
        : undefined
      const resolvedPayerName = matchedPayer?.payerName || extracted.payor
      const resolvedPayerCode = matchedPayer?.payerCode || extracted.payerCode || ''
      setForm((prev) => {
        return {
          ...prev,
          intakeMode: 'upload',
          patientFirstName: extracted.patientFirstName || prev.patientFirstName,
          patientLastName: extracted.patientLastName || prev.patientLastName,
          patientDOB: extracted.patientDOB || prev.patientDOB,
          patientGender: extracted.patientGender || prev.patientGender,
          subscriberID: extracted.subscriberID || prev.subscriberID,
          payor: resolvedPayerName || prev.payor,
          payerCode: resolvedPayerCode || prev.payerCode,
          // Upload flow default service dates (same approach as intake): from=today, to=+1 month.
          serviceDateFrom: prev.serviceDateFrom || todayIso,
          serviceDateTo: prev.serviceDateTo || defaultToIso,
        }
      })
      setAnswered((prev) => {
        const next = new Set(prev)
        next.add('intakeMode')
        // Always skip these in upload path and go straight to DOB -> Gender.
        next.add('patientFirstName')
        next.add('patientLastName')
        next.add('subscriberID')
        next.add('serviceDateFrom')
        next.add('serviceDateTo')
        // Upload flow: skip payor step only when payer code is resolved.
        if (String(resolvedPayerCode.trim())) {
          next.add('payor')
        } else {
          next.delete('payor')
        }
        next.delete('patientDOB')
        next.delete('patientGender')
        return next
      })
      setPendingCardAzureResult(null)
      setCardPersonChoices([])
      setSelectedCardPersonId('')
      setToast('Insurance card processed. Next: Date of Birth, then Gender.')
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to read insurance card.')
    } finally {
      setIsReadingCard(false)
    }
  }

  const applySelectedCardPerson = () => {
    if (pendingCardAzureResult == null || !selectedCardPersonId) return
    const extracted = mapAzureHealthInsuranceResultToIntakeForm(
      pendingCardAzureResult,
      selectedCardPersonId
    )
    if (isInvalidInsuranceCardExtraction(extracted)) {
      setInvalidCardDetected(true)
      setToast('Invalid Insurance card: please re-upload.')
      return
    }
    setInvalidCardDetected(false)
    const todayIso = toIsoDate(new Date())
    const defaultToIso = addMonthsIso(todayIso, 1)
    const extractedPayorName = (extracted.payor || '').trim()
    const matchedPayer = extractedPayorName
      ? matchPverifyPayerForInsurer(extractedPayorName, payers)
      : undefined
    const resolvedPayerName = matchedPayer?.payerName || extracted.payor
    const resolvedPayerCode = matchedPayer?.payerCode || extracted.payerCode || ''
    setForm((prev) => {
      return {
        ...prev,
        intakeMode: 'upload',
        patientFirstName: extracted.patientFirstName || prev.patientFirstName,
        patientLastName: extracted.patientLastName || prev.patientLastName,
        patientDOB: extracted.patientDOB || prev.patientDOB,
        patientGender: extracted.patientGender || prev.patientGender,
        subscriberID: extracted.subscriberID || prev.subscriberID,
        payor: resolvedPayerName || prev.payor,
        payerCode: resolvedPayerCode || prev.payerCode,
        serviceDateFrom: prev.serviceDateFrom || todayIso,
        serviceDateTo: prev.serviceDateTo || defaultToIso,
      }
    })
    setAnswered((prev) => {
      const next = new Set(prev)
      next.add('intakeMode')
      next.add('patientFirstName')
      next.add('patientLastName')
      next.add('subscriberID')
      next.add('serviceDateFrom')
      next.add('serviceDateTo')
      if (String(resolvedPayerCode.trim())) {
        next.add('payor')
      } else {
        next.delete('payor')
      }
      next.delete('patientDOB')
      next.delete('patientGender')
      return next
    })
    setPendingCardAzureResult(null)
    setCardPersonChoices([])
    setSelectedCardPersonId('')
    setToast('Person selected. Next: Date of Birth, then Gender.')
  }

  const submitEligibility = async () => {
    if (isLoadingDefaultProvider) {
      setToast('Loading default provider details. Please wait a moment.')
      return
    }
    if (!form.npi.trim() || !form.providerFirstName.trim() || !form.providerLastName.trim()) {
      setToast('Default provider details are missing. Please set a default provider first.')
      return
    }
    const missing = activePromptOrder.filter((key) => !answered.has(key))
    if (missing.length > 0) {
      setToast('Please complete all chat questions before submitting.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload: IntakeEligibilityForm = {
        patientFirstName: form.patientFirstName,
        patientLastName: form.patientLastName,
        patientDOB: form.patientDOB,
        patientGender: form.patientGender,
        patientZip: '',
        patientPhone: '',
        patientEmail: '',
        subscriberFirstName: form.patientFirstName,
        subscriberLastName: form.patientLastName,
        subscriberDOB: form.patientDOB,
        subscriberID: form.subscriberID,
        relationToSubscriber: 'self',
        subscriberZip: '',
        payor: form.payor,
        payerCode: form.payerCode,
        groupNumber: '',
        policyNumber: '',
        cptHcpcCode: '30',
        serviceTypeCodes,
        npi: form.npi,
        providerFirstName: form.providerFirstName,
        providerLastName: form.providerLastName,
        serviceDateFrom: form.serviceDateFrom,
        serviceDateTo: form.serviceDateTo,
        diagnosisCode: '',
        placeOfService: '11',
      }
      const parsed = await submitEligibilityCheck({
        service: selectedService,
        serviceConfigs,
        formData: payload,
        options: { isSubscriberPatient: true },
        intakeContext: {
          cptHcpcCode: '30',
          serviceDateFrom: form.serviceDateFrom,
          serviceDateTo: form.serviceDateTo,
          patientName: `${form.patientFirstName} ${form.patientLastName}`.trim(),
          patientDOB: form.patientDOB,
        },
      })
      const routeState = mapPverifyToEligibilityView(parsed, {
        cptHcpcCode: '30',
        serviceDateFrom: form.serviceDateFrom,
        serviceDateTo: form.serviceDateTo,
        patientName: `${form.patientFirstName} ${form.patientLastName}`.trim(),
        patientDOB: form.patientDOB,
      })
      navigate(resultRoute, {
        state: { ...routeState, apiMeta: { ...routeState.apiMeta, source: selectedService } },
      })
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Eligibility request failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`relative ${ui.shellClass}`} style={ui.shellStyle}>
      {ui.showGradient && (
        <div
          className={`pointer-events-none fixed inset-0 ${intakeChatGradientClass()}`}
          aria-hidden
        />
      )}
      <div className="relative mx-auto flex h-full max-w-6xl flex-col">
        {providerMode && (
          <div className="mb-4 sm:mb-5">
            <h1 className="text-xl font-bold sm:text-2xl" style={{ color: theme.colors.textPrimary }}>
              Patient Intake
            </h1>
            <p className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
              Complete patient details through the AI assistant to run eligibility verification.
            </p>
          </div>
        )}
        {!providerMode && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={ui.iconWrapClass} style={ui.iconWrapStyle}>
                <MessageSquare className={`h-5 w-5 ${ui.iconClass}`} />
              </span>
              <div>
                <h1 className={ui.titleClass}>AI Eligibility Intake</h1>
                <p className={ui.subtitleClass} style={ui.subtitleStyle}>
                  Conversational intake with one final eligibility API call.
                </p>
              </div>
            </div>
            {showActiveServiceBadge && (
              <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
                Active service: {selectedService === 'stedi' ? 'Stedi' : 'pVerify'}
              </div>
            )}
          </div>
        )}

        <section className={ui.sectionClass} style={ui.sectionStyle}>
          {showConversationProgress && (
            <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-400">Conversation progress</p>
                <div className="flex items-center gap-2">
                  {isReadingCard && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/35 bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing card...
                    </span>
                  )}
                  <p className="text-xs font-medium text-slate-200">
                    {completedCount}/{totalCount} steps
                  </p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
                Service type code: <span className="font-semibold">Health Benefit Plan Coverage (30)</span> (default selected)
              </div>
            </div>
          )}

          <div className={ui.scrollAreaClass}>
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`inline-flex max-w-[92%] items-start gap-2 rounded-2xl px-4 py-3 shadow-sm ${
                    m.role === 'bot' ? ui.botBubbleClass : ui.userBubbleClass
                  }`}
                  style={m.role === 'bot' ? ui.botBubbleStyle : ui.userBubbleStyle}
                >
                  {m.role === 'bot' && (
                    <span className={ui.botAvatarClass} style={ui.botAvatarStyle}>
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <p className={m.role === 'user' ? 'text-right' : ''}>{m.text}</p>
                  {m.role === 'user' && (
                    <span className={ui.userAvatarClass} style={ui.userAvatarStyle}>
                      <UserRound className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            {!isReadingCard && !isAwaitingCardPerson && nextPrompt && (
              <div className="flex justify-start">
                <div className={ui.typingBubbleClass} style={ui.typingBubbleStyle}>
                  <span className={ui.botAvatarClass} style={ui.botAvatarStyle}>
                    <PencilLine className="h-3.5 w-3.5" />
                  </span>
                  <p>{animatedQuestion}</p>
                </div>
              </div>
            )}
            {nextPrompt === 'intakeMode' && (
              <div className={ui.actionPanelClass} style={ui.actionPanelStyle}>
                <p className={ui.actionHintClass} style={ui.actionHintStyle}>
                  Choose one option to continue
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => submitAnswer('intakeMode', 'manual')}
                    disabled={isReadingCard}
                    className={ui.optionBtnClass}
                    style={ui.optionBtnStyle}
                  >
                    <PencilLine className="h-4 w-4" />
                    Manual
                  </button>
                  <label
                    className={`${ui.optionBtnClass} cursor-pointer`}
                    style={ui.optionBtnStyle}
                  >
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleUploadFile(file)
                        }
                      }}
                      disabled={isReadingCard}
                    />
                    <Upload className="h-4 w-4" />
                    Upload insurance card
                  </label>
                </div>
                {invalidCardDetected && (
                  <div className={ui.errorPanelClass} style={ui.errorPanelStyle}>
                    <p className="text-xs font-medium" style={ui.errorTextStyle}>
                      Invalid Insurance card: please re-upload.
                    </p>
                    <label
                      className={`${ui.optionBtnClass} mt-2 cursor-pointer`}
                      style={ui.optionBtnStyle}
                    >
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadFile(file)
                        }}
                        disabled={isReadingCard}
                      />
                      <Upload className="h-3.5 w-3.5" />
                      Re-upload insurance card
                    </label>
                  </div>
                )}
              </div>
            )}
            {isReadingCard && (
              <div className={ui.statusPanelClass} style={ui.statusPanelStyle}>
                <p className="inline-flex items-center gap-2 font-medium" style={ui.statusTextStyle}>
                  <Loader2 className={ui.statusSpinnerClass} style={ui.statusSpinnerStyle} />
                  Reading insurance card and pre-filling details...
                </p>
              </div>
            )}
            {isAwaitingCardPerson && (
              <div className={ui.choicePanelClass} style={ui.choicePanelStyle}>
                <p className={ui.choiceHintClass} style={ui.choiceHintStyle}>
                  Multiple people found on this insurance card. Please select one person:
                </p>
                <div className="space-y-2">
                  {cardPersonChoices.map((person) => (
                    <label
                      key={person.id}
                      className={ui.cardPersonRowClass}
                      style={ui.cardPersonRowStyle}
                    >
                      <input
                        type="radio"
                        name="card-person-selection"
                        value={person.id}
                        checked={selectedCardPersonId === person.id}
                        onChange={() => setSelectedCardPersonId(person.id)}
                        className="h-4 w-4"
                      />
                      <span>{person.label}</span>
                    </label>
                  ))}
                </div>
                <Button type="button" variant="primary" onClick={applySelectedCardPerson} disabled={!selectedCardPersonId}>
                  Continue
                </Button>
              </div>
            )}
            {nextPrompt === 'patientGender' && (
              <div
                className={`${ui.choicePanelClass} flex flex-wrap gap-2`}
                style={ui.choicePanelStyle}
              >
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => submitAnswer('patientGender', option.value)}
                    className={ui.optionBtnClass}
                    style={ui.optionBtnStyle}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {nextPrompt === 'payor' && (
              <div className={ui.choicePanelClass} style={ui.choicePanelStyle}>
                <p className={ui.choiceHintClass} style={ui.choiceHintStyle}>
                  Select payor from live {selectedService === 'stedi' ? 'Stedi' : 'pVerify'} API data
                </p>
                {form.intakeMode === 'manual' ? (
                  <input
                    type="text"
                    value={payorSearch}
                    onChange={(e) => setPayorSearch(e.target.value)}
                    placeholder="Search payor..."
                    className={ui.fieldInputClass}
                    style={ui.fieldInputStyle}
                  />
                ) : (
                  <p className={ui.choiceHintClass} style={ui.choiceHintStyle}>
                    Upload mode auto-selects payor from the insurance card.
                  </p>
                )}
                <p className="text-[11px]" style={ui.choiceHintStyle}>
                  {payersLoading
                    ? 'Loading payors from API...'
                    : `${payers.length} payors loaded from API. Pick one below.`}
                </p>
                {payersError ? <p className="text-xs text-rose-300">{payersError}</p> : null}
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
                  {!payersLoading &&
                    payers
                    .filter((p) => {
                      const q = payorSearch.trim().toLowerCase()
                      if (!q) return true
                      return (
                        p.payerName.toLowerCase().includes(q) ||
                        p.payerCode.toLowerCase().includes(q) ||
                        String(p.searchText ?? '').toLowerCase().includes(q)
                      )
                    })
                    .map((p) => (
                      <button
                        key={p.payerCode + p.payerName}
                        type="button"
                        onClick={() => {
                          submitAnswer('payor', p.payerName)
                          setPayorSearch('')
                        }}
                        className={ui.listOptionBtnClass}
                        style={ui.listOptionBtnStyle}
                      >
                        <span className="font-medium">{p.payerName}</span>
                        <span className={ui.listOptionMetaClass} style={ui.listOptionMetaStyle}>
                          {p.payerCode}
                        </span>
                      </button>
                    ))}
                  {!payersLoading &&
                  !payersError &&
                  payers.filter((p) => {
                    const q = payorSearch.trim().toLowerCase()
                    if (!q) return true
                    return (
                      p.payerName.toLowerCase().includes(q) ||
                      p.payerCode.toLowerCase().includes(q) ||
                      String(p.searchText ?? '').toLowerCase().includes(q)
                    )
                  }).length === 0 ? (
                    <p className="text-xs text-slate-400">No payors returned from API.</p>
                  ) : null}
                </div>
              </div>
            )}
            {nextPrompt === 'npiSelection' && (
              <div className={ui.choicePanelClass} style={ui.choicePanelStyle}>
                <p className={ui.choiceHintClass} style={ui.choiceHintStyle}>
                  Select provider NPI from search results
                </p>
                {isSearchingNpi && (
                  <p className="inline-flex items-center gap-2 text-xs text-slate-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching NPI...
                  </p>
                )}
                {npiSearchError ? <p className="text-xs text-rose-300">{npiSearchError}</p> : null}
                <div className="max-h-40 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
                  {npiRows.map((row) => (
                    <button
                      key={row.rowKey}
                      type="button"
                      onClick={() => selectNpiRow(row.rowKey)}
                      className={ui.listOptionBtnClass}
                      style={ui.listOptionBtnStyle}
                    >
                      <div className="font-medium">{row.name || 'Provider'}</div>
                      <div className={ui.listOptionMetaClass} style={ui.listOptionMetaStyle}>
                        NPI: {row.npi} {row.taxonomy ? `· ${row.taxonomy}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!nextPrompt && (
              <div className="flex justify-start">
                <div className={ui.providerSummaryClass} style={ui.providerSummaryStyle}>
                  <span
                    className={`${ui.botAvatarClass} mt-0.5`}
                    style={ui.providerSummaryAvatarStyle ?? ui.botAvatarStyle}
                  >
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="font-medium">Provider details</p>
                    <p className="text-xs" style={ui.providerSummaryMetaStyle}>
                      {isLoadingDefaultProvider
                        ? 'Loading from default provider API...'
                        : `${form.providerFirstName || '-'} ${form.providerLastName || ''}`.trim()}
                      {!isLoadingDefaultProvider ? ` | NPI: ${form.npi || '-'}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!nextPrompt && (
              <div className={ui.completePanelClass} style={ui.completePanelStyle}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className={ui.completeMessageClass} style={ui.completeMessageStyle}>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    All required details captured.
                  </p>
                  <Button type="button" variant="primary" onClick={() => void submitEligibility()} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking eligibility...</span>
                    ) : (
                      'Run Eligibility Check'
                    )}
                  </Button>
                </div>
              </div>
            )}
            {botTyping && nextPrompt && (
              <div className={ui.statusPanelClass} style={ui.statusPanelStyle}>
                <p className="inline-flex items-center gap-2 font-medium" style={ui.statusTextStyle}>
                  <Loader2 className={ui.statusSpinnerClass} style={ui.statusSpinnerStyle} />
                  Assistant is preparing the next question...
                </p>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        </section>
      </div>
      {!isReadingCard &&
        !isAwaitingCardPerson &&
        nextPrompt &&
        nextPrompt !== 'intakeMode' &&
        nextPrompt !== 'patientGender' &&
        nextPrompt !== 'payor' &&
        nextPrompt !== 'npiSelection' && (
        <div className={ui.inputBarWrapClass}>
          <div className={ui.inputBarInnerClass} style={ui.inputBarInnerStyle}>
            <input
              type={
                nextPrompt === 'patientDOB' ||
                nextPrompt === 'serviceDateFrom' ||
                nextPrompt === 'serviceDateTo'
                  ? 'date'
                  : 'text'
              }
              {...(nextPrompt === 'patientDOB' ||
              nextPrompt === 'serviceDateFrom' ||
              nextPrompt === 'serviceDateTo'
                ? {
                    min: `${DATE_YEAR_MIN}-01-01`,
                    max: `${DATE_YEAR_MAX}-12-31`,
                  }
                : {})}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCurrentDraft()
              }}
              placeholder={getPromptPlaceholder(nextPrompt)}
              className={ui.inputClass}
              style={providerMode ? { color: theme.colors.textPrimary } : undefined}
            />
            <button
              type="button"
              onClick={submitCurrentDraft}
              className={ui.sendBtnClass}
              style={ui.sendBtnStyle}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <Toast message={toast} type="info" isVisible={Boolean(toast)} onClose={() => setToast('')} />
    </div>
  )
}

function getPromptLabel(prompt: PromptKey): string {
  const labels: Record<PromptKey, string> = {
    intakeMode: 'Would you like to upload an insurance card or enter details manually?',
    patientFirstName: 'What is the patient first name?',
    patientLastName: 'What is the patient last name?',
    patientDOB: 'What is the patient date of birth?',
    patientGender: 'What is the patient gender?',
    subscriberID: 'What is the subscriber/member ID?',
    payor: 'Which payor/insurance company should we check?',
    providerFirstName: 'Provider first name?',
    providerLastName: 'Provider last name?',
    serviceDateFrom: 'Service date from?',
    serviceDateTo: 'Service date to?',
    npiSelection: 'Select provider NPI',
  }
  return labels[prompt]
}

function getPromptPlaceholder(prompt: PromptKey): string {
  const labels: Partial<Record<PromptKey, string>> & { npi?: string } = {
    patientFirstName: 'e.g. John',
    patientLastName: 'e.g. Smith',
    subscriberID: 'e.g. ABC12345',
    payor: 'e.g. Aetna',
    npi: '10-digit NPI',
    providerFirstName: 'e.g. Emily',
    providerLastName: 'e.g. Carter',
  }
  return labels[prompt] ?? ''
}

function getAnswerValue(prompt: PromptKey, form: Record<string, string>): string {
  return form[prompt] ?? ''
}
