import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, NavLink, useNavigate, useParams } from 'react-router-dom'
import { House, Plus, Trash, MapTrifold, Gear } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { applyCustomCss } from './lib/custom-css'
import './styles/v3.css'

// Per-route code splitting — the catalog (default landing) must not pay for
// the editor, trash, record detail, or the 1MB map chunk.
const V3Catalog = lazy(() => import('./pages/V3Catalog'))
const V3Record = lazy(() => import('./pages/V3Record'))
const V3Editor = lazy(() => import('./pages/V3Editor'))
const V3Trash = lazy(() => import('./pages/V3Trash'))
const V3NotFound = lazy(() => import('./pages/V3NotFound'))
const V3OfflineMaps = lazy(() => import('./pages/V3OfflineMaps'))
const V3Settings = lazy(() => import('./pages/V3Settings'))

type V3Mode = 'auto'|'light'|'dark'
const MODE_KEY = 'ezzylist-v3-mode'

function LegacyEditRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={id ? `/edit/${encodeURIComponent(id)}` : '/'} replace />
}

function LegacyRecordRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={id ? `/c/${encodeURIComponent(id)}` : '/'} replace />
}
function readMode(): V3Mode {
  try{
    const v = localStorage.getItem(MODE_KEY)
    if(v==='light'||v==='dark'||v==='auto') return v
  }catch{}
  return 'auto'
}
export default function V3App(){
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()
  const [mode, setMode] = useState<V3Mode>(readMode)
  useEffect(()=>{ void useClientStore.getState().initialize()},[])
  useEffect(()=>{ applyCustomCss() },[])
  useEffect(()=>{ try{ localStorage.setItem(MODE_KEY, mode)}catch{} },[mode])
  useEffect(()=>{ window.scrollTo(0,0)},[location.pathname])
  return (
    <div className="v3-shell" data-mode={mode}>
      <main className="v3-main min-h-[calc(100dvh-80px)] pb-28">
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<V3Catalog/>} />
          <Route path="/add" element={<V3Editor/>} />
          <Route path="/edit/:id" element={<V3Editor/>} />
          <Route path="/trash" element={<V3Trash/>} />
          <Route path="/maps" element={<V3OfflineMaps/>} />
          <Route path="/settings" element={<V3Settings mode={mode} setMode={setMode}/> } />
          <Route path="/c/:id" element={<V3Record/>} />
          <Route path="/v3" element={<Navigate to="/" replace/>} />
          <Route path="/v3/add" element={<Navigate to="/add" replace/>} />
          <Route path="/v3/edit/:id" element={<LegacyEditRedirect/>} />
          <Route path="/v3/trash" element={<Navigate to="/trash" replace/>} />
          <Route path="/v3/c/:id" element={<LegacyRecordRedirect/>} />
          <Route path="*" element={<V3NotFound/>} />
        </Routes>
        </Suspense>
      </main>
      <footer className="border-t border-border px-6 py-3 flex items-center justify-center gap-3 font-mono text-[10px] uppercase opacity-60">
        <span>V3</span>
      </footer>
      <nav className="v3-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur" aria-label="หลัก">
        <div className="mx-auto flex h-[4.5rem] max-w-xl items-center justify-around px-3 pb-[env(safe-area-inset-bottom)]">
          <NavLink to="/" aria-label="หน้าหลัก" className={({isActive}) => `v3-nav-item ${isActive ? 'is-active' : ''}`}><House weight="fill" size={21}/><span>หน้าหลัก</span></NavLink>
          {isAdmin ? <NavLink to="/trash" aria-label="ถังขยะ" className={({isActive}) => `v3-nav-item ${isActive ? 'is-active' : ''}`}><Trash size={21}/><span>ถังขยะ</span></NavLink> : <span className="v3-nav-spacer" />}
          <NavLink to="/add" aria-label="เพิ่มรายการ" className="v3-add-button"><Plus weight="bold" size={25}/></NavLink>
          <NavLink to="/maps" aria-label="แผนที่ออฟไลน์" className={({isActive}) => `v3-nav-item ${isActive ? 'is-active' : ''}`}><MapTrifold size={21}/><span>แผนที่</span></NavLink>
          <button onClick={() => navigate('/settings')} aria-label="เมนูและการตั้งค่า" className={`v3-nav-item ${location.pathname === '/settings' ? 'is-active' : ''}`}><Gear size={21}/><span>เมนู</span></button>
        </div>
      </nav>
    </div>
  )
}
