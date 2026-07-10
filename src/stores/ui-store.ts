'use client'

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
  mapFocusId: string | null
  copiedId: string | null
  openCopyId: string | null
  newClientCount: number
  theme: string

  setViewState: (state: ViewState) => void
  setRouteData: (data: RouteData | null) => void
  setRouting: (routing: boolean) => void
  setRouteError: (error: string) => void
  setShowManualOrigin: (show: boolean) => void
  setManualOriginLat: (lat: string) => void
  setManualOriginLng: (lng: string) => void
  setMapFocusId: (id: string | null) => void
  setCopiedId: (id: string | null) => void
  setOpenCopyId: (id: string | null) => void
  setNewClientCount: (count: number) => void
  setTheme: (theme: string) => void
  clearViewStates: () => void
  resetView: () => void
  openDetail: (clientId: string, client?: Client) => void
  openMap: (focusId?: string | null) => void
  openAddEdit: (editClientId?: string | null) => void
  openSuggestions: () => void
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
      mapFocusId: null,
      copiedId: null,
      openCopyId: null,
      newClientCount: 0,
      theme: 'obsidian',

      setViewState: (viewState) => set({ viewState }),
      setRouteData: (routeData) => set({ routeData }),
      setRouting: (routing) => set({ routing }),
      setRouteError: (routeError) => set({ routeError }),
      setShowManualOrigin: (showManualOrigin) => set({ showManualOrigin }),
      setManualOriginLat: (manualOriginLat) => set({ manualOriginLat }),
      setManualOriginLng: (manualOriginLng) => set({ manualOriginLng }),
      setMapFocusId: (mapFocusId) => set({ mapFocusId }),
      setCopiedId: (copiedId) => set({ copiedId }),
      setOpenCopyId: (openCopyId) => set({ openCopyId }),
      setNewClientCount: (newClientCount) => set({ newClientCount }),
      setTheme: (theme) => set({ theme }),
      clearViewStates: () =>
        set({
          viewState: { view: 'list' },
          mapFocusId: null,
        }),
      resetView: () =>
        set({
          viewState: { view: 'list' },
          mapFocusId: null,
          openCopyId: null,
        }),
      openDetail: (clientId, client) =>
        set({ viewState: { view: 'detail', clientId, client } }),
      openMap: (focusId = null) =>
        set({ viewState: { view: 'map', focusId } }),
      openAddEdit: (editClientId = null) =>
        set({ viewState: { view: 'add-edit', editClientId } }),
  openSuggestions: () =>
    set({ viewState: { view: 'suggestions' } }),
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
