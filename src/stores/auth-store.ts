import { create } from 'zustand'
import { useUser, useAuth } from '@clerk/clerk-react'
import { isAdminEmail } from '@/lib/clerk-config'
import { useUIStore } from '@/stores/ui-store'

interface AuthState {
  // open the Clerk-powered login modal (or page) from anywhere.
  loginOpen: boolean
  setLoginOpen: (open: boolean) => void
  // Kept for back-compat with old code that reads `useAuthStore().isAdmin`.
  // New code should use `useAdminAuth()` instead.
  isAdmin: boolean
  setAdmin: (isAdmin: boolean) => void
  checking: boolean
  setChecking: (checking: boolean) => void
  // Fresh Clerk session token obtainer — populated by AuthSync from the
  // `useAuth()` hook (the only place the token minting function lives).
  // apiFetch uses it to attach `Authorization: Bearer <JWT>`.
  getToken: (() => Promise<string | null>) | null
  setTokenGetter: (fn: (() => Promise<string | null>) | null) => void
  // Sign-out function stashed from Clerk (useClerk().signOut) by AuthSync.
  signOut: (() => Promise<void>) | null
  setSignOut: (fn: (() => Promise<void>) | null) => void
  // Signed-in flag (back-compat with old code that read useAuthStore()).
  isSignedIn: boolean
  setSignedIn: (v: boolean) => void
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
}))

// Store-level logout used by legacy components (e.g. NavDropdown).
// Delegates to the Clerk signOut stashed by AuthSync; no-op if unset.
export async function logout() {
  const fn = useAuthStore.getState().signOut
  if (fn) await fn()
  useAuthStore.getState().setLoginOpen(false)
}

// Call this from components to check Clerk's current auth state.
// It always reflects the latest session status (loaded, signed-in, admin).
export function useAdminAuth() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const email = user?.primaryEmailAddress?.emailAddress ?? null
  const isAdmin = isAdminEmail(email)

  return {
    isLoaded,
    isSignedIn,
    isAdmin,
    email,
  }
}

