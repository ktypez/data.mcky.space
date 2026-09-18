import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { thTH } from '@clerk/localizations'
import ErrorScreen from '@/components/ErrorScreen'
import App from './App'
import { UpdatePrompt } from './components/UpdatePrompt'
import './index.css'

const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ??
  'pk_live_Y2xlcmsubWNreS5zcGFjZSQ'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.PROD && <UpdatePrompt />}
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

// UpdatePrompt owns the only SW registration and user-approved activation.
