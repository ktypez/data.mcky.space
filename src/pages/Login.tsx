import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useAdminAuth } from '@/stores/auth-store'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoaded, isSignedIn, isAdmin } = useAdminAuth()

  const target = new URLSearchParams(location.search).get('redirect') || '/'

  useEffect(() => {
    if (isLoaded && isSignedIn && isAdmin) navigate(target, { replace: true })
  }, [isLoaded, isSignedIn, isAdmin, navigate, target])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const portalUrl = `https://me.mcky.space?from=data&redirect=${encodeURIComponent(target)}`
      window.location.replace(portalUrl)
    }
  }, [isLoaded, isSignedIn, target])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>
        กำลังนำทางไปยังหน้าเข้าสู่ระบบ...
      </div>
    </div>
  )
}
