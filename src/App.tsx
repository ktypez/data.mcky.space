import { lazy, Suspense, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuthStore } from './stores/auth-store'
import { useClientStore } from './stores/client-store'
import { useFilterStore } from './stores/filter-store'
import { useUIStore } from './stores/ui-store'
import { useAuth } from '@clerk/clerk-react'
import { useMotion } from './lib/motion'
import { AuthSync } from './components/AuthSync'
import PageLayout from './components/PageLayout'
import PageHeader from './components/PageHeader'

const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.PageClient })))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const TrashPage = lazy(() => import('./pages/TrashPage'))
const AddEditPage = lazy(() => import('./pages/AddEditPage'))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const NavSidebar = lazy(() => import('./components/NavSidebar'))
const ViewportEffect = lazy(() => import('./components/ViewportEffect'))

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

/** Route-aware header props — reads from stores directly. */
function RouteHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname

  const { isAdmin, isSignedIn, setLoginOpen } = useAuthStore()
  const { search, setSearch } = useFilterStore()
  const viewState = useUIStore((s) => s.viewState)

  const showDetail = viewState.view === 'detail'
  const isList = pathname === '/'
  const isMap = pathname === '/maps'
  const isTrash = pathname === '/trash'
  const isAddEdit = pathname === '/add' || pathname.startsWith('/edit')
  const isDetailRoute = pathname.startsWith('/c/')

  const handleSearchChange = useCallback((v: string) => setSearch(v), [setSearch])
  const handleSearchClear = useCallback(() => setSearch(''), [setSearch])
  const navToAdd = useCallback(() => navigate('/add'), [navigate])

  // Detail view (inside Clients page via viewState)
  if (showDetail || isDetailRoute) {
    return (
      <PageHeader
        variant="detail"
        title="Detail"
        showBack
        onBack={() => {
          useUIStore.getState().closeView()
          if (isDetailRoute) navigate('/')
        }}
      />
    )
  }

  // List view
  if (isList) {
    return (
      <PageHeader
        variant="list"
        search={search}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        showAddButton={isAdmin}
        onAdd={navToAdd}
      />
    )
  }

  // Map view
  if (isMap) {
    return (
      <PageHeader
        variant="map"
        showBack
        onBack={() => navigate('/')}
        search={search}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        onSearchKeyDown={(e) => {
          if (e.key === 'Escape') {
            setSearch('')
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
    )
  }

  // Trash view
  if (isTrash) {
    return (
      <PageHeader
        variant="add-edit"
        title="ถังขยะ"
        showBack
        onBack={() => navigate('/')}
      />
    )
  }

  // Add/Edit view
  if (isAddEdit) {
    return (
      <PageHeader
        variant="add-edit"
        title={pathname.startsWith('/edit') ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}
        showBack
        onBack={() => navigate('/')}
      />
    )
  }

  // Default
  return <PageHeader variant="list" />
}

function App() {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const onSwMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'ASSET_STALE') {
        window.location.reload()
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    return () =>
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
  }, [])

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

  return (
    <Suspense fallback={null}>
      <AuthSync />
      <ViewportEffect />
      <NavSidebar />
      <PageLayout header={<RouteHeader />}>
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
      </PageLayout>
    </Suspense>
  )
}

export default App
