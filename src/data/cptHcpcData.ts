export interface CptHcpcCode {
  id: string
  code: string
  description: string
  authorizationRequired: boolean
  productService: string
  category: string
}

export const initialCptHcpcCodes: CptHcpcCode[] = [
  {
    id: '1',
    code: '99213',
    description: 'Office or other outpatient visit for the evaluation and management of an established patient',
    authorizationRequired: true,
    productService: 'office-visit',
    category: 'CPT',
  },
  {
    id: '2',
    code: '99214',
    description: 'Office or other outpatient visit for the evaluation and management of an established patient',
    authorizationRequired: true,
    productService: 'office-visit',
    category: 'CPT',
  },
  {
    id: '3',
    code: '99215',
    description: 'Office or other outpatient visit for the evaluation and management of an established patient',
    authorizationRequired: true,
    productService: 'office-visit',
    category: 'CPT',
  },
  {
    id: '4',
    code: '70551',
    description: 'MRI brain without contrast',
    authorizationRequired: true,
    productService: 'imaging',
    category: 'CPT',
  },
  {
    id: '5',
    code: '72141',
    description: 'MRI cervical spine without contrast',
    authorizationRequired: true,
    productService: 'imaging',
    category: 'CPT',
  },
  {
    id: '6',
    code: '97110',
    description: 'Therapeutic exercise',
    authorizationRequired: false,
    productService: 'therapy',
    category: 'CPT',
  },
  {
    id: '7',
    code: '97112',
    description: 'Neuromuscular reeducation',
    authorizationRequired: false,
    productService: 'therapy',
    category: 'CPT',
  },
  {
    id: '8',
    code: '90834',
    description: 'Psychotherapy 45 minutes',
    authorizationRequired: true,
    productService: 'mental-health',
    category: 'CPT',
  },
  {
    id: '9',
    code: 'E0424',
    description: 'Stationary compressed gaseous oxygen system, rental',
    authorizationRequired: true,
    productService: 'durable-medical-equipment',
    category: 'HCPC',
  },
  {
    id: '10',
    code: 'E0433',
    description: 'Portable gaseous oxygen system, rental',
    authorizationRequired: true,
    productService: 'durable-medical-equipment',
    category: 'HCPC',
  },
  {
    id: '11',
    code: 'A4217',
    description: 'Sterile water, saline and/or dextrose, diluent/flush, 10 ml',
    authorizationRequired: false,
    productService: 'supplies',
    category: 'HCPC',
  },
  {
    id: '12',
    code: 'J0171',
    description: 'Injection, adalimumab, 20 mg',
    authorizationRequired: true,
    productService: 'injections',
    category: 'HCPC',
  },
  {
    id: '13',
    code: '36415',
    description: 'Routine venipuncture for collection of specimen(s)',
    authorizationRequired: false,
    productService: 'lab-work',
    category: 'CPT',
  },
  {
    id: '14',
    code: '80053',
    description: 'Comprehensive metabolic panel',
    authorizationRequired: false,
    productService: 'lab-work',
    category: 'CPT',
  },
  {
    id: '15',
    code: '93000',
    description: 'Electrocardiogram, routine ECG with at least 12 leads',
    authorizationRequired: false,
    productService: 'cardiology',
    category: 'CPT',
  },
]

export interface Option {
  value: string
  label: string
}

export const productServiceOptions: Option[] = [
  { value: 'office-visit', label: 'Office Visit' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'therapy', label: 'Physical Therapy' },
  { value: 'mental-health', label: 'Mental Health' },
  { value: 'durable-medical-equipment', label: 'Durable Medical Equipment' },
  { value: 'supplies', label: 'Medical Supplies' },
  { value: 'injections', label: 'Injections' },
  { value: 'lab-work', label: 'Lab Work' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'other', label: 'Other' },
]

export const categoryOptions: Option[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'CPT', label: 'CPT' },
  { value: 'HCPC', label: 'HCPC' },
]

export const authorizationOptions: Option[] = [
  { value: 'all', label: 'All' },
  { value: 'required', label: 'Authorization Required' },
  { value: 'not-required', label: 'No Authorization Required' },
]

function truncateDescription(text: string, maxLen: number): string {
  const t = text.trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`
}

function labelForProductService(key: string): string {
  return productServiceOptions.find((o) => o.value === key)?.label ?? key
}

/**
 * Patient-friendly dropdown labels; `value` is still the CPT/HCPC code for APIs.
 */
export function getPatientSampleServiceOptions(): { value: string; label: string }[] {
  return initialCptHcpcCodes.map((c) => ({
    value: c.code,
    label: `${labelForProductService(c.productService)} — ${truncateDescription(c.description, 50)} (${c.code})`,
  }))
}

