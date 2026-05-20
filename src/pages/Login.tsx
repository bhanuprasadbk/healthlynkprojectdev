import { type CSSProperties, FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useTheme } from '../contexts/ThemeContext'
import { ROUTES } from '../routes/routeMap'
import loginBgPhoto from '../assets/images/login-bg.jpg'

type LocationState = { from?: { pathname?: string } }

export default function Login() {
  const { theme } = useTheme()
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | undefined

  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { colors, isDarkMode } = theme
  const { primary: p, background: bg } = colors
  const meshA = isDarkMode ? 16 : 12
  const meshB = isDarkMode ? 12 : 8
  const meshC = isDarkMode ? 14 : 10
  const dotColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'

  const loginShellStyle = {
    '--hl-primary': colors.primary,
    '--hl-btn': colors.buttonPrimary,
    '--hl-btn-hover': colors.buttonPrimaryHover,
    backgroundColor: bg,
  } as CSSProperties

  /** Darkens / balances the photo before grading (reads better behind UI). */
  const loginPhotoStyle = {
    backgroundImage: `url(${loginBgPhoto})`,
    filter: isDarkMode
      ? 'brightness(0.4) contrast(1.1) saturate(0.88)'
      : 'brightness(0.82) contrast(1.05) saturate(0.92)',
  } as CSSProperties

  /** Vignette + directional grade so the image works in light and dark themes. */
  const loginGradeStyle = {
    backgroundImage: isDarkMode
      ? [
          'radial-gradient(ellipse 88% 72% at 50% 50%, transparent 22%, rgba(0,0,0,0.58) 100%)',
          'radial-gradient(ellipse 130% 60% at 50% -5%, rgba(0,0,0,0.55) 0%, transparent 48%)',
          `linear-gradient(175deg, color-mix(in srgb, rgb(15 23 42) 82%, transparent) 0%, color-mix(in srgb, rgb(15 23 42) 32%, transparent) 45%, color-mix(in srgb, ${p} 26%, rgb(15 23 42)) 100%)`,
        ].join(', ')
      : [
          'radial-gradient(ellipse 95% 75% at 50% 55%, transparent 35%, rgba(15,23,42,0.14) 100%)',
          `linear-gradient(188deg, color-mix(in srgb, ${bg} 78%, white) 0%, color-mix(in srgb, ${bg} 28%, transparent) 44%, color-mix(in srgb, rgb(15 23 42) 14%, transparent) 100%)`,
          `linear-gradient(to top, color-mix(in srgb, ${p} 20%, transparent) 0%, transparent 40%)`,
        ].join(', '),
  } as CSSProperties

  /** Texture + soft primary glow (grading layer does most of the masking). */
  const loginOverlayStyle = {
    backgroundImage: [
      `radial-gradient(${dotColor} 0.75px, transparent 0.75px)`,
      `radial-gradient(ellipse 100% 65% at 12% 18%, color-mix(in srgb, ${p} ${meshA}%, transparent) 0%, transparent 58%)`,
      `radial-gradient(ellipse 85% 55% at 88% 12%, color-mix(in srgb, ${p} ${meshB}%, transparent) 0%, transparent 52%)`,
      `radial-gradient(ellipse 78% 52% at 48% 102%, color-mix(in srgb, ${p} ${meshC}%, transparent) 0%, transparent 55%)`,
      isDarkMode
        ? `linear-gradient(180deg, color-mix(in srgb, ${p} 8%, transparent) 0%, transparent 38%)`
        : `linear-gradient(158deg, color-mix(in srgb, ${bg} 42%, transparent) 0%, transparent 52%, color-mix(in srgb, ${p} 10%, transparent) 100%)`,
    ].join(', '),
    backgroundSize: '26px 26px, auto, auto, auto, auto',
    backgroundPosition: '0 0, center, center, center, center',
    backgroundRepeat: 'repeat, no-repeat, no-repeat, no-repeat, no-repeat',
  } as CSSProperties

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await login(userId, password)
      if (!result.ok) {
        const message = result.error ?? 'Sign in failed.'
        setError(message)
        showToast(message, { type: 'error', duration: 5000 })
        return
      }
      showToast('Signed in successfully.', { type: 'success' })
      const dest = state?.from?.pathname && state.from.pathname !== ROUTES.LOGIN
        ? state.from.pathname
        : ROUTES.DASHBOARD
      navigate(dest, { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6"
      style={loginShellStyle}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={loginPhotoStyle}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={loginGradeStyle} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={loginOverlayStyle} />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            {theme.logo ? (
              <img
                src={theme.logo}
                alt="Health Lynk"
                className="h-11 w-auto max-w-[min(100%,280px)] object-contain sm:h-12"
              />
            ) : (
              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: theme.colors.primary }}
              >
                Health Lynk
              </h1>
            )}
          </div>
          <h2
            className={`text-2xl font-semibold tracking-tight sm:text-3xl ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            Sign in
          </h2>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Use your credentials to access the workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="userId" className="mb-1.5 block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  id="userId"
                  name="userId"
                  type="text"
                  autoComplete="username"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[var(--hl-primary)] focus:bg-white focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--hl-primary)_22%,transparent)]"
                  placeholder="Enter your username"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[var(--hl-primary)] focus:bg-white focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--hl-primary)_22%,transparent)]"
                  placeholder="••••••••"
                  disabled={submitting}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition [background-color:var(--hl-btn)] [box-shadow:0_4px_14px_-3px_color-mix(in_srgb,var(--hl-btn)_35%,transparent)] hover:[background-color:var(--hl-btn-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--hl-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-white px-2 text-slate-400">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--hl-primary)_30%,transparent)] disabled:opacity-60"
          >
            Single sign-on (SSO)
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">SSO integration can be wired here.</p>
        </div>

        <p className={`mt-8 text-center text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Protected areas require authentication. Patient intake links stay public.
        </p>
      </div>
    </div>
  )
}
