import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { ThemeProvider } from '@/components/theme-provider'
import ErrorScreen from '@/components/ErrorScreen'
import App from './App'
import './index.css'

// Publishable key is public (safe to embed); the secret key lives only in
// the Cloudflare Pages functions runtime.
const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ??
  'pk_live_Y2xlcmsubWNreS5zcGFjZSQ'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      signInUrl="/login"
      signUpUrl="/login"
    >
      <ThemeProvider>
        <BrowserRouter>
          <ErrorScreen>
            <App />
          </ErrorScreen>
        </BrowserRouter>
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>,
)

// Service worker registration.
// On load, first drop any previously-installed SW (an older self-healing
// version could get stuck in a refresh loop). Then register the current one.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {})
      .finally(() => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      })
  })
}