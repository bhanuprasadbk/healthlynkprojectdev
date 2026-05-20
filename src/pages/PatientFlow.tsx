import { useLocation } from 'react-router-dom'
import PatientIntake from './PatientIntake'
import EligibilityResult from './EligibilityResult'

/**
 * Intake vs eligibility at the same URL (`/`) using location state.
 */
export default function PatientFlow() {
  const location = useLocation()
  const flow = (location.state as { patientFlow?: 'intake' | 'eligibility' } | null)?.patientFlow

  if (flow === 'eligibility') {
    return <EligibilityResult />
  }

  return <PatientIntake />
}
