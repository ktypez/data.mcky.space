'use client'

import { useCallback, useEffect, useMemo, lazy, Suspense } from 'react'

import { Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useSuggestionStore } from '@/stores/suggestion-store'
import { useDebounce } from '@/hooks/useDebounce'
import { fetchClients, addClient, updateClient } from '@/lib/storage'
import { apiFetch, authHeaders } from '@/lib/api'
import { copyToClipboard, getMapsUrl } from '@/lib/utils'
import type { Client } from '@/types'
import { FilterKey } from '@/types'

function lazyLoad<T extends React.ComponentType<any>>(imp: () => Promise<{ default: T }>) {
  const Lazy = lazy(imp)
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={null}>
      <Lazy {...props} />
    </Suspense>
  )
}

const ClientDetail = lazyLoad(() => import('@/components/ClientDetail'))
const InlineMap = lazyLoad(() => import('@/components/InlineMap'))
const AdminSuggestionsInline = lazyLoad(() => import('@/components/AdminSuggestionsInline'))
const LoginModal = lazyLoad(() => import('@/components/LoginModal'))
const SelectionToolbar = lazyLoad(() => import('@/components/SelectionToolbar'))
const RouteModal = lazyLoad(() => import('@/components/RouteModal'))
const PageHeader = lazyLoad(() => import('@/components/PageHeader'))
const TrashView = lazyLoad(() => import('@/components/TrashView'))
const DesktopTableView = lazyLoad(() => import('@/components/DesktopTableView'))
const DesktopCardView = lazyLoad(() => import('@/components/DesktopCardView'))
const MobileCardList = lazyLoad(() => import('@/components/MobileCardList'))
const SearchDropdown = lazyLoad(() => import('@/components/SearchDropdown'))
const InlineAddEditView = lazyLoad(() => import('@/components/InlineAddEditView'))
const SwUpdateToast = lazyLoad(() => import('@/components/SwUpdateToast'))
const ErrorScreen = lazyLoad(() => import('@/components/ErrorScreen'))

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function TableSkeletonLoader() {
  return (
    <div className="animate-fade-in">
      <div className="flex h-10 animate-fade-in items-center gap-2 border-b bg-card px-4">
        <div className="size-5 animate-pulse-soft rounded bg-muted" />
        <div className="size-5 animate-pulse-soft rounded bg-muted" />
        <div className="flex-1" />
        <div className="h-6 w-16 animate-pulse-soft rounded bg-muted" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="size-5 animate-pulse-soft rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse-soft rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse-soft rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

function displayStep(): number {
  return typeof window !== 'undefined' && window.innerWidth >= 900 ? 20 : 10
}

export function PageClient() {
  const {
    clients,
    loading,
    error,
    displayLimit,
    selectedIds,
    selectionMode,
    initialize,
  } = useClientStore()
  const cliStore = useClientStore()
  const { search, filter, viewMode, recentCutoff, setSearch } = useFilterStore()
  const flStore = useFilterStore()
  const { isAdmin } = useAuthStore()
  const auStore = useAuthStore()
  const {
    viewState,
    routeData,
    routing,
    routeError,
    showManualOrigin,
    manualOriginLat,
    manualOriginLng,
    mapFocusId,
    copiedId,
    openCopyId,
    newClientCount,
  } = useUIStore()
  const { pendingIds: pendingSuggestionIds, refreshKey: suggestRefresh } = useSuggestionStore()
  const uiStore = useUIStore()
  const suStore = useSuggestionStore()

  const debouncedSearch = useDebounce(search, 150)
  const query = debouncedSearch.trim().toLowerCase()

  const counts = useMemo(() => {
    const total = clients.length
    const withImages = clients.filter((c) => c.images.length > 0).length
    const noImages = total - withImages
    const recent = clients.filter((c) => c.createdAt > recentCutoff).length
    return { total, withImages, noImages, recent }
  }, [clients, recentCutoff])

  const filtered = useMemo(() => {
    let result = [...clients]
    if (query) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.shopName.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query),
      )
    }
    switch (filter) {
      case FilterKey.WithImages:
        result = result.filter((c) => c.images.length > 0)
        break
      case FilterKey.NoImages:
        result = result.filter((c) => c.images.length === 0)
        break
      case FilterKey.Recent:
        result = result.filter((c) => c.createdAt > recentCutoff)
        break
    }
    return result
  }, [clients, query, filter, recentCutoff])

  useEffect(() => {
    initialize()
  }, [initialize])

  const displayed = filtered.slice(0, displayLimit)
  const hasMore = displayLimit < filtered.length

  useEffect(() => {
    cliStore.setDisplayLimit(displayStep())
  }, [debouncedSearch, filter])

  useEffect(() => {
    if (suggestRefresh > 0) {
      fetchClients()
        .then((data) => cliStore.setClients(data))
        .catch(() => {})
    }
    apiFetch('/api/suggestions?mode=pending-client-ids')
      .then((r) => r.json())
      .then((data) => suStore.setPendingIds(new Set(data)))
      .catch(() => {})
  }, [suggestRefresh])

  function clientText(client: Client) {
    const parts = [client.name]
    if (client.shopName) parts.push('\uD83C\uDFEA ' + client.shopName)
    if (client.address) parts.push('\uD83D\uDCCD ' + client.address)
    return parts.join('\n')
  }

  function flashCopied(id: string) {
    uiStore.setCopiedId(id)
    setTimeout(() => uiStore.setCopiedId(null), 1500)
  }

  const handleCopy = useCallback(
    (client: Client) => {
      copyToClipboard(clientText(client))
      flashCopied(client.id)
    },
    [],
  )

  const handleCopyTextAndMaps = useCallback(
    (client: Client) => {
      const text = clientText(client)
      if (client.lat && client.lng) {
        copyToClipboard(text + '\n' + getMapsUrl(client.lat, client.lng))
      } else {
        copyToClipboard(text)
      }
      flashCopied(client.id)
    },
    [],
  )

  const computeRoute = useCallback(
    (origin: { lat: number; lng: number }) => {
      const selected = clients.filter(
        (c) => selectedIds.has(c.id) && c.lat != null && c.lng != null,
      )
      const withDist = selected
        .map((c) => ({
          client: c,
          dist: haversineKm(origin.lat, origin.lng, c.lat!, c.lng!),
        }))
        .sort((a, b) => a.dist - b.dist)
      uiStore.setRouteData({ origin, clients: withDist })
      uiStore.setShowManualOrigin(false)
    },
    [clients, selectedIds],
  )

  const planRoute = useCallback(async () => {
    const selected = clients.filter(
      (c) => selectedIds.has(c.id) && c.lat != null && c.lng != null,
    )
    if (selected.length === 0) {
      uiStore.setRouteError('Selected clients have no location')
      uiStore.setRouteData(null)
      return
    }
    uiStore.setRouting(true)
    uiStore.setRouteError('')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        }),
      )
      computeRoute({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    } catch {
      uiStore.setShowManualOrigin(true)
    } finally {
      uiStore.setRouting(false)
    }
  }, [clients, selectedIds, computeRoute])

  const handleManualOrigin = useCallback(() => {
    const lat = parseFloat(manualOriginLat)
    const lng = parseFloat(manualOriginLng)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      uiStore.setRouteError('Invalid coordinates')
      return
    }
    computeRoute({ lat, lng })
  }, [manualOriginLat, manualOriginLng, computeRoute])

  const handleDetailUpdate = useCallback(
    async (updated: Client) => {
      try {
        const saved = await updateClient(updated)
        cliStore.updateClient(saved.id, saved)
        uiStore.openDetail(saved.id, saved)
      } catch {
        fetchClients()
          .then((data) => cliStore.setClients(data))
          .catch(() => {})
      }
    },
    [],
  )

  const handleDetailDelete = useCallback((deletedId: string) => {
    cliStore.removeClient(deletedId)
    uiStore.closeView()
  }, [])

  const navToDetail = useCallback((client: Client) => {
    uiStore.openDetail(client.id, client)
  }, [])

  const navToMap = useCallback(() => {
    uiStore.openMap()
  }, [])

  const navToAdd = useCallback(() => {
    uiStore.openAddEdit()
  }, [])

  const navToSuggestions = useCallback(() => {
    uiStore.openSuggestions()
  }, [])

  const navToTrash = useCallback(() => {
    uiStore.openTrash()
  }, [])

  const handleRefresh = useCallback(() => {
    if (cliStore.refreshing) return
    cliStore.setRefreshing(true)
    cliStore.setProgress(10)
    const prevCount = clients.length
    let p = 10
    const timer = setInterval(() => {
      p = Math.min(p + 20, 80)
      cliStore.setProgress(p)
    }, 300)
    fetchClients()
      .then((data) => {
        cliStore.setClients(data)
        if (data.length > prevCount) {
          uiStore.setNewClientCount(data.length - prevCount)
          setTimeout(() => uiStore.setNewClientCount(0), 3000)
        }
      })
      .catch(() => {})
      .finally(() => {
        clearInterval(timer)
        cliStore.setProgress(100)
        setTimeout(() => cliStore.setProgress(0), 400)
        cliStore.setRefreshing(false)
      })
  }, [clients.length])

  const handleAddEditSave = useCallback(
    async (data: Omit<Client, 'createdAt' | 'updatedAt'>) => {
      const existing = clients.find((c) => c.id === data.id)
      try {
        if (existing) {
          const updated: Client = {
            ...data,
            createdAt: existing.createdAt,
            updatedAt: Date.now(),
          }
          const saved = await updateClient(updated)
          cliStore.updateClient(saved.id, saved)
        } else {
          const nc: Client = {
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          const saved = await addClient(nc)
          cliStore.addClient(saved)
        }
        uiStore.closeView()
      } catch {
        fetchClients()
          .then((data) => cliStore.setClients(data))
          .catch(() => {})
      }
    },
    [clients],
  )

  const handleLogout = useCallback(() => {
    auStore.logout()
  }, [])

  const isListView = viewState.view === 'list'
  const showDetail = viewState.view === 'detail'
  const showMap = viewState.view === 'map'
  const showAddEdit = viewState.view === 'add-edit'
  const showSuggestions = viewState.view === 'suggestions'
  const showTrash = viewState.view === 'trash'

  if (error) return <ErrorScreen onRetry={() => fetchClients().then((d) => cliStore.setClients(d))} />

  return (
    <div className="flex min-h-screen bg-background">
      <LoginModal
        open={auStore.loginOpen}
        onClose={() => auStore.setLoginOpen(false)}
        onSuccess={() => {
          auStore.setAdmin(true)
          cliStore.initialize()
        }}
      />

      <SwUpdateToast />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {showAddEdit && (
          <InlineAddEditView
            editClient={viewState.view === 'add-edit' && viewState.editClientId ? clients.find((c) => c.id === viewState.editClientId!) ?? null : null}
            clients={clients}
            onBack={() => uiStore.closeView()}
            onSave={handleAddEditSave}
            isAdmin={isAdmin}
            onHome={() => uiStore.resetView()}
            onMap={navToMap}
            onSuggestions={navToSuggestions}
            onTrash={navToTrash}
            onLogout={handleLogout}
            onLoginOpen={() => auStore.setLoginOpen(true)}
          />
        )}

        {showDetail && (
          <>
            <PageHeader
              variant="detail"
              title="Detail"
              showBack
              onBack={() => uiStore.closeView()}
              isAdmin={isAdmin}
              onHome={() => uiStore.resetView()}
              onMap={navToMap}
              onSuggestions={navToSuggestions}
              onTrash={navToTrash}
              onLogout={handleLogout}
              onLoginOpen={() => auStore.setLoginOpen(true)}
            />
            <ClientDetail
              client={viewState.client ?? clients.find((c) => c.id === viewState.clientId)!}
              isAdmin={isAdmin}
              clients={clients}
              onClientUpdated={handleDetailUpdate}
              onClientDeleted={(id) => {
                handleDetailDelete(id)
                uiStore.resetView()
              }}
              onSuggestRefresh={() => suStore.incrementRefresh()}
            />
          </>
        )}

        {showMap && (
          <>
            <PageHeader
              variant="map"
              showBack
              onBack={() => uiStore.closeView()}
              search={search}
              onSearchChange={(v) => {
                setSearch(v)
                uiStore.setMapFocusId(null)
              }}
              onSearchClear={() => {
                setSearch('')
                uiStore.setMapFocusId(null)
              }}
              onSearchKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearch('')
                  uiStore.setMapFocusId(null)
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              searchDropdown={
                search.trim() ? (
                  <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-lg border bg-card shadow-xl">
                    <SearchDropdown
                      clients={clients}
                      query={query}
                      onSelect={(id) => {
                        setSearch('')
                        uiStore.setMapFocusId(id)
                      }}
                    />
                  </div>
                ) : undefined
              }
              isAdmin={isAdmin}
              onHome={() => uiStore.resetView()}
              onMap={navToMap}
              onSuggestions={navToSuggestions}
              onTrash={navToTrash}
              onLogout={handleLogout}
              onLoginOpen={() => auStore.setLoginOpen(true)}
            />
            <div className="relative flex-1">
              <InlineMap
                clients={filtered.filter((c) => c.lat != null && c.lng != null)}
                focusClientId={mapFocusId}
                onSelectClient={(c) => {
                  uiStore.closeView()
                  navToDetail(c)
                }}
              />
            </div>
          </>
        )}

        {showSuggestions && (
          <AdminSuggestionsInline
            onClose={() => uiStore.closeView()}
          />
        )}

        {showTrash && (
          <TrashView onClose={() => uiStore.closeView()} />
        )}

        {isListView && (
          <>
            <PageHeader
              variant="list"
              search={search}
              onSearchChange={(v) => setSearch(v)}
              onSearchClear={() => setSearch('')}
              showAddButton={isAdmin}
              onAdd={navToAdd}
              isAdmin={isAdmin}
              onHome={() => uiStore.resetView()}
              onMap={navToMap}
              onSuggestions={navToSuggestions}
              onTrash={navToTrash}
              onLogout={handleLogout}
              onLoginOpen={() => auStore.setLoginOpen(true)}
            />

            <SelectionToolbar
              viewMode={viewMode}
              onViewModeChange={(v) => flStore.setViewMode(v)}
              refreshing={cliStore.refreshing}
              onRefresh={handleRefresh}
              selectionMode={selectionMode}
              onToggleSelectionMode={() => {
                cliStore.setSelectionMode(!selectionMode)
                cliStore.setSelectedIds(new Set())
              }}
              selectedCount={selectedIds.size}
              onPlanRoute={planRoute}
              routing={routing}
              newCount={newClientCount}
              filter={filter}
              counts={counts}
              onFilter={(f) => flStore.setFilter(f)}
            />

            <div className="flex-1 overflow-auto">
              {loading && clients.length === 0 ? (
                <TableSkeletonLoader />
              ) : (
                <>
                  <div
                    className={`${viewMode === 'cards' ? 'hidden' : 'block'} max-md:hidden`}
                  >
                    <DesktopTableView
                      displayed={displayed}
                      filtered={filtered}
                      displayLimit={displayLimit}
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      pendingSuggestionIds={pendingSuggestionIds}
                      copiedId={copiedId}
                      openCopyId={openCopyId}
                      hasMore={hasMore}
                      isGlobalEmpty={clients.length === 0}
                      filter={filter}
                      search={search}
                      onSelectClient={navToDetail}
                      onToggleSelect={(id) => cliStore.toggleSelect(id)}
                      onToggleCopyDropdown={(id) =>
                        uiStore.setOpenCopyId(openCopyId === id ? null : id)
                      }
                      onCopyText={handleCopy}
                      onCopyTextAndMaps={handleCopyTextAndMaps}
                      onCloseCopyDropdown={() => uiStore.setOpenCopyId(null)}
                      onLoadMore={() => cliStore.incrementDisplayLimit(displayStep())}
                    />
                  </div>

                  <div
                    className={`${viewMode !== 'cards' ? 'hidden' : ''} max-md:hidden`}
                  >
                    <DesktopCardView
                      displayed={displayed}
                      filtered={filtered}
                      displayLimit={displayLimit}
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      pendingSuggestionIds={pendingSuggestionIds}
                      copiedId={copiedId}
                      openCopyId={openCopyId}
                      hasMore={hasMore}
                      isGlobalEmpty={clients.length === 0}
                      filter={filter}
                      search={search}
                      onSelectClient={navToDetail}
                      onToggleSelect={(id) => cliStore.toggleSelect(id)}
                      onToggleCopyDropdown={(id) =>
                        uiStore.setOpenCopyId(openCopyId === id ? null : id)
                      }
                      onCopyText={handleCopy}
                      onCopyTextAndMaps={handleCopyTextAndMaps}
                      onCloseCopyDropdown={() => uiStore.setOpenCopyId(null)}
                      onLoadMore={() => cliStore.incrementDisplayLimit(displayStep())}
                    />
                  </div>

                  <div className="md:hidden">
                    <MobileCardList
                      displayed={displayed}
                      filtered={filtered}
                      displayLimit={displayLimit}
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      isAdmin={isAdmin}
                      pendingSuggestionIds={pendingSuggestionIds}
                      copiedId={copiedId}
                      openCopyId={openCopyId}
                      hasMore={hasMore}
                      isGlobalEmpty={clients.length === 0}
                      filter={filter}
                      search={search}
                      onSelectClient={navToDetail}
                      onToggleSelect={(id) => cliStore.toggleSelect(id)}
                      onToggleCopyDropdown={(id) =>
                        uiStore.setOpenCopyId(openCopyId === id ? null : id)
                      }
                      onCopyText={handleCopy}
                      onCopyTextAndMaps={handleCopyTextAndMaps}
                      onCloseCopyDropdown={() => uiStore.setOpenCopyId(null)}
                      onLoadMore={() => cliStore.incrementDisplayLimit(displayStep())}
                    />
                  </div>
                </>
              )}
            </div>

            {isAdmin && (
              <Button
                className="fixed bottom-5 right-5 z-40 size-12 rounded-full shadow-lg md:hidden"
                size="icon"
                aria-label="Add client"
                onClick={navToAdd}
              >
                <Plus className="size-5" />
              </Button>
            )}

            <RouteModal
              routeData={routeData}
              routeError={routeError}
              onClose={() => {
                uiStore.setRouteData(null)
                uiStore.setRouteError('')
                uiStore.setShowManualOrigin(false)
              }}
              onReorder={(data) => uiStore.setRouteData(data)}
              showManualOrigin={showManualOrigin}
              manualOriginLat={manualOriginLat}
              manualOriginLng={manualOriginLng}
              onManualOriginLatChange={(v) => uiStore.setManualOriginLat(v)}
              onManualOriginLngChange={(v) => uiStore.setManualOriginLng(v)}
              onManualOriginSubmit={handleManualOrigin}
            />
          </>
        )}
      </div>

      {openCopyId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => uiStore.setOpenCopyId(null)}
        />
      )}
    </div>
  )
}
