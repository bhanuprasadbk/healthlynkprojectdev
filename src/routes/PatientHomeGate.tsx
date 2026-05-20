import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import FullPageLoading from '../components/FullPageLoading'
import PatientFlow from '../pages/PatientFlow'
import { ROUTES } from './routeMap'

/**
 * `/` — public patient flow (guest) or staff opening intake/eligibility (`patientFlow` in state).
 * Signed-in users on `/` without patient intent go to the dashboard.
 */
export default function PatientHomeGate() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const patientFlow = (location.state as { patientFlow?: 'intake' | 'eligibility' } | null)
    ?.patientFlow

  if (isLoading) return <FullPageLoading />

  if (isAuthenticated && patientFlow == null) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <PatientFlow />
}
