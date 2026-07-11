import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PageClient as Clients } from './pages/Clients'
import ClientDetailPage from './pages/ClientDetailPage'
import MapPage from './pages/MapPage'
import SuggestionsPage from './pages/SuggestionsPage'
import TrashPage from './pages/TrashPage'
import AddEditPage from './pages/AddEditPage'
import { useAuthStore } from './stores/auth-store'
import { useClientStore } from './stores/client-store'

const LoginModal = lazy(() => import('./components/LoginModal'))

function App() {
  const { loginOpen, setLoginOpen, setAdmin } = useAuthStore()

  useEffect(() => {
    if ('serviceWorker' in navigator && !localStorage.getItem('sw_killed')) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
        localStorage.setItem('sw_killed', 'true')
      })
    }
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
            useClientStore.getState().refresh()
          }}
        />
      </Suspense>
      <Routes>
        <Route path="/" element={<Clients />} />
        <Route path="/maps" element={<MapPage />} />
        <Route path="/suggestions" element={<SuggestionsPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/add" element={<AddEditPage />} />
        <Route path="/edit/:id" element={<AddEditPage />} />
        <Route path="/c/:id" element={<ClientDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
