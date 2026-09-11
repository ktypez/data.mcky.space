import { lazy, Suspense } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/auth-store'
import { useAuth } from '@clerk/clerk-react'
import { AuthSync } from './components/AuthSync'
import { Loading } from './components/Loading'

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const V3App = lazy(() => import('./v3/V3App'))
const DetailLab = lazy(() => import('./__design_lab/detail/lab/DetailLabApp'))

function App() {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  const { loginOpen } = useAuthStore()
  const wantsLogin = location.pathname === '/login' || loginOpen

  // Don't block first paint on Clerk: render the guest shell immediately and
  // let AuthSync flip admin state when the session resolves. Only the login
  // decision waits for isLoaded (to avoid flashing the login page).
  if (wantsLogin && isLoaded && !isSignedIn) {
    return <Login />
  }

  // Detail Lab — 5 detail variations
  if (location.pathname.startsWith('/__design_lab/detail')) {
    return (
      <Suspense fallback={<Loading />}>
        <DetailLab />
      </Suspense>
    )
  }

  // /v3 alias → redirect to main /
  if (location.pathname.startsWith('/v3')) {
    const to = location.pathname.replace(/^\/v3/, '') || '/'
    return <Navigate to={to + location.search} replace />
  }

  // V3 — main at /
  return (
    <Suspense fallback={<Loading />}>
      <AuthSync />
      <V3App />
    </Suspense>
  )
}

export default App
