import { useAuthStore } from '@/stores/auth-store'

// Returns the active Clerk session JWT for backend calls.
// Returns null if no session yet (visitor is guest).
//
// Clerk's getToken() only exists inside the provider context (useAuth hook);
// AuthSync stashes it into the auth store so non-component code can call it.
// Used by the treaty client (src/lib/treaty.ts) and the XHR photo uploader.
export async function clerkToken(): Promise<string | null> {
  try {
    const fn = useAuthStore.getState().getToken
    return fn ? await fn() : null
  } catch {
    return null
  }
}
