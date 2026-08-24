import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import V2Sidebar from './components/V2Sidebar'
import V2Topbar from './components/V2Topbar'
import V2MobileNav from './components/V2MobileNav'
import V2Catalog from './pages/V2Catalog'
import V2Record from './pages/V2Record'
import V2Editor from './pages/V2Editor'
import V2Trash from './pages/V2Trash'
import { useClientStore } from '@/stores/client-store'
import './styles/v2.css'

type V2Mode = 'dark' | 'light'

const MODE_KEY = 'ezzylist-v2-mode'

function readInitialMode(): V2Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/**
 * V2App — parallel UI under /v2. Rendered INSTEAD of the classic shell
 * (see App.tsx branch), so it owns its full document surface:
 * sidebar + topbar + content + mobile bottom nav.
 *
 * Theming: self-scoped tokens (see styles/v2.css). Light/dark is v2-private
 * state — it never touches the global theme engine or `.dark` class.
 */
export default function V2App() {
  const [mode, setMode] = useState<V2Mode>(readInitialMode)
  const location = useLocation()

  // Boot the shared client store (idempotent — no-op if classic UI already
  // loaded it). Makes direct URLs like /v2/c/<id> work on hard refresh.
  useEffect(() => {
    void useClientStore.getState().initialize()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      /* storage unavailable — mode just won't persist */
    }
  }, [mode])

  // Scroll to top between v2 pages (document-flow scrolling here).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Ctrl/Cmd+K or "/" (outside form fields) → focus catalog search.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('v2:focus-search'))
      } else if (e.key === '/' && !inField && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('v2:focus-search'))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleMode = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))

  return (
    <div className="v2-shell" data-mode={mode}>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <V2Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <V2Topbar mode={mode} onToggleMode={toggleMode} />

          <main id="v2-main" tabIndex={-1} className="flex-1 pb-16 outline-none md:pb-0">
            {/* NOTE: these Routes are mounted OUTSIDE any parent <Route>, so
                they match against the FULL pathname. Paths must include the
                /v2 prefix — relative paths ("​/") would never match and fall
                through to the wildcard redirect. */}
            <Routes>
              <Route path="/v2" element={<V2Catalog />} />
              <Route path="/v2/add" element={<V2Editor />} />
              <Route path="/v2/edit/:id" element={<V2Editor />} />
              <Route path="/v2/trash" element={<V2Trash />} />
              <Route path="/v2/c/:id" element={<V2Record />} />
              <Route path="*" element={<Navigate to="/v2" replace />} />
            </Routes>
          </main>

          <footer className="hidden items-center justify-between border-t border-border px-8 py-3 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase md:flex">
            <span>ezzylist // registry</span>
            <span>v2 alpha — independent redesign, not affiliated with omarchy</span>
          </footer>
        </div>
      </div>

      <V2MobileNav />
    </div>
  )
}
