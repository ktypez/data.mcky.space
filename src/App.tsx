import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuthStore } from './stores/auth-store'
import { useAuth } from '@clerk/clerk-react'
import { useMotion } from './lib/motion'
import { AuthSync } from './components/AuthSync'

const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.PageClient })))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const TrashPage = lazy(() => import('./pages/TrashPage'))
const AddEditPage = lazy(() => import('./pages/AddEditPage'))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))

function PageTransition({ children }: { children: React.ReactNode }) {
  const { slideUp, spring } = useMotion()
  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={spring}
    >
      {children}
    </motion.div>
  )
}

function App() {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  useEffect(() => {
    // Self-heal: a stale service-worker-detected chunk failure means the
    // running bundle is from an older deploy. Hard-reload to pick up the
    // current entry bundle (the SW triggers this when an asset import 404s).
    const onSwMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'ASSET_STALE') {
        window.location.reload()
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    return () =>
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
  }, [])

  // Don't gate the app; we let any route render and rely on client-side checks.
  // Pages that need admin access will prompt the sign-in modal.
  // If the user explicitly asks to sign in ("/login" route), render the Clerk
  // sign-in page. (Existing visitors keep viewing the guests-crud content.)
  const { loginOpen } = useAuthStore()
  const wantsLogin = location.pathname === '/login' || loginOpen

  if (!isLoaded) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 500,
          color: 'var(--muted)',
        }}
      >
        กำลังโหลด...
      </div>
    )
  }

  if (wantsLogin && !isSignedIn) {
    return <Login />
  }

  // After we know the user is signed in or a guest (not asking to sign in),
  // route normally.
  return (
    <Suspense fallback={null}>
      <AuthSync />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PageTransition><Clients /></PageTransition>} />
          <Route path="/maps" element={<PageTransition><MapPage /></PageTransition>} />
          <Route path="/trash" element={<PageTransition><TrashPage /></PageTransition>} />
          <Route path="/add" element={<PageTransition><AddEditPage /></PageTransition>} />
          <Route path="/edit/:id" element={<PageTransition><AddEditPage /></PageTransition>} />
          <Route path="/c/:id" element={<PageTransition><ClientDetailPage /></PageTransition>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}

export default App
