import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { PageClient as Clients } from './pages/Clients'
import ClientDetailPage from './pages/ClientDetailPage'
import MapPage from './pages/MapPage'
import SuggestionsPage from './pages/SuggestionsPage'
import TrashPage from './pages/TrashPage'
import AddEditPage from './pages/AddEditPage'
import { useAuthStore } from './stores/auth-store'
import { useClientStore } from './stores/client-store'
import { useMotion } from './lib/motion'

const LoginModal = lazy(() => import('./components/LoginModal'))

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
  const { loginOpen, setLoginOpen, setAdmin } = useAuthStore()
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

  useEffect(() => {
    if (localStorage.getItem('ezzylist_admin_token')) {
      useAuthStore.getState().checkAuth()
    }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <LoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={() => {
            setAdmin(true)
            // Data already loaded by initialize() on mount; no extra D1 fetch.
          }}
        />
      </Suspense>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Clients /></PageTransition>} />
          <Route path="/maps" element={<PageTransition><MapPage /></PageTransition>} />
          <Route path="/suggestions" element={<PageTransition><SuggestionsPage /></PageTransition>} />
          <Route path="/trash" element={<PageTransition><TrashPage /></PageTransition>} />
          <Route path="/add" element={<PageTransition><AddEditPage /></PageTransition>} />
          <Route path="/edit/:id" element={<PageTransition><AddEditPage /></PageTransition>} />
          <Route path="/c/:id" element={<PageTransition><ClientDetailPage /></PageTransition>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default App
