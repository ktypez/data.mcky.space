import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { ArrowClockwise, House, Plus, Trash, Gear, MapTrifold } from '@phosphor-icons/react'
import { Loading } from '@/components/Loading'
import { AuthSync } from '@/components/AuthSync'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { useAppTheme } from '@/lib/app-theme'
import { isFormDirty } from '@/lib/form-dirty'
import CommandPalette from '@/components/CommandPalette'
import { SyncStatus } from '@/components/SyncStatus'
import '@/styles/ledger.css'

const CatalogPage = lazy(() => import('@/pages/Catalog'))
const RecordPage = lazy(() => import('@/pages/Record'))
const EditorPage = lazy(() => import('@/pages/Editor'))
const TrashPage = lazy(() => import('@/pages/Trash'))
const MapsPage = lazy(() => import('@/pages/Maps'))
const NotFoundPage = lazy(() => import('@/pages/NotFound'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const LoginPage = lazy(() => import('@/pages/Login').then(module => ({ default: module.Login })))
const DetailLab = lazy(() => import('@/__design_lab/detail/lab/DetailLabApp'))

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin, loginOpen } = useAuthStore()
  const { isLoaded, isSignedIn } = useAuth()
  const { themeId, mode, resolvedMode, customPalette, setThemeId, setMode, setCustomPalette } = useAppTheme()

  useEffect(() => { void useClientStore.getState().initialize() }, [])
  useEffect(() => { document.getElementById('ledger-main')?.scrollTo({ top: 0 }) }, [location.pathname])

  const guardNavigation = (event: React.MouseEvent) => {
    if (isFormDirty() && !window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากฟอร์มไหม?')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const wantsLogin = location.pathname === '/login' || loginOpen
  if (wantsLogin && isLoaded && !isSignedIn) {
    return <Suspense fallback={<Loading />}><LoginPage /></Suspense>
  }

  if (location.pathname.startsWith('/__design_lab/detail')) {
    return <Suspense fallback={<Loading />}><DetailLab /></Suspense>
  }

  return (
    <div className="ledger-shell" data-mode={resolvedMode}>
      <AuthSync />
      <div className="pointer-events-none fixed right-3 top-[env(safe-area-top)] z-40 pt-3 sm:right-5">
        <div className="pointer-events-auto"><SyncStatus /></div>
      </div>
      <a href="#ledger-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground">ข้ามไปเนื้อหา</a>
      <main id="ledger-main" className="ledger-main min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/add" element={<EditorPage />} />
            <Route path="/edit/:id" element={<EditorPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/maps" element={<MapsPage />} />
            <Route path="/settings" element={<SettingsPage mode={mode} setMode={setMode} themeId={themeId} setThemeId={setThemeId} customPalette={customPalette} setCustomPalette={setCustomPalette} />} />
            <Route path="/c/:id" element={<RecordPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <nav className="ledger-bottom-nav relative z-50 shrink-0 border-t border-border bg-card/95 backdrop-blur" aria-label="หลัก">
        <div className="mx-auto flex h-[4.5rem] max-w-xl items-center justify-around px-3 pb-[env(safe-area-bottom)]">
          <NavLink to="/" end onClick={guardNavigation} aria-label="หน้าหลัก" className={({ isActive }) => `ledger-nav-item ${isActive ? 'is-active' : ''}`}><House weight="fill" size={21} aria-hidden /><span>หน้าหลัก</span></NavLink>
          {isAdmin ? <NavLink to="/trash" onClick={guardNavigation} aria-label="ถังขยะ" className={({ isActive }) => `ledger-nav-item ${isActive ? 'is-active' : ''}`}><Trash size={21} aria-hidden /><span>ถังขยะ</span></NavLink> : <span aria-label="ถังขยะ" aria-disabled="true" className="ledger-nav-item opacity-40"><Trash size={21} aria-hidden /><span>ถังขยะ</span></span>}
          {isAdmin ? <NavLink to="/add" onClick={guardNavigation} aria-label="เพิ่มรายการ" className="ledger-add-button"><Plus weight="bold" size={25} aria-hidden /></NavLink> : <span aria-label="เพิ่มรายการ" aria-disabled="true" className="ledger-add-button opacity-40 bg-muted text-muted-foreground border border-border grayscale"><Plus weight="bold" size={25} aria-hidden /></span>}
          <NavLink to="/maps" onClick={guardNavigation} aria-label="แผนที่" className={({ isActive }) => `ledger-nav-item ${isActive ? 'is-active' : ''}`}><MapTrifold size={21} aria-hidden /><span>แผนที่</span></NavLink>
          <button type="button" onClick={event => { if (isFormDirty() && !window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการรีเฟรชหน้าไหม?')) { event.preventDefault(); return } window.location.reload() }} aria-label="รีเฟรชหน้า" className="ledger-nav-item"><ArrowClockwise size={21} aria-hidden /><span>รีเฟรช</span></button>
          <button type="button" onClick={event => { guardNavigation(event); if (!event.defaultPrevented) navigate('/settings') }} aria-label="เมนูและการตั้งค่า" className={`ledger-nav-item ${location.pathname === '/settings' ? 'is-active' : ''}`}><Gear size={21} aria-hidden /><span>เมนู</span></button>
        </div>
      </nav>
      <CommandPalette />
    </div>
  )
}

export default App
