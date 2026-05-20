export interface Document {
  id: string
  name: string
  size: string
  uploadedDate: string
  uploadedBy: string
}

export interface PriorAuthorization {
  id: string
  patientName: string
  patientId: string
  dateOfBirth: string
  subscriberId: string
  payor: string
  planName: string
  serviceCode: string
  serviceDescription: string
  diagnosisCode: string
  diagnosisDescription: string
  requestedServiceDate: string
  submittedDate: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  provider: {
    name: string
    npi: string
    address: string
  }
  clinicalInfo: {
    reasonForRequest: string
    previousTreatments: string
    urgency: 'routine' | 'urgent' | 'stat'
  }
  documents: Document[]
}

export const priorAuthorization: PriorAuthorization = {
  id: 'PA-2024-001234',
  patientName: 'John Smith',
  patientId: 'P-12345',
  dateOfBirth: '1985-05-15',
  subscriberId: 'SUB-12345',
  
  payor: 'Blue Cross Blue Shield',
  planName: 'BCBS PPO',
  
  serviceCode: '70551',
  serviceDescription: 'MRI brain without contrast',
  diagnosisCode: 'G93.1',
  diagnosisDescription: 'Anoxic brain damage, not elsewhere classified',
  
  requestedServiceDate: '2024-02-01',
  submittedDate: '2024-01-10',
  status: 'pending',
  
  provider: {
    name: 'Health Lynk Medical Group',
    npi: '1234567890',
    address: '123 Medical Center Drive, San Francisco, CA 94102',
  },
  
  clinicalInfo: {
    reasonForRequest: 'Patient presenting with persistent headaches and neurological symptoms requiring diagnostic imaging.',
    previousTreatments: 'Patient has tried conservative management with medications for 3 months without improvement.',
    urgency: 'routine',
  },
  
  documents: [
    {
      id: '1',
      name: 'Physician_Order.pdf',
      size: '245 KB',
      uploadedDate: '2024-01-10T09:15:00',
      uploadedBy: 'Dr. Sarah Johnson',
    },
    {
      id: '2',
      name: 'Clinical_Notes.pdf',
      size: '1.2 MB',
      uploadedDate: '2024-01-10T09:20:00',
      uploadedBy: 'Dr. Sarah Johnson',
    },
    {
      id: '3',
      name: 'Lab_Results.pdf',
      size: '856 KB',
      uploadedDate: '2024-01-10T10:30:00',
      uploadedBy: 'Nurse Jane Doe',
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

export const priorAuthActivityLog: TimelineItem[] = [
  {
    id: '1',
    date: '2024-01-15T14:30:00',
    status: 'pending',
    action: 'Status Update',
    performedBy: 'System',
    details: 'Prior authorization is under review by payor',
    result: 'Pending Review',
  },
  {
    id: '2',
    date: '2024-01-12T11:00:00',
    status: 'pending',
    action: 'Document Uploaded',
    performedBy: 'Nurse Jane Doe',
    details: 'Lab_Results.pdf uploaded',
    result: 'Document Added',
  },
  {
    id: '3',
    date: '2024-01-10T10:30:00',
    status: 'pending',
    action: 'Document Uploaded',
    performedBy: 'Dr. Sarah Johnson',
    details: 'Clinical_Notes.pdf uploaded',
    result: 'Document Added',
  },
  {
    id: '4',
    date: '2024-01-10T09:20:00',
    status: 'pending',
    action: 'Document Uploaded',
    performedBy: 'Dr. Sarah Johnson',
    details: 'Physician_Order.pdf uploaded',
    result: 'Document Added',
  },
  {
    id: '5',
    date: '2024-01-10T09:00:00',
    status: 'pending',
    action: 'Prior Authorization Submitted',
    performedBy: 'Dr. Sarah Johnson',
    details: 'Prior authorization request submitted to Blue Cross Blue Shield',
    result: 'Submitted',
  },
  {
    id: '6',
    date: '2024-01-10T08:45:00',
    status: 'pending',
    action: 'Prior Authorization Created',
    performedBy: 'Dr. Sarah Johnson',
    details: 'Prior authorization request created',
    result: 'Created',
  },
]

