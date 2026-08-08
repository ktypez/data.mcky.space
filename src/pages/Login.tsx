import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, SignIn } from '@clerk/clerk-react'
import { useAdminAuth } from '@/stores/auth-store'

export function Login() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, isAdmin } = useAdminAuth()

  const redirect =
    new URLSearchParams(window.location.search).get('redirect') || '/'

  useEffect(() => {
    if (isLoaded && isSignedIn && isAdmin) navigate(redirect, { replace: true })
  }, [isLoaded, isSignedIn, isAdmin, navigate, redirect])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 4,
              color: 'var(--muted)',
              textTransform: 'uppercase',
            }}
          >
            ezzylist
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: 'var(--text)',
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            เข้าสู่ระบบ (ผู้ดูแล)
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
            เข้าสู่ระบบเพื่อแก้ไขข้อมูล จัดการลูกค้า และตั้งค่า
          </p>
        </div>

        <SignIn
          routing="hash"
          oauthFlow="redirect"
          afterSignInUrl={redirect}
          afterSignUpUrl={redirect}
          fallbackRedirectUrl={redirect}
          appearance={{
            variables: {
              colorBackground: 'var(--card)',
              colorPrimary: 'var(--primary)',
              colorText: 'var(--text)',
              colorTextSecondary: 'var(--muted)',
              colorInputBackground: 'var(--bg)',
              colorInputText: 'var(--text)',
              colorNeutral: 'var(--text)',
              colorTextOnPrimaryBackground: 'var(--card)',
              colorBorder: 'var(--border)',
              borderRadius: '12px',
              fontFamily: 'inherit',
            },
            elements: {
              rootBox: { width: '100%', maxWidth: '100%', margin: 0 },
              card: {
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                boxShadow: 'none',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
              },
              logoBox: { margin: '0 auto', display: 'none' },
              header: { padding: '1.25rem 1rem 0' },
              main: { padding: '1rem' },
              footer: { padding: '0.25rem 1rem 1rem' },
              dividerRow: { margin: '0.75rem 0' },
              formButtonPrimary: {
                background: 'var(--primary)',
                color: 'var(--card)',
                fontWeight: 700,
                '&:hover': { background: 'var(--primary)' },
              },
              socialButtons: { display: 'flex', flexDirection: 'column', gap: '8px' },
              socialButton: {
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                '&:hover': { background: 'var(--primary-bg)' },
              },
              formFieldInput: {
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '10px',
                '&:focus': {
                  borderColor: 'var(--primary)',
                  boxShadow: '0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent)',
                },
              },
              identityPreview: {
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
              },
              formFieldLabel: {
                color: 'var(--text)',
                fontWeight: 600,
              },
            },
          }}
        />
      </div>
    </div>
  )
}
