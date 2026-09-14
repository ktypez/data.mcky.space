import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { thTH } from '@clerk/localizations'
import ErrorScreen from '@/components/ErrorScreen'
import App from './App'
import { enterDemoMode, isDemoMode } from '@/lib/demo'
import { useAuthStore } from './stores/auth-store'
import './index.css'

// /demo → session flag + URL rewrite to / BEFORE the router initializes, so
// every absolute navigate() in the app keeps working and refresh stays in demo.
if (window.location.pathname === '/demo' || window.location.pathname.startsWith('/demo/')) {
  enterDemoMode()
}
// Demo = fake admin session, seeded BEFORE first render: route guards
// (V3Trash, V3Editor) read isAdmin on their very first pass, so setting it
// in a useEffect would bounce the user back to /.
if (isDemoMode()) {
  const s = useAuthStore.getState()
  s.setAdmin(true)
  s.setSignedIn(true)
  s.setChecking(false)
  s.setTokenGetter(async () => null)
  s.setSignOut(async () => {})
}

const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ??
  'pk_live_Y2xlcmsubWNreS5zcGFjZSQ'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      localization={thTH}
      afterSignOutUrl="/"
      signInUrl="/login"
      signUpUrl="/login"
    >
      <BrowserRouter>
        <ErrorScreen>
          <App />
        </ErrorScreen>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)

// PWA — register SW with cache busting to force update from old cached version.
// On first load after deploy, the new SW installs + skipWaiting + claim takes
// over immediately. User never sees a prompt — it just works.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(
        `/sw.js?v=${__SW_VERSION__}`,
        { scope: '/' },
      )

      // If an older SW is waiting, tell it to skip → activates new one
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      // Listen for new SW installing — when it's ready, tell it to skip
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            sw.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
    } catch {
      // SW registration failed — app still works, just no offline/install
    }
  })
}
