import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, SignIn } from '@clerk/clerk-react'
import { useAdminAuth } from '@/stores/auth-store'
import { motion } from 'motion/react'

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
      <div style={{ width: '100%', maxWidth: 880 }} className="md:grid md:grid-cols-[1.2fr_1fr] md:gap-10">
        {/* Branding panel — visible on desktop, compact on mobile */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 12,
            paddingRight: 8,
          }}
          className="max-md:items-center max-md:mb-6 max-md:text-center"
        >
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
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08, ease: [0.25, 1, 0.5, 1] }}
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: 'var(--text)',
              margin: 0,
              letterSpacing: -0.5,
              fontFamily: 'var(--theme-font-display)',
            }}
          >
            เข้าสู่ระบบ (ผู้ดูแล)
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16, ease: [0.25, 1, 0.5, 1] }}
            style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.7 }}
          >
            เข้าสู่ระบบเพื่อแก้ไขข้อมูล จัดการลูกค้า และตั้งค่า
          </motion.p>
        </motion.div>

        {/* Sign-in card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12, ease: [0.25, 1, 0.5, 1] }}
          style={{ width: '100%', maxWidth: 420 }}
        >
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
        </motion.div>
      </div>
    </div>
  )
}
