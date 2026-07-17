
import { useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'

import { Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useSuggestionStore } from '@/stores/suggestion-store'
import { useDebounce } from '@/hooks/useDebounce'
import { updateClient } from '@/lib/storage'
import { apiFetch } from '@/lib/api'
import { copyToClipboard, getMapsUrl } from '@/lib/utils'
function FetchErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <p className="text-foreground">Something went wrong</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </div>
  )
}
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
const SelectionToolbar = lazyLoad(() => import('@/components/SelectionToolbar'))
const RouteModal = lazyLoad(() => import('@/components/RouteModal'))
const PageHeader = lazyLoad(() => import('@/components/PageHeader'))
const DesktopTableView = lazyLoad(() => import('@/components/DesktopTableView'))
const DesktopCardView = lazyLoad(() => import('@/components/DesktopCardView'))
const MobileCardList = lazyLoad(() => import('@/components/MobileCardList'))
const SwUpdateToast = lazyLoad(() => import('@/components/SwUpdateToast'))

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
  return 20
}

export function PageClient() {
  const navigate = useNavigate()
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

  const debouncedSearch = useDebounce(search, 50)
  const query = debouncedSearch.trim().toLowerCase()

  const counts = useMemo(() => {
    const total = clients.length
    const withImages = clients.filter((c) => c.images.length > 0).length
    const noImages = total - withImages
    const recent = clients.filter((c) => c.createdAt > recentCutoff).length
    const penpay = clients.filter((c) => c.badge === 'penpay').length
    return { total, withImages, noImages, recent, penpay }
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
      case FilterKey.Penpay:
        result = result.filter((c) => c.badge === 'penpay')
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
      cliStore.refresh()
        .then(() => {})
        .catch(() => console.warn('Refresh failed'))
    }
    apiFetch('/api/suggestions?mode=pending-client-ids')
      .then((r) => r.json())
      .then((data) => suStore.setPendingIds(new Set(data)))
      .catch(() => console.warn('Failed to fetch pending suggestions'))
  }, [suggestRefresh])

  function clientText(client: Client) {
    const parts: string[] = []
    parts.push('\uD83D\uDC64 : ' + client.name)
    if (client.shopName) parts.push('\uD83D\uDED2 : ' + client.shopName)
    if (client.address) parts.push('\uD83D\uDCCC : ' + client.address)
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
        copyToClipboard(text + '\n' + '\uD83D\uDDFA\uFE0F : ' + getMapsUrl(client.lat, client.lng))
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
        (c) => selectedIds.has(c.id) && c.lat != null && c.lng != null && !Number.isNaN(c.lat) && !Number.isNaN(c.lng),
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
      (c) => selectedIds.has(c.id) && c.lat != null && c.lng != null && !Number.isNaN(c.lat) && !Number.isNaN(c.lng),
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
        cliStore.refresh()
          .then(() => {})
          .catch(() => console.warn('Refresh failed after update'))
      }
    },
    [cliStore],
  )

  const handleDetailDelete = useCallback((deletedId: string) => {
    cliStore.removeClient(deletedId)
    uiStore.closeView()
  }, [])

  const navToDetail = useCallback((client: Client) => {
    uiStore.openDetail(client.id, client)
  }, [])

  const navToAdd = useCallback(() => {
    navigate('/add')
  }, [navigate])

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
    cliStore.refresh()
      .then((data) => {
        if (data.length > prevCount) {
          uiStore.setNewClientCount(data.length - prevCount)
          setTimeout(() => uiStore.setNewClientCount(0), 3000)
        }
      })
      .catch(() => console.warn('Refresh failed'))
      .finally(() => {
        clearInterval(timer)
        cliStore.setProgress(100)
        setTimeout(() => cliStore.setProgress(0), 400)
        cliStore.setRefreshing(false)
      })
  }, [clients.length])

  const isListView = viewState.view === 'list'
  const showDetail = viewState.view === 'detail'

  if (error) return <FetchErrorScreen onRetry={() => cliStore.refresh().then(() => {})} />

  return (
    <div className="flex min-h-screen bg-background">
      <SwUpdateToast />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {showDetail && (
          <>
            <PageHeader
              variant="detail"
              title="Detail"
              showBack
              onBack={() => uiStore.closeView()}
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

        {isListView && (
          <>
            <PageHeader
              variant="list"
              search={search}
              onSearchChange={(v) => setSearch(v)}
              onSearchClear={() => setSearch('')}
              showAddButton={isAdmin}
              onAdd={navToAdd}
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
