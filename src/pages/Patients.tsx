import { useState, ChangeEvent, DragEvent } from 'react'
import { 
  Users, 
  Search, 
  Loader2, 
  MapPin, 
  Phone, 
  Printer, 
  Building, 
  CheckCircle2, 
  AlertCircle,
  User,
  FileText,
  Calendar,
  Mail,
  FileImage,
  X,
  Upload
} from 'lucide-react'
import Input from '../components/forms/Input'
import Select from '../components/forms/Select'
import Button from '../components/forms/Button'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import { initialPayors } from '../data/payorData'
import { uploadIntegrationFile } from '../services/cloudinaryUpload'
import { analyzeHealthInsuranceCardFromUrl } from '../services/azureHealthInsuranceCardAnalyze'

interface Physician {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  postal: string
  organizationName?: string
  phone?: string
  fax?: string
}

interface PatientData {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  phone: string
  email: string
  zipCode: string
  payor: string
  subscriberID: string
  groupNumber: string
  policyNumber: string
}

const Patients = () => {
  // Patient Details State
  const [patientData, setPatientData] = useState<PatientData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    zipCode: '',
    payor: '',
    subscriberID: '',
    groupNumber: '',
    policyNumber: '',
  })
  const [patientErrors, setPatientErrors] = useState<{ [key: string]: string }>({})
  const [patientDetailsComplete, setPatientDetailsComplete] = useState<boolean>(false)
  
  // Insurance Card Upload State
  const [insuranceCardFile, setInsuranceCardFile] = useState<File | null>(null)
  const [isProcessingCard, setIsProcessingCard] = useState<boolean>(false)
  const [cardProcessed, setCardProcessed] = useState<boolean>(false)
  const [dragActive, setDragActive] = useState<boolean>(false)
  const [showInsuranceCardModal, setShowInsuranceCardModal] = useState<boolean>(false)

  // Physician Search State
  const [physicianSearch, setPhysicianSearch] = useState({
    firstName: '',
    lastName: '',
    postalCode: '',
  })
  const [physicianResults, setPhysicianResults] = useState<Physician[]>([])
  const [selectedPhysician, setSelectedPhysician] = useState<Physician | null>(null)
  const [isSearchingPhysician, setIsSearchingPhysician] = useState<boolean>(false)
  const [physicianSearchError, setPhysicianSearchError] = useState<string>('')
  const [requestPaperwork, setRequestPaperwork] = useState<boolean>(false)
  const [showToast, setShowToast] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string>('')

  // Prepare payor options
  const payorOptions = initialPayors
    .filter((p) => p.status === 'active')
    .map((p) => ({ value: p.payorName, label: p.payorName }))

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ]

  const handlePatientInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPatientData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (patientErrors[name]) {
      setPatientErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validatePatientDetails = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!patientData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!patientData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!patientData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required'
    } else {
      const dob = new Date(patientData.dateOfBirth)
      const today = new Date()
      if (dob > today) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future'
      }
    }
    if (!patientData.gender) {
      newErrors.gender = 'Gender is required'
    }
    if (!patientData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }
    if (!patientData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!patientData.payor) {
      newErrors.payor = 'Payor is required'
    }
    if (!patientData.subscriberID.trim()) {
      newErrors.subscriberID = 'Subscriber ID is required'
    }

    setPatientErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSavePatientDetails = () => {
    if (validatePatientDetails()) {
      setPatientDetailsComplete(true)
      setToastMessage('Patient details saved successfully! You can now search for physicians.')
      setShowToast(true)
    } else {
      setToastMessage('Please fix the errors before proceeding')
      setShowToast(true)
    }
  }

  // Insurance Card Processing Functions
  const processInsuranceCard = async (fileUrl: string) => {
    setCardProcessed(false)

    try {
      console.log('Insurance card Cloudinary URL:', fileUrl)

      await analyzeHealthInsuranceCardFromUrl(fileUrl)

      // TODO: remove — placeholder demo data until your API returns real fields from `fileUrl`
      const activePayors = initialPayors.filter((p) => p.status === 'active')
      const randomPayor = activePayors[Math.floor(Math.random() * activePayors.length)]

      const extractedData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15',
        gender: 'male',
        zipCode: '12345',
        phone: '555-123-4567',
        email: 'john.doe@example.com',
        payor: randomPayor?.payorName || 'Blue Cross Blue Shield',
        subscriberID: 'SUB' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
        groupNumber: 'GRP' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
        policyNumber: 'POL' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
      }

      // Populate form with extracted data
      setPatientData((prev) => ({
        ...prev,
        firstName: extractedData.firstName,
        lastName: extractedData.lastName,
        dateOfBirth: extractedData.dateOfBirth,
        gender: extractedData.gender,
        zipCode: extractedData.zipCode,
        phone: extractedData.phone,
        email: extractedData.email,
        payor: extractedData.payor,
        subscriberID: extractedData.subscriberID,
        groupNumber: extractedData.groupNumber,
        policyNumber: extractedData.policyNumber,
      }))

      setCardProcessed(true)

      // Close modal after successful processing
      setTimeout(() => {
        setShowInsuranceCardModal(false)
      }, 1500)
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

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
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
  }

  const handlePhysicianSearchChange = (field: string, value: string) => {
    setPhysicianSearch((prev) => ({
      ...prev,
      [field]: value,
    }))
    setPhysicianSearchError('')
  }

  // Physician search API function
  const searchPhysician = async () => {
    // Validate search fields
    if (!physicianSearch.firstName.trim() || !physicianSearch.lastName.trim() || !physicianSearch.postalCode.trim()) {
      setPhysicianSearchError('First Name, Last Name, and Postal Code are required')
      return
    }

    setIsSearchingPhysician(true)
    setPhysicianSearchError('')
    setPhysicianResults([])
    setSelectedPhysician(null)

    try {
      // Simulate API call to physician search service
      // In a real application, this would call an actual API endpoint
      // Example:
      // const response = await fetch('/api/physician/search', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     firstName: physicianSearch.firstName,
      //     lastName: physicianSearch.lastName,
      //     postalCode: physicianSearch.postalCode,
      //   }),
      // })
      // const data = await response.json()
      
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock response data - in real app, this would come from the API
      const mockResults: Physician[] = [
        {
          firstName: physicianSearch.firstName,
          lastName: physicianSearch.lastName,
          address: '123 Medical Center Drive',
          city: 'Frisco',
          state: 'TX',
          postal: physicianSearch.postalCode,
          organizationName: 'Family Medicine Clinic',
          phone: '972-377-1490',
          fax: '972-377-1491',
        },
        {
          firstName: physicianSearch.firstName,
          lastName: physicianSearch.lastName,
          address: '456 Healthcare Boulevard',
          city: 'Dallas',
          state: 'TX',
          postal: physicianSearch.postalCode,
          organizationName: 'Primary Care Associates',
          phone: '214-555-1234',
          fax: '214-555-1235',
        },
      ]

      setPhysicianResults(mockResults)
      
      if (mockResults.length === 0) {
        setPhysicianSearchError('No physicians found. Please try different search criteria.')
      } else {
        setToastMessage(`Found ${mockResults.length} physician(s)`)
        setShowToast(true)
      }
    } catch (error) {
      setPhysicianSearchError('Failed to search for physicians. Please try again.')
      setToastMessage('Failed to search for physicians. Please try again.')
      setShowToast(true)
    } finally {
      setIsSearchingPhysician(false)
    }
  }

  const handlePhysicianSelect = (physician: Physician) => {
    setSelectedPhysician(physician)
    setToastMessage(`Selected physician: ${physician.firstName} ${physician.lastName}`)
    setShowToast(true)
  }

  const handleSubmitPaperworkRequest = () => {
    if (!selectedPhysician) {
      setToastMessage('Please select a physician first')
      setShowToast(true)
      return
    }

    if (!requestPaperwork) {
      setToastMessage('Please check "Request paperwork" to proceed')
      setShowToast(true)
      return
    }

    // In a real application, this would call an API to automate prescription request
    // Example:
    // await fetch('/api/request-paperwork', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     physician: selectedPhysician,
    //     requestType: 'prescription',
    //   }),
    // })

    setToastMessage('Paperwork request submitted successfully! Prescription request will be automated.')
    setShowToast(true)
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Patients
          </h1>
          <p className="text-gray-600 mt-1">
            Enter patient details and search for physicians to request paperwork
          </p>
        </div>

        {/* Patient Details Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Patient Details
              </h2>
              <p className="text-sm text-gray-600">
                All fields marked with an asterisk (*) are required. Complete this section before searching for physicians.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowInsuranceCardModal(true)}
              className="flex items-center gap-2"
            >
              <Upload size={18} />
              Upload Insurance Card
            </Button>
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  value={patientData.firstName}
                  onChange={handlePatientInputChange}
                  error={patientErrors.firstName}
                  required
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={patientData.lastName}
                  onChange={handlePatientInputChange}
                  error={patientErrors.lastName}
                  required
                />
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <Calendar
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    style={{ top: 'calc(50% + 12px)' }}
                  />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={patientData.dateOfBirth}
                    onChange={handlePatientInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      patientErrors.dateOfBirth
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    }`}
                  />
                  {patientErrors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{patientErrors.dateOfBirth}</p>
                  )}
                </div>
                <Select
                  label="Gender"
                  name="gender"
                  value={patientData.gender}
                  onChange={handlePatientInputChange}
                  options={genderOptions}
                  placeholder="Select gender"
                  error={patientErrors.gender}
                  required
                />
                <Input
                  label="Zip Code"
                  name="zipCode"
                  value={patientData.zipCode}
                  onChange={handlePatientInputChange}
                  error={patientErrors.zipCode}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <Phone
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    style={{ top: 'calc(50% + 12px)' }}
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={patientData.phone}
                    onChange={handlePatientInputChange}
                    placeholder="Enter phone number"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      patientErrors.phone
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    }`}
                  />
                  {patientErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{patientErrors.phone}</p>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    style={{ top: 'calc(50% + 12px)' }}
                  />
                  <input
                    type="email"
                    name="email"
                    value={patientData.email}
                    onChange={handlePatientInputChange}
                    placeholder="Enter email address"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      patientErrors.email
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    }`}
                  />
                  {patientErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{patientErrors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Insurance Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Payor"
                  name="payor"
                  value={patientData.payor}
                  onChange={handlePatientInputChange}
                  options={payorOptions}
                  placeholder="Select payor"
                  error={patientErrors.payor}
                  required
                />
                <Input
                  label="Subscriber ID"
                  name="subscriberID"
                  value={patientData.subscriberID}
                  onChange={handlePatientInputChange}
                  error={patientErrors.subscriberID}
                  required
                />
                <Input
                  label="Group Number"
                  name="groupNumber"
                  value={patientData.groupNumber}
                  onChange={handlePatientInputChange}
                  error={patientErrors.groupNumber}
                />
                <Input
                  label="Policy Number"
                  name="policyNumber"
                  value={patientData.policyNumber}
                  onChange={handlePatientInputChange}
                  error={patientErrors.policyNumber}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="border-t border-gray-200 pt-6">
              <Button
                type="button"
                variant="primary"
                onClick={handleSavePatientDetails}
                className="flex items-center gap-2"
              >
                {patientDetailsComplete ? (
                  <>
                    <CheckCircle2 size={16} />
                    Patient Details Saved
                  </>
                ) : (
                  'Save Patient Details'
                )}
              </Button>
              {patientDetailsComplete && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Patient details saved. You can now proceed to search for physicians.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Physician Search Section */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 ${!patientDetailsComplete ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Physician Information
            </h2>
            <p className="text-sm text-gray-600">
              {!patientDetailsComplete 
                ? 'Please complete Patient Details above before searching for physicians.'
                : 'Enter physician information to search for available doctors. All fields are required.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              label="First Name"
              name="physicianFirstName"
              value={physicianSearch.firstName}
              onChange={(e) => handlePhysicianSearchChange('firstName', e.target.value)}
              placeholder="Enter first name"
              required
            />
            <Input
              label="Last Name"
              name="physicianLastName"
              value={physicianSearch.lastName}
              onChange={(e) => handlePhysicianSearchChange('lastName', e.target.value)}
              placeholder="Enter last name"
              required
            />
            <Input
              label="Postal Code"
              name="physicianPostalCode"
              value={physicianSearch.postalCode}
              onChange={(e) => handlePhysicianSearchChange('postalCode', e.target.value)}
              placeholder="Enter postal code"
              required
            />
          </div>

          {physicianSearchError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle size={20} className="text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{physicianSearchError}</p>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            onClick={searchPhysician}
            disabled={isSearchingPhysician || !patientDetailsComplete}
            className="flex items-center gap-2"
          >
            {isSearchingPhysician ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={16} />
                Search Physicians
              </>
            )}
          </Button>
        </div>

        {/* Physician Results Section */}
        {physicianResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Search Results
              </h2>
              <p className="text-sm text-gray-600">
                {physicianResults.length} physician(s) found. Select one to proceed.
              </p>
            </div>

            <div className="space-y-4">
              {physicianResults.map((physician, index) => {
                const isSelected = selectedPhysician === physician
                return (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => handlePhysicianSelect(physician)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-primary-600' : 'bg-gray-100'
                          }`}>
                            <User size={20} className={isSelected ? 'text-white' : 'text-gray-600'} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {physician.firstName} {physician.lastName}
                            </h3>
                            {physician.organizationName && (
                              <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                <Building size={14} />
                                <span>{physician.organizationName}</span>
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle2 size={20} className="text-primary-600 flex-shrink-0" />
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="flex items-start gap-2">
                            <MapPin size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                            <div className="text-sm text-gray-700">
                              <p className="font-medium">{physician.address}</p>
                              <p>{physician.city}, {physician.state} {physician.postal}</p>
                            </div>
                          </div>

                          {physician.phone && (
                            <div className="flex items-center gap-2">
                              <Phone size={16} className="text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{physician.phone}</span>
                            </div>
                          )}

                          {physician.fax && (
                            <div className="flex items-center gap-2">
                              <Printer size={16} className="text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{physician.fax}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Selected Physician and Paperwork Request Section */}
        {selectedPhysician && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Selected Physician
              </h2>
              <p className="text-sm text-gray-600">
                Review the selected physician information and request paperwork if needed.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedPhysician.firstName} {selectedPhysician.lastName}
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    {selectedPhysician.organizationName && (
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-gray-400" />
                        <span>{selectedPhysician.organizationName}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>
                        {selectedPhysician.address}, {selectedPhysician.city}, {selectedPhysician.state} {selectedPhysician.postal}
                      </span>
                    </div>
                    {selectedPhysician.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span>{selectedPhysician.phone}</span>
                      </div>
                    )}
                    {selectedPhysician.fax && (
                      <div className="flex items-center gap-2">
                        <Printer size={14} className="text-gray-400" />
                        <span>{selectedPhysician.fax}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestPaperwork}
                    onChange={(e) => setRequestPaperwork(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Request paperwork
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Automate prescription request and medical records coordination with the selected physician
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleSubmitPaperworkRequest}
                disabled={!requestPaperwork}
                className="flex items-center gap-2"
              >
                <FileText size={16} />
                Submit Paperwork Request
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {physicianResults.length === 0 && !isSearchingPhysician && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <Users size={40} className="text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Physicians Selected
              </h3>
              <p className="text-gray-600 max-w-md">
                Search for a physician using the form above to get started. Once you find and select a physician, 
                you can request paperwork for prescriptions and medical records.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />

      {/* Insurance Card Upload Modal */}
      <Modal
        isOpen={showInsuranceCardModal}
        onClose={() => {
          if (!isProcessingCard) {
            setShowInsuranceCardModal(false)
          }
        }}
        title="Upload Insurance Card"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a photo of your insurance card and we'll automatically extract the information to populate the Patient Details fields.
          </p>
          
          {!insuranceCardFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <FileImage
                size={48}
                className={`mx-auto mb-4 ${
                  dragActive ? 'text-primary-500' : 'text-gray-400'
                }`}
              />
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium text-primary-600">Click to upload</span>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-gray-500 mb-4">
                JPG, PNG, PDF (max. 10MB)
              </p>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleInsuranceCardUpload}
                className="hidden"
                id="insurance-card-upload-modal"
                disabled={isProcessingCard}
              />
              <label htmlFor="insurance-card-upload-modal" className="inline-block">
                <button
                  type="button"
                  disabled={isProcessingCard}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingCard ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Select Insurance Card'
                  )}
                </button>
              </label>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    {isProcessingCard ? (
                      <Loader2 size={24} className="text-primary-600 animate-spin" />
                    ) : cardProcessed ? (
                      <CheckCircle2 size={24} className="text-green-600" />
                    ) : (
                      <FileImage size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {insuranceCardFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isProcessingCard
                        ? 'Processing with AI...'
                        : cardProcessed
                        ? 'Card processed successfully. Patient Details fields have been populated.'
                        : 'Ready to process'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveInsuranceCard}
                  disabled={isProcessingCard}
                  className="ml-3 p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Remove card"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {cardProcessed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle2 size={20} className="text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Insurance card processed successfully!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Patient Details fields have been automatically populated. You can review and edit them as needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
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

export default Patients
