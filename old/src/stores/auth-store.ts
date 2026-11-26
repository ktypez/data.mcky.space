import { create } from './create-store'

interface AuthState {
  // open the Clerk-powered login modal (or page) from anywhere.
  loginOpen: boolean
  setLoginOpen: (open: boolean) => void
  isAdmin: boolean
  setAdmin: (isAdmin: boolean) => void
  checking: boolean
  setChecking: (checking: boolean) => void
  // Fresh Clerk session token obtainer — populated by the Clerk wrapper
  // (AuthSync equivalent). The treaty client uses it for Bearer JWT.
  getToken: (() => Promise<string | null>) | null
  setTokenGetter: (fn: (() => Promise<string | null>) | null) => void
  signOut: (() => Promise<void>) | null
  setSignOut: (fn: (() => Promise<void>) | null) => void
  isSignedIn: boolean
  setSignedIn: (v: boolean) => void
  userId: string | null
  setUserId: (v: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  loginOpen: false,
  setLoginOpen: (open) => set({ loginOpen: open }),
  isAdmin: false,
  setAdmin: (isAdmin) => set({ isAdmin }),
  checking: true,
  setChecking: (checking) => set({ checking }),
  getToken: null,
  setTokenGetter: (getToken) => set({ getToken }),
  signOut: null,
  setSignOut: (signOut) => set({ signOut }),
  isSignedIn: false,
  setSignedIn: (v) => set({ isSignedIn: v }),
  userId: null,
  setUserId: (userId) => set({ userId }),
}))

// Store-level logout used by legacy components.
// Delegates to the Clerk signOut stashed by the auth wrapper; no-op if unset.
export async function logout() {
  const fn = useAuthStore.getState().signOut
  if (fn) await fn()
  useAuthStore.getState().setLoginOpen(false)
}
