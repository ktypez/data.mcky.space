
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewState, RouteData } from '@/types'
import type { Client } from '@/types'

interface UIState {
  viewState: ViewState
  routeData: RouteData | null
  routing: boolean
  routeError: string
  showManualOrigin: boolean
  manualOriginLat: string
  manualOriginLng: string
  copiedId: string | null
  newClientCount: number
  theme: string

  setViewState: (state: ViewState) => void
  setRouteData: (data: RouteData | null) => void
  setRouting: (routing: boolean) => void
  setRouteError: (error: string) => void
  setShowManualOrigin: (show: boolean) => void
  setManualOriginLat: (lat: string) => void
  setManualOriginLng: (lng: string) => void
  setCopiedId: (id: string | null) => void
  setNewClientCount: (count: number) => void
  setTheme: (theme: string) => void
  clearViewStates: () => void
  resetView: () => void
  openDetail: (clientId: string, client?: Client) => void
  openAddEdit: (editClientId?: string | null) => void
  openTrash: () => void
  closeView: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewState: { view: 'list' },
      routeData: null,
      routing: false,
      routeError: '',
      showManualOrigin: false,
      manualOriginLat: '',
      manualOriginLng: '',
      copiedId: null,
      newClientCount: 0,
      theme: 'dusk',

      setViewState: (viewState) => set({ viewState }),
      setRouteData: (routeData) => set({ routeData }),
      setRouting: (routing) => set({ routing }),
      setRouteError: (routeError) => set({ routeError }),
      setShowManualOrigin: (showManualOrigin) => set({ showManualOrigin }),
      setManualOriginLat: (manualOriginLat) => set({ manualOriginLat }),
      setManualOriginLng: (manualOriginLng) => set({ manualOriginLng }),
      setCopiedId: (copiedId) => set({ copiedId }),
      setNewClientCount: (newClientCount) => set({ newClientCount }),
      setTheme: (theme) => set({ theme }),
      clearViewStates: () =>
        set({
          viewState: { view: 'list' },
        }),
      resetView: () =>
        set({
          viewState: { view: 'list' },
        }),
      openDetail: (clientId, client) =>
        set({ viewState: { view: 'detail', clientId, client } }),
      openAddEdit: (editClientId = null) =>
        set({ viewState: { view: 'add-edit', editClientId } }),
  openTrash: () =>
    set({ viewState: { view: 'trash' } }),
  closeView: () => set({ viewState: { view: 'list' } }),
    }),
    {
      name: 'ezzylist-ui',
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
)
