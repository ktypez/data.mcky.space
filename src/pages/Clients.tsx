
import { useCallback, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'

import { Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { TableSkeletonLoader } from '@/components/TableSkeletonLoader'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useFilteredClients, DISPLAY_STEP } from '@/hooks/useFilteredClients'
import { useClientCopy } from '@/hooks/useClientCopy'
import { useRoutePlanner } from '@/hooks/useRoutePlanner'
import { updateClient } from '@/lib/storage'
import { slideLeft, slideRight, spring, springSmall } from '@/lib/motion'
import type { Client, FilterKey, RouteData, ViewMode } from '@/types'

function FetchErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="space-y-4 text-center">
        <p className="text-foreground">Something went wrong</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </div>
  )
}

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
const DesktopTableView = lazyLoad(() => import('@/components/DesktopTableView'))
const DesktopCardView = lazyLoad(() => import('@/components/DesktopCardView'))
const MobileCardList = lazyLoad(() => import('@/components/MobileCardList'))
const SwUpdateToast = lazyLoad(() => import('@/components/SwUpdateToast'))

export function PageClient() {
  const navigate = useNavigate()

  const {
    clients,
    loading,
    error,
    displayLimit,
    selectedIds,
    selectionMode,
    refreshing,
    initialize,
  } = useClientStore()
  const { search, filter, viewMode, setSearch } = useFilterStore()
  const { isAdmin } = useAuthStore()
  const {
    viewState,
    routeData,
    routing,
    routeError,
    showManualOrigin,
    manualOriginLat,
    manualOriginLng,
    copiedId,
    newClientCount,
  } = useUIStore()

  const { counts, filtered, displayed, hasMore } = useFilteredClients()
  const { handleCopySmart } = useClientCopy()
  const { planRoute, handleManualOrigin } = useRoutePlanner()

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleRefresh = useCallback(() => {
    const { refreshing: busy, refresh, setRefreshing, setProgress } =
      useClientStore.getState()
    if (busy) return
    setRefreshing(true)
    setProgress(10)
    const prevCount = useClientStore.getState().clients.length
    let p = 10
    const timer = setInterval(() => {
      p = Math.min(p + 20, 80)
      useClientStore.getState().setProgress(p)
    }, 300)
    refresh()
      .then((data) => {
        if (data.length > prevCount) {
          useUIStore.getState().setNewClientCount(data.length - prevCount)
          setTimeout(() => useUIStore.getState().setNewClientCount(0), 3000)
        }
      })
      .catch(() => console.warn('Refresh failed'))
      .finally(() => {
        clearInterval(timer)
        useClientStore.getState().setProgress(100)
        setTimeout(() => useClientStore.getState().setProgress(0), 400)
        useClientStore.getState().setRefreshing(false)
      })
  }, [])

  const handleDetailUpdate = useCallback(async (updated: Client) => {
    try {
      const saved = await updateClient(updated)
      const cli = useClientStore.getState()
      cli.updateClient(saved.id, saved)
      useUIStore.getState().openDetail(saved.id, saved)
    } catch {
      useClientStore
        .getState()
        .refresh()
        .catch(() => console.warn('Refresh failed after update'))
    }
  }, [])

  const handleDetailDelete = useCallback((deletedId: string) => {
    useClientStore.getState().removeClient(deletedId)
    useUIStore.getState().closeView()
  }, [])

  const navToDetail = useCallback((client: Client) => {
    useUIStore.getState().openDetail(client.id, client)
  }, [])

  const handleViewModeChange = useCallback(
    (v: ViewMode) => useFilterStore.getState().setViewMode(v),
    [],
  )
  const handleFilter = useCallback(
    (f: FilterKey) => useFilterStore.getState().setFilter(f),
    [],
  )

  const handleToggleSelectionMode = useCallback(() => {
    const { selectionMode, setSelectionMode, setSelectedIds } =
      useClientStore.getState()
    setSelectionMode(!selectionMode)
    setSelectedIds(new Set())
  }, [])

  const handleToggleSelect = useCallback(
    (id: string) => useClientStore.getState().toggleSelect(id),
    [],
  )

  const handleLoadMore = useCallback(
    () => useClientStore.getState().incrementDisplayLimit(DISPLAY_STEP),
    [],
  )

  const handleRetry = useCallback(
    () => useClientStore.getState().refresh().then(() => {}),
    [],
  )

  const handleCloseRoute = useCallback(() => {
    const ui = useUIStore.getState()
    ui.setRouteData(null)
    ui.setRouteError('')
    ui.setShowManualOrigin(false)
  }, [])

  const handleRouteReorder = useCallback(
    (data: RouteData | null) => useUIStore.getState().setRouteData(data),
    [],
  )

  const handleManualOriginLatChange = useCallback(
    (v: string) => useUIStore.getState().setManualOriginLat(v),
    [],
  )
  const handleManualOriginLngChange = useCallback(
    (v: string) => useUIStore.getState().setManualOriginLng(v),
    [],
  )

  const handleCloseDetail = useCallback(
    () => useUIStore.getState().closeView(),
    [],
  )

  const handleDetailDeleted = useCallback(
    (id: string) => {
      handleDetailDelete(id)
      useUIStore.getState().resetView()
    },
    [handleDetailDelete],
  )

  const isListView = viewState.view === 'list'
  const showDetail = viewState.view === 'detail'
  const isCardsView = viewMode === 'cards'

  if (error) return <FetchErrorScreen onRetry={handleRetry} />

  return (
    <>
      <SwUpdateToast />

      <AnimatePresence mode="wait">
        {showDetail && (
          <motion.div
            key="detail"
            variants={slideLeft}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={spring}
            className="flex min-w-0 flex-1 flex-col"
          >
            <ClientDetail
              client={viewState.client ?? clients.find((c) => c.id === viewState.clientId)!}
              isAdmin={isAdmin}
              clients={clients}
              onClientUpdated={handleDetailUpdate}
              onClientDeleted={handleDetailDeleted}
            />
          </motion.div>
        )}

        {isListView && (
          <motion.div
            key="list"
            variants={slideRight}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={spring}
            className="flex min-w-0 flex-1 flex-col"
          >
            <SelectionToolbar
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              selectionMode={selectionMode}
              onToggleSelectionMode={handleToggleSelectionMode}
              selectedCount={selectedIds.size}
              onPlanRoute={planRoute}
              routing={routing}
              newCount={newClientCount}
              filter={filter}
              counts={counts}
              onFilter={handleFilter}
            />

            <div className="flex-1 overflow-auto">
              {loading && clients.length === 0 ? (
                <TableSkeletonLoader />
              ) : (
                <>
                  <div className={`${isCardsView ? 'hidden' : 'block'} max-md:hidden`}>
                    <DesktopTableView
                      displayed={displayed}
                      filtered={filtered}
                      displayLimit={displayLimit}
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      copiedId={copiedId}
                      hasMore={hasMore}
                      isGlobalEmpty={clients.length === 0}
                      filter={filter}
                      search={search}
                      onSelectClient={navToDetail}
                      onToggleSelect={handleToggleSelect}
                      onCopySmart={handleCopySmart}
                      onLoadMore={handleLoadMore}
                    />
                  </div>

                  <div className={`${isCardsView ? '' : 'hidden'} max-md:hidden`}>
                    <DesktopCardView
                      displayed={displayed}
                      filtered={filtered}
                      displayLimit={displayLimit}
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      copiedId={copiedId}
                      hasMore={hasMore}
                      isGlobalEmpty={clients.length === 0}
                      filter={filter}
                      search={search}
                      onSelectClient={navToDetail}
                      onToggleSelect={handleToggleSelect}
                      onCopySmart={handleCopySmart}
                      onLoadMore={handleLoadMore}
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
                      copiedId={copiedId}
                      hasMore={hasMore}
                      isGlobalEmpty={clients.length === 0}
                      filter={filter}
                      search={search}
                      onSelectClient={navToDetail}
                      onToggleSelect={handleToggleSelect}
                      onCopySmart={handleCopySmart}
                      onLoadMore={handleLoadMore}
                    />
                  </div>
                </>
              )}
            </div>

            {isAdmin && (
              <motion.div
                className="fixed bottom-5 right-5 z-40 md:hidden"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springSmall}
              >
                <Button
                  className="size-12 rounded-full shadow-lg"
                  size="icon"
                  aria-label="Add client"
                  onClick={() => navigate('/add')}
                >
                  <Plus className="size-5" />
                </Button>
              </motion.div>
            )}

            <RouteModal
              routeData={routeData}
              routeError={routeError}
              onClose={handleCloseRoute}
              onReorder={handleRouteReorder}
              showManualOrigin={showManualOrigin}
              manualOriginLat={manualOriginLat}
              manualOriginLng={manualOriginLng}
              onManualOriginLatChange={handleManualOriginLatChange}
              onManualOriginLngChange={handleManualOriginLngChange}
              onManualOriginSubmit={handleManualOrigin}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
