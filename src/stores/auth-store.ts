'use client'

import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

interface AuthState {
  isAdmin: boolean
  loginOpen: boolean
  checking: boolean
  setAdmin: (isAdmin: boolean) => void
  setLoginOpen: (loginOpen: boolean) => void
  setChecking: (checking: boolean) => void
  checkAuth: () => Promise<void>
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
    } catch {
      set({ isAdmin: false, checking: false })
    }
  },
  logout: async () => {
    await apiFetch('/api/auth', { method: 'DELETE' })
    localStorage.removeItem('ezzylist_admin_token')
    set({ isAdmin: false, loginOpen: false })
  },
}))
