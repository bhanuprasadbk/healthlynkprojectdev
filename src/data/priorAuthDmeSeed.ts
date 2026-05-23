import type { PriorAuthorizationStatus } from '../services/priorAuthorizationService'

export type PriorAuthDmeDocumentTemplate = {
  id: string
  name: string
  meta: string
  required: boolean
  uploaded?: boolean
  fileName?: string
}

export type PriorAuthDmeSeedRow = {
  id: string
  requestNumber: string
  status: PriorAuthorizationStatus
  statusLabel: string
  patientName: string
  patientId: string
  dateOfBirth: string
  gender: string
  memberId: string
  subscriberId: string
  groupId: string
  payorName: string
  payorId: string
  planName: string
  prescriberName: string
  equipmentLabel: string
  serviceCode: string
  serviceDescription: string
  diagnosisCode: string
  diagnosisDescription: string
  requestedServiceDate: string
  submittedDate: string
  providerName: string
  providerNpi: string
  ptan: string
  providerAddress: string
  orderingPhysician: string
  faceToFaceDate: string
  placeOfService: string
  rentalPurchase: string
  quantityLength: string
  medicalNecessity: string
  urgency: 'routine' | 'urgent' | 'stat'
  documents: PriorAuthDmeDocumentTemplate[]
  activity: { id: string; message: string; time: string; tone?: 'default' | 'green' | 'amber' }[]
}

export const PRIOR_AUTH_DME_SEED: PriorAuthDmeSeedRow[] = [
  {
    id: 'pa-seed-1234',
    requestNumber: 'PA-2024-001234',
    status: 'approved',
    statusLabel: 'Approved',
    patientName: 'John Smith',
    patientId: 'P-12345',
    dateOfBirth: '1985-05-15',
    gender: 'Male',
    memberId: 'MBR-1234501',
    subscriberId: 'SUB-12345',
    groupId: 'GRP-10234',
    payorName: 'Blue Cross Blue Shield',
    payorId: '84980',
    planName: 'BCBS PPO',
    prescriberName: 'Dr. Sarah Johnson, MD',
    equipmentLabel: '70551 — MRI brain without contrast',
    serviceCode: '70551',
    serviceDescription: 'MRI brain without contrast',
    diagnosisCode: 'G93.1',
    diagnosisDescription: 'Anoxic brain damage, not elsewhere classified',
    requestedServiceDate: '2024-02-01',
    submittedDate: '2024-01-10',
    providerName: 'Health Lynk Medical Group',
    providerNpi: '1234567890',
    ptan: 'CA-IMG-44102',
    providerAddress: '123 Medical Center Drive, San Francisco, CA 94102',
    orderingPhysician: 'Dr. Sarah Johnson, MD',
    faceToFaceDate: '2024-01-05',
    placeOfService: '11 — Office',
    rentalPurchase: 'Purchase',
    quantityLength: '1 study',
    medicalNecessity:
      'Patient presenting with persistent headaches and neurological symptoms requiring diagnostic imaging. Conservative management with medications for 3 months without improvement. MRI brain without contrast is medically necessary to evaluate underlying pathology.',
    urgency: 'routine',
    documents: [
      {
        id: 'doc-order-1234',
        name: 'Physician_Order.pdf',
        meta: 'Signed order · Jan 10, 2024 · Dr. Johnson',
        required: false,
        uploaded: true,
        fileName: 'Physician_Order.pdf',
      },
      {
        id: 'doc-notes-1234',
        name: 'Clinical_Notes.pdf',
        meta: 'Neurology consult notes · Jan 10, 2024',
        required: true,
        uploaded: true,
        fileName: 'Clinical_Notes.pdf',
      },
      {
        id: 'doc-lab-1234',
        name: 'Lab_Results.pdf',
        meta: 'CBC, metabolic panel · Jan 10, 2024',
        required: false,
        uploaded: true,
        fileName: 'Lab_Results.pdf',
      },
    ],
    activity: [
      {
        id: 'a1234-1',
        message: 'Prior authorization created — request submitted to Blue Cross Blue Shield',
        time: 'Jan 10, 2024 · 09:00 AM',
        tone: 'default',
      },
      {
        id: 'a1234-2',
        message: 'Clinical notes and lab results uploaded by Dr. Sarah Johnson',
        time: 'Jan 10, 2024 · 10:30 AM',
        tone: 'default',
      },
      {
        id: 'a1234-3',
        message: 'Prior authorization approved by Blue Cross Blue Shield — auth valid through Feb 1, 2025',
        time: 'Jan 15, 2024 · 02:30 PM',
        tone: 'green',
      },
    ],
  },
  {
    id: 'pa-seed-5824',
    requestNumber: 'PA-2026-005824',
    status: 'pending',
    statusLabel: 'In Review',
    patientName: 'Margaret L. Rivera',
    patientId: 'MR-4821983',
    dateOfBirth: '1968-03-14',
    gender: 'Female',
    memberId: 'MBR-4821983',
    subscriberId: 'SUB-78342',
    groupId: 'GRP-22941',
    payorName: 'BlueCross BlueShield TX',
    payorId: '84980-TX',
    planName: 'Blue Choice PPO Gold',
    prescriberName: 'Dr. Daniel Kim, MD',
    equipmentLabel: 'E1390 — Portable O2 Concentrator',
    serviceCode: 'E1390',
    serviceDescription: 'Oxygen concentrator, portable, 1–6 LPM',
    diagnosisCode: 'J44.1',
    diagnosisDescription: 'COPD with acute exacerbation',
    requestedServiceDate: '2026-07-01',
    submittedDate: '2026-05-21',
    providerName: 'Frisco Home Medical Supply',
    providerNpi: '1234567890',
    ptan: 'TX-DME-20931',
    providerAddress: '5900 Main St Ste 100, Frisco TX 75034',
    orderingPhysician: 'Dr. Daniel Kim, MD',
    faceToFaceDate: '2026-05-12',
    placeOfService: '12 — Home',
    rentalPurchase: 'Rental (monthly)',
    quantityLength: '1 unit / 13 months',
    medicalNecessity:
      'Resubmission with updated ABG and CMN. Patient continues to require portable O2 concentrator for COPD with documented hypoxemia at rest (SpO2 87% on room air). Prior PA PA-2026-004821 returned for missing CMN documentation.',
    urgency: 'urgent',
    documents: [
      {
        id: 'doc-order-5824',
        name: 'Physician_Order.pdf',
        meta: 'Resubmitted order · May 21, 2026 · System',
        required: false,
        uploaded: true,
        fileName: 'Physician_Order.pdf',
      },
      {
        id: 'doc-cmn-5824',
        name: 'Certificate of Medical Necessity (CMN)',
        meta: 'Form 484 — signed by Dr. Kim · May 21, 2026',
        required: true,
        uploaded: true,
        fileName: 'CMN_484_Rivera.pdf',
      },
      {
        id: 'doc-abg-5824',
        name: 'ABG / Oximetry test results',
        meta: 'O2 saturation report — within last 3 months',
        required: true,
        uploaded: false,
      },
      {
        id: 'doc-pft-5824',
        name: 'Pulmonary function test (PFT)',
        meta: 'Spirometry FEV1 42% — Apr 2026',
        required: true,
        uploaded: true,
        fileName: 'PFT_Rivera_Apr2026.pdf',
      },
    ],
    activity: [
      {
        id: 'a5824-1',
        message: 'PA resubmitted — CMN and PFT uploaded by Frisco Home Medical',
        time: 'May 21, 2026 · 10:02 AM',
        tone: 'default',
      },
      {
        id: 'a5824-2',
        message: 'Status set to In Review — payor clinical review in progress',
        time: 'May 21, 2026 · 10:05 AM',
        tone: 'amber',
      },
      {
        id: 'a5824-3',
        message: 'BlueCross BlueShield TX acknowledged receipt of resubmission',
        time: 'May 21, 2026 · 2:30 PM',
        tone: 'default',
      },
    ],
  },
  {
    id: 'pa-seed-4821',
    requestNumber: 'PA-2026-004821',
    status: 'pending',
    statusLabel: 'Pending',
    patientName: 'Margaret L. Rivera',
    patientId: 'MR-4821983',
    dateOfBirth: '1968-03-14',
    gender: 'Female',
    memberId: 'MBR-4821983',
    subscriberId: 'SUB-78342',
    groupId: 'GRP-22941',
    payorName: 'BlueCross BlueShield TX',
    payorId: '84980-TX',
    planName: 'Blue Choice PPO Gold',
    prescriberName: 'Dr. Daniel Kim, MD',
    equipmentLabel: 'E1390 — Portable O2 Concentrator',
    serviceCode: 'E1390',
    serviceDescription: 'Oxygen concentrator, portable, 1–6 LPM',
    diagnosisCode: 'J44.1',
    diagnosisDescription: 'COPD with acute exacerbation',
    requestedServiceDate: '2026-06-10',
    submittedDate: '2026-05-20',
    providerName: 'Frisco Home Medical Supply',
    providerNpi: '1234567890',
    ptan: 'TX-DME-20931',
    providerAddress: '5900 Main St Ste 100, Frisco TX 75034',
    orderingPhysician: 'Dr. Daniel Kim, MD',
    faceToFaceDate: '2026-05-10',
    placeOfService: '12 — Home',
    rentalPurchase: 'Rental (monthly)',
    quantityLength: '1 unit / 13 months',
    medicalNecessity:
      'Patient has severe COPD (FEV1 42% predicted) with resting O2 saturation of 87% on room air confirmed by ABG. Has failed pulmonary rehab. Continuous supplemental O2 therapy is medically necessary per CMS LCD L33797 to maintain SpO2 ≥ 88%.',
    urgency: 'routine',
    documents: [
      {
        id: 'doc-order',
        name: 'Physician_Order.pdf',
        meta: 'Signed order · May 20, 2026 · System',
        required: false,
        uploaded: true,
        fileName: 'Physician_Order.pdf',
      },
      {
        id: 'doc-cmn',
        name: 'Certificate of Medical Necessity (CMN)',
        meta: 'Form 484 for O2 therapy — signed by physician',
        required: true,
        uploaded: false,
      },
      {
        id: 'doc-abg',
        name: 'ABG / Oximetry test results',
        meta: 'O2 saturation report — within last 3 months',
        required: true,
        uploaded: false,
      },
      {
        id: 'doc-pft',
        name: 'Pulmonary function test (PFT)',
        meta: 'Spirometry confirming severity — FEV1/FVC',
        required: true,
        uploaded: false,
      },
      {
        id: 'doc-notes',
        name: 'Clinical / chart notes',
        meta: 'Face-to-face visit notes — within 6 months',
        required: false,
        uploaded: false,
      },
      {
        id: 'doc-ins',
        name: 'Insurance card (front & back)',
        meta: 'Member card image or PDF',
        required: false,
        uploaded: true,
        fileName: 'InsuranceCard_Rivera.pdf',
      },
    ],
    activity: [
      {
        id: 'a1',
        message: 'PA created — Physician_Order.pdf uploaded by system',
        time: 'May 20, 2026 · 09:14 AM',
        tone: 'default',
      },
      {
        id: 'a2',
        message: 'Status set to Pending — awaiting CMN, ABG, and PFT documents',
        time: 'May 20, 2026 · 09:15 AM',
        tone: 'amber',
      },
    ],
  },
  {
    id: 'pa-seed-3107',
    requestNumber: 'PA-2026-003107',
    status: 'approved',
    statusLabel: 'Approved',
    patientName: 'James T. Holloway',
    patientId: 'JH-3107001',
    dateOfBirth: '1955-07-22',
    gender: 'Male',
    memberId: 'MBR-3107001',
    subscriberId: 'SUB-31070',
    groupId: 'GRP-88102',
    payorName: 'Aetna',
    payorId: '60054',
    planName: 'Aetna Choice POS II',
    prescriberName: 'Dr. Sarah Nguyen, MD',
    equipmentLabel: 'E0601 — CPAP Device',
    serviceCode: 'E0601',
    serviceDescription: 'CPAP device with humidifier',
    diagnosisCode: 'G47.33',
    diagnosisDescription: 'Obstructive sleep apnea, severe',
    requestedServiceDate: '2026-05-01',
    submittedDate: '2026-04-15',
    providerName: 'Frisco Home Medical Supply',
    providerNpi: '1234567890',
    ptan: 'TX-DME-20931',
    providerAddress: '5900 Main St Ste 100, Frisco TX 75034',
    orderingPhysician: 'Dr. Sarah Nguyen, MD',
    faceToFaceDate: '2026-04-01',
    placeOfService: '12 — Home',
    rentalPurchase: 'Rental (monthly)',
    quantityLength: '1 unit / 12 months',
    medicalNecessity:
      'Obstructive sleep apnea confirmed by polysomnography (AHI 22, nadir SpO2 84%). Patient reports excessive daytime sleepiness (ESS 14). CPAP therapy with humidifier is medically necessary to reduce cardiovascular risk and improve quality of life per AASM guidelines.',
    urgency: 'routine',
    documents: [
      {
        id: 'doc-order-3107',
        name: 'Physician_Order.pdf',
        meta: 'Signed order · Apr 15, 2026 · Dr. Nguyen',
        required: false,
        uploaded: true,
        fileName: 'Physician_Order_Holloway.pdf',
      },
      {
        id: 'doc-sleep-3107',
        name: 'Sleep study report',
        meta: 'Polysomnography AHI 22 · Mar 2026',
        required: true,
        uploaded: true,
        fileName: 'SleepStudy_Holloway.pdf',
      },
      {
        id: 'doc-notes-3107',
        name: 'Clinical / chart notes',
        meta: 'Face-to-face visit · Apr 1, 2026',
        required: false,
        uploaded: true,
        fileName: 'ChartNotes_Holloway.pdf',
      },
    ],
    activity: [
      {
        id: 'a3107-1',
        message: 'PA submitted to Aetna — all required documents attached',
        time: 'Apr 15, 2026 · 11:20 AM',
        tone: 'default',
      },
      {
        id: 'a3107-2',
        message: 'Aetna clinical review completed',
        time: 'Apr 22, 2026 · 3:45 PM',
        tone: 'default',
      },
      {
        id: 'a3107-3',
        message: 'Prior authorization approved — auth #AET-PA-883412, valid 12 months',
        time: 'Apr 23, 2026 · 9:00 AM',
        tone: 'green',
      },
    ],
  },
  {
    id: 'pa-seed-2540',
    requestNumber: 'PA-2026-002540',
    status: 'denied',
    statusLabel: 'Denied',
    patientName: 'Linda K. Pham',
    patientId: 'LP-2540001',
    dateOfBirth: '1972-11-08',
    gender: 'Female',
    memberId: 'MBR-2540001',
    subscriberId: 'SUB-25400',
    groupId: 'GRP-44120',
    payorName: 'United Healthcare',
    payorId: '87726',
    planName: 'UHC Choice Plus',
    prescriberName: 'Dr. Michael Torres, MD',
    equipmentLabel: 'L1832 — Knee Orthosis',
    serviceCode: 'L1832',
    serviceDescription: 'Knee orthosis, adjustable knee joints, prefabricated',
    diagnosisCode: 'M17.11',
    diagnosisDescription: 'Primary osteoarthritis, right knee',
    requestedServiceDate: '2026-04-20',
    submittedDate: '2026-04-01',
    providerName: 'Frisco Home Medical Supply',
    providerNpi: '1234567890',
    ptan: 'TX-DME-20931',
    providerAddress: '5900 Main St Ste 100, Frisco TX 75034',
    orderingPhysician: 'Dr. Michael Torres, MD',
    faceToFaceDate: '2026-03-15',
    placeOfService: '12 — Home',
    rentalPurchase: 'Purchase',
    quantityLength: '1 unit',
    medicalNecessity:
      'Patient with primary osteoarthritis of the right knee, pain 7/10 with ambulation. Requesting custom-fit knee orthosis for stability and pain reduction during daily activities.',
    urgency: 'routine',
    documents: [
      {
        id: 'doc-order-2540',
        name: 'Physician_Order.pdf',
        meta: 'Signed order · Apr 1, 2026 · Dr. Torres',
        required: false,
        uploaded: true,
        fileName: 'Physician_Order_Pham.pdf',
      },
      {
        id: 'doc-notes-2540',
        name: 'Clinical / chart notes',
        meta: 'Face-to-face visit · Mar 15, 2026',
        required: true,
        uploaded: true,
        fileName: 'ChartNotes_Pham.pdf',
      },
      {
        id: 'doc-xray-2540',
        name: 'Imaging report (X-ray)',
        meta: 'Right knee X-ray · Feb 2026',
        required: true,
        uploaded: true,
        fileName: 'KneeXray_Pham.pdf',
      },
    ],
    activity: [
      {
        id: 'a2540-1',
        message: 'PA submitted to United Healthcare',
        time: 'Apr 1, 2026 · 2:10 PM',
        tone: 'default',
      },
      {
        id: 'a2540-2',
        message: 'Payor requested additional documentation — conservative therapy records',
        time: 'Apr 8, 2026 · 10:30 AM',
        tone: 'amber',
      },
      {
        id: 'a2540-3',
        message:
          'Prior authorization denied — insufficient documentation of 3-month conservative therapy trial (physical therapy, NSAIDs) per UHC medical policy DME.001',
        time: 'Apr 14, 2026 · 4:15 PM',
        tone: 'default',
      },
    ],
  },
  {
    id: 'pa-seed-1988',
    requestNumber: 'PA-2026-001988',
    status: 'pending',
    statusLabel: 'In Review',
    patientName: 'Robert A. Singh',
    patientId: 'RS-1988001',
    dateOfBirth: '1948-02-19',
    gender: 'Male',
    memberId: 'MBR-1988001',
    subscriberId: 'SUB-19880',
    groupId: 'GRP-30217',
    payorName: 'Cigna',
    payorId: '62308',
    planName: 'Cigna Open Access Plus',
    prescriberName: 'Dr. Patricia Walsh, MD',
    equipmentLabel: 'E0260 — Hospital Bed',
    serviceCode: 'E0260',
    serviceDescription: 'Hospital bed, semi-electric with mattress',
    diagnosisCode: 'M62.81',
    diagnosisDescription: 'Muscle weakness (generalized)',
    requestedServiceDate: '2026-05-15',
    submittedDate: '2026-04-28',
    providerName: 'Frisco Home Medical Supply',
    providerNpi: '1234567890',
    ptan: 'TX-DME-20931',
    providerAddress: '5900 Main St Ste 100, Frisco TX 75034',
    orderingPhysician: 'Dr. Patricia Walsh, MD',
    faceToFaceDate: '2026-04-10',
    placeOfService: '12 — Home',
    rentalPurchase: 'Rental (monthly)',
    quantityLength: '1 unit / 6 months',
    medicalNecessity:
      '78-year-old male with progressive muscle weakness secondary to Parkinson\'s disease. Unable to safely transfer from standard bed. Semi-electric hospital bed required for head/foot elevation and caregiver-assisted transfers. Face-to-face evaluation completed Apr 10, 2026.',
    urgency: 'urgent',
    documents: [
      {
        id: 'doc-order-1988',
        name: 'Physician_Order.pdf',
        meta: 'Signed order · Apr 28, 2026 · Dr. Walsh',
        required: false,
        uploaded: true,
        fileName: 'Physician_Order_Singh.pdf',
      },
      {
        id: 'doc-cmn-1988',
        name: 'Certificate of Medical Necessity (CMN)',
        meta: 'Form 484 — hospital bed',
        required: true,
        uploaded: true,
        fileName: 'CMN_484_Singh.pdf',
      },
      {
        id: 'doc-notes-1988',
        name: 'Clinical / chart notes',
        meta: 'Face-to-face visit · Apr 10, 2026',
        required: true,
        uploaded: true,
        fileName: 'ChartNotes_Singh.pdf',
      },
      {
        id: 'doc-hom eval-1988',
        name: 'Home assessment report',
        meta: 'DME home safety evaluation — pending',
        required: true,
        uploaded: false,
      },
    ],
    activity: [
      {
        id: 'a1988-1',
        message: 'PA submitted to Cigna with CMN and clinical notes',
        time: 'Apr 28, 2026 · 8:45 AM',
        tone: 'default',
      },
      {
        id: 'a1988-2',
        message: 'Status set to In Review — Cigna medical director review queued',
        time: 'Apr 29, 2026 · 11:00 AM',
        tone: 'amber',
      },
      {
        id: 'a1988-3',
        message: 'Cigna requested home assessment report — due within 10 business days',
        time: 'May 2, 2026 · 1:20 PM',
        tone: 'amber',
      },
    ],
  },
]
