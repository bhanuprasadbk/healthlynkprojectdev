export interface Plan {
  id: string
  planName: string
  planType: string
  autoCheckFrequency: string
  status: string
  createdAt: string
}

export interface Payor {
  id: string
  payorName: string
  status: string
  plans: Plan[]
  createdAt: string
}

export const initialPayors: Payor[] = [
  {
    id: '1',
    payorName: 'Blue Cross Blue Shield',
    status: 'active',
    createdAt: '2024-01-01',
    plans: [
      {
        id: '1-1',
        planName: 'BCBS PPO',
        planType: 'PPO',
        autoCheckFrequency: 'monthly',
        status: 'active',
        createdAt: '2024-01-01',
      },
      {
        id: '1-2',
        planName: 'BCBS HMO',
        planType: 'HMO',
        autoCheckFrequency: '3months',
        status: 'active',
        createdAt: '2024-01-01',
      },
    ],
  },
  {
    id: '2',
    payorName: 'Aetna',
    status: 'active',
    createdAt: '2024-01-02',
    plans: [
      {
        id: '2-1',
        planName: 'Aetna HMO',
        planType: 'HMO',
        autoCheckFrequency: '6months',
        status: 'active',
        createdAt: '2024-01-02',
      },
    ],
  },
  {
    id: '3',
    payorName: 'UnitedHealthcare',
    status: 'active',
    createdAt: '2024-01-03',
    plans: [
      {
        id: '3-1',
        planName: 'UHC EPO',
        planType: 'EPO',
        autoCheckFrequency: 'yearly',
        status: 'active',
        createdAt: '2024-01-03',
      },
    ],
  },
  {
    id: '4',
    payorName: 'Cigna',
    status: 'inactive',
    createdAt: '2024-01-04',
    plans: [
      {
        id: '4-1',
        planName: 'Cigna PPO',
        planType: 'PPO',
        autoCheckFrequency: 'monthly',
        status: 'inactive',
        createdAt: '2024-01-04',
      },
    ],
  },
  {
    id: '5',
    payorName: 'Medicare',
    status: 'active',
    createdAt: '2024-01-05',
    plans: [
      {
        id: '5-1',
        planName: 'Medicare Part A',
        planType: 'Medicare',
        autoCheckFrequency: 'monthly',
        status: 'active',
        createdAt: '2024-01-05',
      },
    ],
  },
]

export interface Option {
  value: string
  label: string
}

export const planTypes: Option[] = [
  { value: 'PPO', label: 'PPO' },
  { value: 'HMO', label: 'HMO' },
  { value: 'EPO', label: 'EPO' },
  { value: 'POS', label: 'POS' },
  { value: 'Medicare', label: 'Medicare' },
  { value: 'Medicaid', label: 'Medicaid' },
]

export const autoCheckFrequencies: Option[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: 'yearly', label: 'Yearly' },
]

export const statusOptions: Option[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

