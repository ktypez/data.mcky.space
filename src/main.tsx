import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import ErrorScreen from '@/components/ErrorScreen'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ErrorScreen>
          <App />
        </ErrorScreen>
      </BrowserRouter>
    </ThemeProvider>
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