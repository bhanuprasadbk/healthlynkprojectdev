import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { ThemeProvider } from './contexts/ThemeContext'
import { DashboardProvider } from './contexts/DashboardContext'
import { ChatProvider } from './contexts/ChatContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { EligibilityServiceProvider } from './contexts/EligibilityServiceContext'
import { ToastProvider } from './contexts/ToastContext'
import FullPageLoading from './components/FullPageLoading'
import PublicLayout from './components/PublicLayout'
import PrivateLayout from './components/PrivateLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import ProviderDashboard from './pages/ProviderDashboard'
import PayorConfiguration from './pages/PayorConfiguration'
import CptHcpcConfiguration from './pages/CptHcpcConfiguration'
import ProviderNpiLocation from './pages/ProviderNpiLocation'
import PatientHomeGate from './routes/PatientHomeGate'
import PriorAuthorization from './pages/PriorAuthorization'
import EligibilityResult from './pages/EligibilityResult'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import DashboardSettings from './pages/DashboardSettings'
import ChatPage from './pages/ChatPage'
import Agents from './pages/Agents'
import MarkdownDocs from './pages/MarkdownDocs'
import PatientIntakeAiChat from './pages/PatientIntakeAiChat'
import EligibilityResultAi from './pages/EligibilityResultAi'
import { ROUTES, PATIENT_NAV } from './routes/routeMap'

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullPageLoading />
  return <Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />
}

/** `/` always opens patient AI intake. */
function HomeEntry() {
  return <Navigate to={ROUTES.PATIENT_AI_INTAKE} replace />
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullPageLoading />
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />
  return <Login />
}

function App() {
  return (
    <ThemeProvider>
      <DashboardProvider>
        <ChatProvider>
          <EligibilityServiceProvider>
            <ToastProvider>
              <BrowserRouter basename="/">
                <AuthProvider>
                  <Routes>
                <Route path="prior_auth" element={<Navigate to={ROUTES.PRIOR_AUTH} replace />} />
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomeEntry />} />
                  <Route path="patient" element={<PatientHomeGate />} />
                  <Route path={ROUTES.PATIENT_AI_INTAKE.slice(1)} element={<PatientIntakeAiChat />} />
                  <Route path={ROUTES.PATIENT_AI_RESULT.slice(1)} element={<EligibilityResultAi />} />
                  <Route path="login" element={<LoginRoute />} />
                  <Route path="docs/*" element={<MarkdownDocs />} />
                  <Route path="l" element={<Navigate to="/login" replace />} />
                  <Route
                    path="p/i"
                    element={<Navigate to="/patient" replace state={PATIENT_NAV.intake} />}
                  />
                  <Route
                    path="p/e"
                    element={<Navigate to="/patient" replace state={PATIENT_NAV.eligibility} />}
                  />
                  {/* Legacy obfuscated paths → readable URLs */}
                  <Route path="app" element={<Navigate to="/dashboard" replace />} />
                  <Route path="app/x1" element={<Navigate to="/payors" replace />} />
                  <Route path="app/x2" element={<Navigate to="/cpt-hcpc" replace />} />
                  <Route path="app/x3" element={<Navigate to={ROUTES.PRIOR_AUTH} replace />} />
                  <Route path="prior_auth" element={<Navigate to={ROUTES.PRIOR_AUTH} replace />} />
                  <Route path="d" element={<Navigate to="/dashboard" replace />} />
                  <Route path="app/x5" element={<Navigate to="/settings" replace />} />
                  <Route path="app/x6" element={<Navigate to="/notifications" replace />} />
                  <Route path="app/x7" element={<Navigate to="/dashboard-settings" replace />} />
                  <Route path="app/x8" element={<Navigate to="/chat" replace />} />
                  <Route path="app/x9" element={<Navigate to="/agents" replace />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<PrivateLayout />}>
                    <Route path="dashboard" element={<ProviderDashboard />} />
                    <Route path="payors" element={<PayorConfiguration />} />
                    <Route
                      path="provider-configuration/npi-location"
                      element={<ProviderNpiLocation />}
                    />
                    <Route path="cpt-hcpc" element={<CptHcpcConfiguration />} />
                    <Route path="prior-auth" element={<PriorAuthorization />} />
                    <Route
                      path="provider/patient-intake"
                      element={<PatientIntakeAiChat providerMode />}
                    />
                    <Route
                      path="provider/eligibility-result"
                      element={<EligibilityResultAi providerMode />}
                    />
                    <Route path="settings" element={<Settings />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="dashboard-settings" element={<DashboardSettings />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="agents" element={<Agents />} />
                  </Route>
                </Route>

                <Route path="*" element={<RootRedirect />} />
                  </Routes>
                </AuthProvider>
              </BrowserRouter>
            </ToastProvider>
          </EligibilityServiceProvider>
        </ChatProvider>
      </DashboardProvider>
    </ThemeProvider>
  )
}

export default App
