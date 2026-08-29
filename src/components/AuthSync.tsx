import { useEffect } from 'react'
import { useUser, useAuth, useClerk } from '@clerk/clerk-react'
import { useAuthStore } from '@/stores/auth-store'
import { isAdminEmail } from '@/lib/clerk-config'

export function AuthSync() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const clerk = useClerk()

  useEffect(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? null
    const admin = isAdminEmail(email)
    useAuthStore.getState().setAdmin(admin)
    useAuthStore.getState().setSignedIn(!!isSignedIn)
    useAuthStore.getState().setChecking(false)
    // Stash the token-minting fn so apiFetch can attach the Bearer header
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
  }, [isLoaded, isSignedIn, user, getToken, clerk])

  return null
}