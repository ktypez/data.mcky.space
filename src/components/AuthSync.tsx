import { useEffect } from 'react'
import { useAuth, useClerk } from '@clerk/clerk-react'
import { useAuthStore } from '@/stores/auth-store'

export function AuthSync() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const clerk = useClerk()

  useEffect(() => {
    // Any signed-in user is admin — no email allowlist.
    const admin = !!isSignedIn
    useAuthStore.getState().setAdmin(admin)
    useAuthStore.getState().setSignedIn(!!isSignedIn)
    useAuthStore.getState().setChecking(false)
    // Stash the token-minting fn so the treaty client can attach the Bearer header
    // on write calls (Clerk exposes getToken only inside a provider/hook).
    useAuthStore.getState().setTokenGetter(
      async () => {
        if (!isSignedIn || !isLoaded) return null
        try {
          return await getToken()
        } catch {
          return null
        }
      },
    )
    // Stash a sign-out handler so store-level logout() (used by menu items)
    // works without requiring a Clerk context at call site.
    useAuthStore.getState().setSignOut(
      async () => {
        try {
          await clerk.signOut()
        } catch {
          /* ignore — session may already be gone */
        }
      },
    )
  }, [isLoaded, isSignedIn, getToken, clerk])

  return null
}