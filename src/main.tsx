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

// Self-healing service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })

  // Listen for stale asset message from SW → hard reload
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'ASSET_STALE') {
      console.log('[SW] Stale asset detected — hard reload')
      window.location.reload()
    }
  })
}