import { useAuthStore } from '@/stores/auth-store'

type ClerkInstance = InstanceType<typeof import('@clerk/clerk-js').Clerk>

// Same instance as paper/dept/truck/portal. The publishable key is a public
// identifier by design; the secret key only lives server-side.
const CLERK_PUBLISHABLE_KEY =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ??
  'pk_live_Y2xlcmsubWNreS5zcGFjZSQ'

let clerk: ClerkInstance | null = null
let loading: Promise<ClerkInstance> | null = null

export function getClerk(): ClerkInstance | null {
  return clerk
}

// Load Clerk once, then mirror its session into the auth store so the treaty
// client and any non-component code can mint tokens without a provider.
export function initClerk(): Promise<ClerkInstance> {
  if (clerk) return Promise.resolve(clerk)
  if (loading) return loading
  loading = import('@clerk/clerk-js').then(async ({ Clerk }) => {
    clerk = new Clerk(CLERK_PUBLISHABLE_KEY)
    await clerk.load()
    return clerk
  }).then(async () => {
    const sync = () => {
      const session = clerk!.session
      const signedIn = !!session
      useAuthStore.getState().setSignedIn(signedIn)
      useAuthStore.getState().setAdmin(signedIn)
      useAuthStore.getState().setUserId(signedIn ? (clerk!.user?.id ?? null) : null)
      useAuthStore.getState().setChecking(false)
    }
    clerk!.addListener(sync)
    sync()
    useAuthStore.getState().setTokenGetter(async () => {
      try {
        if (!clerk?.session) return null
        return await clerk.session.getToken()
      } catch {
        return null
      }
    })
    useAuthStore.getState().setSignOut(async () => {
      try {
        await clerk?.signOut()
      } catch {
        /* session may already be gone */
      }
    })
    return clerk!
  })
  return loading
}
