
import { create } from 'zustand'
import { apiFetch, getProfileTheme } from '@/lib/api'
import { useUIStore } from '@/stores/ui-store'

interface AuthState {
  isAdmin: boolean
  loginOpen: boolean
  checking: boolean
  setAdmin: (isAdmin: boolean) => void
  setLoginOpen: (loginOpen: boolean) => void
  setChecking: (checking: boolean) => void
  checkAuth: () => Promise<void>
  syncProfileTheme: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAdmin: false,
  loginOpen: false,
  checking: true,
  setAdmin: (isAdmin) => set({ isAdmin }),
  setLoginOpen: (loginOpen) => set({ loginOpen }),
  setChecking: (checking) => set({ checking }),
  checkAuth: async () => {
    set({ checking: true })
    try {
      const res = await apiFetch('/api/auth')
      set({ isAdmin: res.ok, checking: false })
      if (res.ok) {
        await useAuthStore.getState().syncProfileTheme()
      }
    } catch {
      set({ isAdmin: false, checking: false })
    }
  },
  // Pull the admin's server-side theme and apply it if it differs from the
  // local one (ThemeInjector picks it up without a reload).
  syncProfileTheme: async () => {
    const profileTheme = await getProfileTheme()
    if (!profileTheme) return
    const current = useUIStore.getState().theme
    if (profileTheme !== current) {
      useUIStore.getState().setTheme(profileTheme)
    }
  },
  logout: async () => {
    await apiFetch('/api/auth', { method: 'DELETE' })
    localStorage.removeItem('ezzylist_admin_token')
    set({ isAdmin: false, loginOpen: false })
  },
}))
