import { lazy, Suspense, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuthStore } from './stores/auth-store'
import { useFilterStore } from './stores/filter-store'
import { useUIStore } from './stores/ui-store'
import { useAuth } from '@clerk/clerk-react'
import { useMotion } from './lib/motion'
import { AuthSync } from './components/AuthSync'
import PageLayout from './components/PageLayout'
import PageHeader from './components/PageHeader'

const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.PageClient })))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const TrashPage = lazy(() => import('./pages/TrashPage'))
const AddEditPage = lazy(() => import('./pages/AddEditPage'))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const NavSidebar = lazy(() => import('./components/NavSidebar'))
// V3 — main at / (locked hybrid Catalog F + Detail A + Add D + Trash E)
const V3App = lazy(() => import('./v3/V3App'))
const DetailLab = lazy(() => import('./__design_lab/detail/lab/DetailLabApp'))


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

  const { isAdmin } = useAuthStore()
  const { search, setSearch } = useFilterStore()
  const viewState = useUIStore((s) => s.viewState)

  const showDetail = viewState.view === 'detail'
  const isList = pathname === '/old' || pathname === '/old/'
  const isTrash = pathname === '/old/trash'
  const isAddEdit = pathname === '/old/add' || pathname.startsWith('/old/edit')
  const isDetailRoute = pathname.startsWith('/old/c/')

  const handleSearchChange = useCallback((v: string) => setSearch(v), [setSearch])
  const handleSearchClear = useCallback(() => setSearch(''), [setSearch])
  const navToAdd = useCallback(() => navigate('/old/add'), [navigate])

  // Detail view (inside Clients page via viewState)
  if (showDetail || isDetailRoute) {
    return (
      <PageHeader
        variant="detail"
        title="Detail"
        showBack
        onBack={() => {
          useUIStore.getState().closeView()
          if (isDetailRoute) navigate('/old')
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

  // Trash view
  if (isTrash) {
    return (
      <PageHeader
        variant="add-edit"
        title="ถังขยะ"
        showBack
        onBack={() => navigate('/old')}
      />
    )
  }

  // Add/Edit view
  if (isAddEdit) {
    return (
      <PageHeader
        variant="add-edit"
        title={pathname.startsWith('/old/edit') ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}
        showBack
        onBack={() => navigate('/old')}
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

  // Detail Lab — 5 detail variations
  if (location.pathname.startsWith('/__design_lab/detail')) {
    return (
      <Suspense fallback={null}>
        <DetailLab />
      </Suspense>
    )
  }

  // Classic → /old (moved from /)
  if (location.pathname.startsWith('/old')) {
    return (
      <Suspense fallback={null}>
        <AuthSync />
        <NavSidebar />
        <PageLayout header={<RouteHeader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/login" element={<Login />} />
              <Route path="/old" element={<PageTransition><Clients /></PageTransition>} />
              <Route path="/old/trash" element={<PageTransition><TrashPage /></PageTransition>} />
              <Route path="/old/add" element={<PageTransition><AddEditPage /></PageTransition>} />
              <Route path="/old/edit/:id" element={<PageTransition><AddEditPage /></PageTransition>} />
              <Route path="/old/c/:id" element={<PageTransition><ClientDetailPage /></PageTransition>} />
              <Route path="/old/maps" element={<Navigate to="/old" replace />} />
              <Route path="*" element={<Navigate to="/old" replace />} />
            </Routes>
          </AnimatePresence>
        </PageLayout>
      </Suspense>
    )
  }

  // /v3 alias → redirect to main /
  if (location.pathname.startsWith('/v3')) {
    const to = location.pathname.replace(/^\/v3/, '') || '/'
    return <Navigate to={to + location.search} replace />
  }

  // V3 — now main at /
  return (
    <Suspense fallback={null}>
      <AuthSync />
      <V3App />
    </Suspense>
  )
}

export default App
