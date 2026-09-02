import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom'
import { House, Plus, Trash, Sun, Moon, Monitor, LockKey, SignOut } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore, logout } from '@/stores/auth-store'
import V3Catalog from './pages/V3Catalog'
import V3Record from './pages/V3Record'
import V3Editor from './pages/V3Editor'
import V3Trash from './pages/V3Trash'
import './styles/v3.css'

type V3Mode = 'auto'|'light'|'dark'
const MODE_KEY = 'ezzylist-v3-mode'
function readMode(): V3Mode {
  try{
    const v = localStorage.getItem(MODE_KEY)
    if(v==='light'||v==='dark'||v==='auto') return v
  }catch{}
  return 'auto'
}
export default function V3App(){
  const location = useLocation()
  const { isAdmin, isSignedIn, setLoginOpen } = useAuthStore()
  const [mode, setMode] = useState<V3Mode>(readMode)
  useEffect(()=>{ void useClientStore.getState().initialize()},[])
  useEffect(()=>{ try{ localStorage.setItem(MODE_KEY, mode)}catch{} },[mode])
  useEffect(()=>{ window.scrollTo(0,0)},[location.pathname])
  return (
    <div className="v3-shell" data-mode={mode}>
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-6 py-3">
          <NavLink to="/" aria-label="Home" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background hover:opacity-90">
            <House weight="fill" className="h-4 w-4" />
          </NavLink>
          <div className="flex items-center gap-1 ml-auto">
            {isAdmin && <NavLink to="/add" aria-label="Add" className={({isActive})=>`flex h-8 w-8 items-center justify-center rounded-full ${isActive?'bg-foreground text-background':'hover:bg-muted text-muted-foreground hover:text-foreground'}`}><Plus weight="bold" className="h-4 w-4" /></NavLink>}
            {isAdmin && <NavLink to="/trash" aria-label="Trash" className={({isActive})=>`flex h-8 w-8 items-center justify-center rounded-full ${isActive?'bg-foreground text-background':'hover:bg-muted text-muted-foreground hover:text-foreground'}`}><Trash className="h-4 w-4" /></NavLink>}
            <div className="ml-2 flex items-center rounded-full border border-border p-0.5">
              {(['auto','light','dark'] as const).map(m=>(
                <button key={m} onClick={()=>setMode(m)} aria-label={m} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${mode===m?'bg-foreground text-background':'text-muted-foreground hover:text-foreground'}`}>
                  {m==='auto' ? <Monitor className="h-3.5 w-3.5"/> : m==='light' ? <Sun className="h-3.5 w-3.5"/> : <Moon className="h-3.5 w-3.5"/>}
                </button>
              ))}
            </div>
            {isSignedIn ? (
              <button onClick={()=>void logout()} aria-label="ออกจากระบบ" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                <SignOut className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={()=>setLoginOpen(true)} aria-label="เข้าระบบ" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                <LockKey className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100dvh-56px)]">
        <Routes>
          <Route path="/" element={<V3Catalog/>} />
          <Route path="/add" element={<V3Editor/>} />
          <Route path="/edit/:id" element={<V3Editor/>} />
          <Route path="/trash" element={<V3Trash/>} />
          <Route path="/c/:id" element={<V3Record/>} />
          {/* keep /v3 alias for backward compat */}
          <Route path="/v3" element={<Navigate to="/" replace/>} />
          <Route path="/v3/add" element={<Navigate to="/add" replace/>} />
          <Route path="/v3/edit/:id" element={<Navigate to="/edit/:id" replace/>} />
          <Route path="/v3/trash" element={<Navigate to="/trash" replace/>} />
          <Route path="/v3/c/:id" element={<Navigate to="/c/:id" replace/>} />
          <Route path="*" element={<Navigate to="/" replace/>} />
        </Routes>
      </main>
      <footer className="border-t border-border px-6 py-3 flex items-center justify-center gap-3 font-mono text-[10px] uppercase opacity-60">
        <span>V3</span>
        <span className="opacity-40">·</span>
        <NavLink to="/old" className="hover:opacity-80 hover:underline">Old →</NavLink>
      </footer>
    </div>
  )
}
