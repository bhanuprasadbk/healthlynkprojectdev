export const summaryStats = {
  totalPatients: 1247,
  eligibilityChecksToday: 43,
  pendingPriorAuth: 12,
  approvedAuth: 28,
}

export interface EligibilityCheck {
  id: string
  patientName: string
  patientId: string
  payor: string
  date: string
  status: string
  serviceType: string
  coverage: string
}

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate dates relative to today
const today = new Date()
const getDateString = (daysAgo: number): string => {
  const date = new Date(today)
  date.setDate(date.getDate() - daysAgo)
  return formatDate(date)
}

export const eligibilityChecks: EligibilityCheck[] = [
  {
    id: 'EC-001',
    patientName: 'John Smith',
    patientId: 'P-12345',
    payor: 'Blue Cross Blue Shield',
    date: getDateString(0), // Today
    status: 'Complete',
    serviceType: 'Cardiology Consultation',
    coverage: 'Active',
  },
  {
    id: 'EC-002',
    patientName: 'Emily Johnson',
    patientId: 'P-12346',
    payor: 'Aetna',
    date: getDateString(0), // Today
    status: 'Complete',
    serviceType: 'MRI Scan',
    coverage: 'Active',
  },
  {
    id: 'EC-003',
    patientName: 'Michael Brown',
    patientId: 'P-12347',
    payor: 'UnitedHealthcare',
    date: getDateString(1), // Yesterday
    status: 'Pending Authorization',
    serviceType: 'Physical Therapy',
    coverage: 'Pending Verification',
  },
  {
    id: 'EC-004',
    patientName: 'Sarah Davis',
    patientId: 'P-12348',
    payor: 'Cigna',
    date: getDateString(1), // Yesterday
    status: 'Pending Paperwork',
    serviceType: 'Specialist Consultation',
    coverage: 'Inactive',
  },
  {
    id: 'EC-005',
    patientName: 'David Wilson',
    patientId: 'P-12349',
    payor: 'Blue Cross Blue Shield',
    date: getDateString(1), // Yesterday
    status: 'Complete',
    serviceType: 'Lab Work',
    coverage: 'Active',
  },
  {
    id: 'EC-006',
    patientName: 'Jessica Martinez',
    patientId: 'P-12350',
    payor: 'Aetna',
    date: getDateString(2), // 2 days ago
    status: 'Complete',
    serviceType: 'X-Ray',
    coverage: 'Active',
  },
  {
    id: 'EC-007',
    patientName: 'Robert Taylor',
    patientId: 'P-12351',
    payor: 'Medicare',
    date: getDateString(2), // 2 days ago
    status: 'Complete',
    serviceType: 'Annual Checkup',
    coverage: 'Active',
  },
  {
    id: 'EC-008',
    patientName: 'Amanda Anderson',
    patientId: 'P-12352',
    payor: 'UnitedHealthcare',
    date: getDateString(2), // 2 days ago
    status: 'Pending Authorization',
    serviceType: 'Surgery Consultation',
    coverage: 'Pending Verification',
  },
  {
    id: 'EC-009',
    patientName: 'James Thomas',
    patientId: 'P-12353',
    payor: 'Cigna',
    date: getDateString(3), // 3 days ago
    status: 'Complete',
    serviceType: 'Dermatology',
    coverage: 'Active',
  },
  {
    id: 'EC-010',
    patientName: 'Lisa Jackson',
    patientId: 'P-12354',
    payor: 'Blue Cross Blue Shield',
    date: getDateString(3), // 3 days ago
    status: 'Pending Paperwork',
    serviceType: 'Specialist Consultation',
    coverage: 'Inactive',
  },
  {
    id: 'EC-011',
    patientName: 'Christopher White',
    patientId: 'P-12355',
    payor: 'Aetna',
    date: getDateString(3), // 3 days ago
    status: 'Complete',
    serviceType: 'Lab Work',
    coverage: 'Active',
  },
  {
    id: 'EC-012',
    patientName: 'Michelle Harris',
    patientId: 'P-12356',
    payor: 'Medicare',
    date: getDateString(4), // 4 days ago
    status: 'Complete',
    serviceType: 'Physical Therapy',
    coverage: 'Active',
  },
  {
    id: 'EC-013',
    patientName: 'William Garcia',
    patientId: 'P-12357',
    payor: 'Blue Cross Blue Shield',
    date: getDateString(10), // 10 days ago (this month)
    status: 'Complete',
    serviceType: 'Cardiology Consultation',
    coverage: 'Active',
  },
  {
    id: 'EC-014',
    patientName: 'Jennifer Lee',
    patientId: 'P-12358',
    payor: 'Aetna',
    date: getDateString(20), // 20 days ago (this month)
    status: 'Pending Authorization',
    serviceType: 'MRI Scan',
    coverage: 'Pending Verification',
  },
  {
    id: 'EC-015',
    patientName: 'Daniel Moore',
    patientId: 'P-12359',
    payor: 'UnitedHealthcare',
    date: getDateString(45), // 45 days ago (this quarter)
    status: 'Complete',
    serviceType: 'Physical Therapy',
    coverage: 'Active',
  },
  {
    id: 'EC-016',
    patientName: 'Patricia Wilson',
    patientId: 'P-12360',
    payor: 'Cigna',
    date: getDateString(60), // 60 days ago (this quarter)
    status: 'Pending Paperwork',
    serviceType: 'Specialist Consultation',
    coverage: 'Inactive',
  },
  {
    id: 'EC-017',
    patientName: 'Matthew Clark',
    patientId: 'P-12361',
    payor: 'Medicare',
    date: getDateString(90), // 90 days ago (this quarter)
    status: 'Complete',
    serviceType: 'Annual Checkup',
    coverage: 'Active',
  },
  {
    id: 'EC-018',
    patientName: 'Linda Rodriguez',
    patientId: 'P-12362',
    payor: 'Blue Cross Blue Shield',
    date: getDateString(120), // 120 days ago (this year)
    status: 'Complete',
    serviceType: 'Lab Work',
    coverage: 'Active',
  },
  {
    id: 'EC-019',
    patientName: 'Mark Lewis',
    patientId: 'P-12363',
    payor: 'Aetna',
    date: getDateString(180), // 180 days ago (this year)
    status: 'Pending Authorization',
    serviceType: 'X-Ray',
    coverage: 'Pending Verification',
  },
  {
    id: 'EC-020',
    patientName: 'Nancy Walker',
    patientId: 'P-12364',
    payor: 'UnitedHealthcare',
    date: getDateString(250), // 250 days ago (this year)
    status: 'Complete',
    serviceType: 'Dermatology',
    coverage: 'Active',
  },
]

export const payors = [
  'All Payors',
  'Blue Cross Blue Shield',
  'Aetna',
  'UnitedHealthcare',
  'Cigna',
  'Medicare',
]

export const statuses = [
  'All Statuses',
  'Complete',
  'Pending Authorization',
  'Pending Paperwork',
]

