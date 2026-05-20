import { Outlet } from 'react-router-dom'

/**
 * Minimal shell for public routes (patient flow, login) — no sidebar or app chrome.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  )
}
