export interface EligibilityResult {
  patientName: string
  patientId: string
  subscriberId: string
  payor: string
  planName: string
  serviceCode: string
  serviceDescription: string
  serviceDate: string
  checkDate: string
  status: 'eligible' | 'not-eligible'
  financial: {
    copay: number
    deductible: number
    deductibleRemaining: number
    outOfPocketMax: number
    outOfPocketRemaining: number
    coinsurance: string
  }
  authorization: {
    required: boolean
    status: 'approved' | 'pending' | 'denied' | 'not-required'
    priorAuthNumber?: string
    submittedDate?: string
    decisionDate?: string | null
  }
  coverage: {
    active: boolean
    effectiveDate: string
    terminationDate: string | null
    planType: string
    networkStatus: string
  }
  warnings: Array<{
    type: 'warning' | 'error'
    message: string
    severity: 'high' | 'medium' | 'low'
  }>
  benefits: Array<{
    category: string
    covered: boolean
    limit: string
    remaining: string
  }>
  /** Optional enrichment when source is pVerify EligibilitySummary */
  pverify?: {
    resultPracticeType?: string | null
    groupNumber?: string | null
    planNumber?: string | null
    location?: string | null
    subscriberCityStateZip?: string | null
    pcp?: { name: string; phone: string } | null
    dmeCoverage?: {
      inNet: string
      outNet: string
      copayOutNetDisplay: string
      coinsuranceOutNetDisplay: string
    } | null
    family?: {
      deductible: string
      deductibleRemaining: string
      oopMax: string
      oopRemaining: string
    } | null
  }
}

export const eligibilityResult: EligibilityResult = {
  patientName: 'John Smith',
  patientId: 'P-12345',
  subscriberId: 'SUB-12345',
  payor: 'Blue Cross Blue Shield',
  planName: 'BCBS PPO',
  serviceCode: '99213',
  serviceDescription: 'Office or other outpatient visit for the evaluation and management of an established patient',
  serviceDate: '2024-01-15',
  checkDate: '2024-01-15T10:30:00',
  
  status: 'eligible',
  
  financial: {
    copay: 25.00,
    deductible: 500.00,
    deductibleRemaining: 250.00,
    outOfPocketMax: 5000.00,
    outOfPocketRemaining: 3500.00,
    coinsurance: '20%',
  },
  
  authorization: {
    required: true,
    status: 'pending',
    priorAuthNumber: 'PA-2024-001234',
    submittedDate: '2024-01-10',
    decisionDate: null,
  },
  
  coverage: {
    active: true,
    effectiveDate: '2024-01-01',
    terminationDate: null,
    planType: 'PPO',
    networkStatus: 'in-network',
  },
  
  warnings: [
    {
      type: 'warning',
      message: 'Prior authorization is pending. Billing may be denied if not approved.',
      severity: 'high',
    },
    {
      type: 'warning',
      message: 'Deductible is 50% met. Patient may have significant out-of-pocket costs.',
      severity: 'medium',
    },
  ],
  
  pverify: undefined,
  benefits: [
    {
      category: 'Office Visits',
      covered: true,
      limit: 'Unlimited',
      remaining: 'Unlimited',
    },
    {
      category: 'Preventive Care',
      covered: true,
      limit: '100%',
      remaining: '100%',
    },
    {
      category: 'Specialist Visits',
      covered: true,
      limit: 'Subject to deductible',
      remaining: 'Subject to deductible',
    },
  ],
}

export interface TimelineItem {
  id: string
  date: string
  status: string
  action: string
  performedBy?: string
  details: string
  result: string
}

export const eligibilityTimeline: TimelineItem[] = [
  {
    id: '1',
    date: '2024-01-15T10:30:00',
    status: 'eligible',
    action: 'Eligibility Check Performed',
    performedBy: 'System',
    details: 'Real-time eligibility verification completed',
    result: 'Eligible',
  },
  {
    id: '2',
    date: '2024-01-10T14:20:00',
    status: 'pending',
    action: 'Prior Authorization Submitted',
    performedBy: 'Dr. Sarah Johnson',
    details: 'Prior authorization request submitted for service code 99213',
    result: 'Pending Review',
  },
  {
    id: '3',
    date: '2024-01-05T09:15:00',
    status: 'eligible',
    action: 'Eligibility Check Performed',
    performedBy: 'System',
    details: 'Routine eligibility check',
    result: 'Eligible',
  },
  {
    id: '4',
    date: '2023-12-20T11:00:00',
    status: 'eligible',
    action: 'Eligibility Check Performed',
    performedBy: 'System',
    details: 'Pre-service eligibility verification',
    result: 'Eligible',
  },
  {
    id: '5',
    date: '2023-12-01T08:00:00',
    status: 'eligible',
    action: 'Coverage Activated',
    performedBy: 'Insurance Provider',
    details: 'New coverage period began',
    result: 'Active',
  },
]

