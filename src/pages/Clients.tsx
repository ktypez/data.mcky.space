
import { useCallback, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'

import { Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { TableSkeletonLoader } from '@/components/TableSkeletonLoader'
import EmptyDetailPlaceholder from '@/components/EmptyDetailPlaceholder'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useFilteredClients, DISPLAY_STEP } from '@/hooks/useFilteredClients'
import { useClientCopy } from '@/hooks/useClientCopy'
import { useRoutePlanner } from '@/hooks/useRoutePlanner'
import { useMediaQuery } from '@/hooks/useMediaQuery'
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

interface ListPaneProps {
  viewMode: ViewMode
  isCardsView: boolean
  selectionMode: boolean
  selectedIds: Set<string>
  copiedId: string | null
  refreshing: boolean
  newClientCount: number
  filter: FilterKey
  search: string
  loading: boolean
  totalClients: number
  displayed: Client[]
  filtered: Client[]
  displayLimit: number
  hasMore: boolean
  isAdmin: boolean
  counts: { total: number; withImages: number; noImages: number; recent: number }
  onSelectClient: (client: Client) => void
  onToggleSelect: (id: string) => void
  onCopySmart: (client: Client) => void
  onViewModeChange: (v: ViewMode) => void
  onRefresh: () => void
  onToggleSelectionMode: () => void
  onPlanRoute: () => void
  onRouting: boolean
  onFilter: (f: FilterKey) => void
  onLoadMore: () => void
  onNavigateAdd: () => void
}

/**
 * ListPane — the left pane (desktop) or full content (mobile) that renders
 * SelectionToolbar + the appropriate list view (table / cards / mobile).
 * Owns its own scroll container, advertised as the primary scroll source
 * on desktop so the global scroll indicator tracks it.
 */
function ListPane(props: ListPaneProps) {
  const {
    viewMode,
    isCardsView,
    selectionMode,
    selectedIds,
    copiedId,
    refreshing,
    newClientCount,
    filter,
    search,
    loading,
    totalClients,
    displayed,
    filtered,
    displayLimit,
    hasMore,
    isAdmin,
    counts,
    onSelectClient,
    onToggleSelect,
    onCopySmart,
    onViewModeChange,
    onRefresh,
    onToggleSelectionMode,
    onPlanRoute,
    onRouting,
    onFilter,
    onLoadMore,
    onNavigateAdd,
  } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SelectionToolbar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        refreshing={refreshing}
        onRefresh={onRefresh}
        selectionMode={selectionMode}
        onToggleSelectionMode={onToggleSelectionMode}
        selectedCount={selectedIds.size}
        onPlanRoute={onPlanRoute}
        routing={onRouting}
        newCount={newClientCount}
        filter={filter}
        counts={counts}
        onFilter={onFilter}
      />

      <div data-pane-scroll="primary" className="flex-1 overflow-auto">
        {loading && totalClients === 0 ? (
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
                isGlobalEmpty={totalClients === 0}
                filter={filter}
                search={search}
                onSelectClient={onSelectClient}
                onToggleSelect={onToggleSelect}
                onCopySmart={onCopySmart}
                onLoadMore={onLoadMore}
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
                isGlobalEmpty={totalClients === 0}
                filter={filter}
                search={search}
                onSelectClient={onSelectClient}
                onToggleSelect={onToggleSelect}
                onCopySmart={onCopySmart}
                onLoadMore={onLoadMore}
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
                isGlobalEmpty={totalClients === 0}
                filter={filter}
                search={search}
                onSelectClient={onSelectClient}
                onToggleSelect={onToggleSelect}
                onCopySmart={onCopySmart}
                onLoadMore={onLoadMore}
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
            onClick={onNavigateAdd}
          >
            <Plus className="size-5" />
          </Button>
        </motion.div>
      )}
    </div>
  )
}

interface DetailPaneProps {
  client: Client | null
  isAdmin: boolean
  clients: Client[]
  onClientUpdated: (updated: Client) => Promise<void>
  onClientDeleted: (id: string) => void
}

/**
 * DetailPane — right pane on desktop. Owns its own scroll container
 * (independent of the left pane so selection swaps don't reset scroll
 * position in either side).
 */
function DetailPane({
  client,
  isAdmin,
  clients,
  onClientUpdated,
  onClientDeleted,
}: DetailPaneProps) {
  if (!client) return <EmptyDetailPlaceholder />
  return (
    <div data-pane-scroll="secondary" className="flex min-h-0 flex-1 flex-col">
      <ClientDetail
        client={client}
        isAdmin={isAdmin}
        clients={clients}
        onClientUpdated={onClientUpdated}
        onClientDeleted={onClientDeleted}
      />
    </div>
  )
}

export function PageClient() {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 768px)')

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
    } catch (e) {
      useClientStore
        .getState()
        .refresh()
        .catch(() => console.warn('Refresh failed after update'))
      // Re-throw so the edit form can surface the error instead of the
      // save failing silently (e.g. photo upload).
      throw e
    }
  }, [])

  const handleDetailDelete = useCallback((deletedId: string) => {
    useClientStore.getState().removeClient(deletedId)
    // Close detail (desktop: right pane goes back to placeholder; mobile: list view).
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
  const detailClient = showDetail
    ? (viewState.client ?? clients.find((c) => c.id === viewState.clientId) ?? null)
    : null

  // If detail view is open but client not found (e.g. deleted), close it
  if (showDetail && !detailClient) {
    useUIStore.getState().closeView()
    return null
  }

  if (error) return <FetchErrorScreen onRetry={handleRetry} />

  // ── Shared list-pane props ──
  const listPaneProps: ListPaneProps = {
    viewMode,
    isCardsView,
    selectionMode,
    selectedIds,
    copiedId,
    refreshing,
    newClientCount,
    filter,
    search,
    loading,
    totalClients: clients.length,
    displayed,
    filtered,
    displayLimit,
    hasMore,
    isAdmin,
    counts,
    onSelectClient: navToDetail,
    onToggleSelect: handleToggleSelect,
    onCopySmart: handleCopySmart,
    onViewModeChange: handleViewModeChange,
    onRefresh: handleRefresh,
    onToggleSelectionMode: handleToggleSelectionMode,
    onPlanRoute: planRoute,
    onRouting: routing,
    onFilter: handleFilter,
    onLoadMore: handleLoadMore,
    onNavigateAdd: () => navigate('/add'),
  }

  return (
    <>
      <SwUpdateToast />

      {isDesktop ? (
        // ── DESKTOP: 2-pane mail app layout ──
        <div className="flex min-h-0 flex-1">
          {/* Left pane: list */}
          <div className="w-[420px] shrink-0 border-r border-border flex min-h-0 flex-col">
            <ListPane {...listPaneProps} />
          </div>

          {/* Right pane: detail */}
          <div className="flex min-h-0 flex-1 flex-col bg-background">
            {showDetail && detailClient ? (
              <DetailPane
                client={detailClient}
                isAdmin={isAdmin}
                clients={clients}
                onClientUpdated={handleDetailUpdate}
                onClientDeleted={handleDetailDeleted}
              />
            ) : (
              <EmptyDetailPlaceholder />
            )}
          </div>
        </div>
      ) : (
        // ── MOBILE: full-screen takeover (unchanged) ──
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
                client={detailClient!}
                isAdmin={isAdmin}
                clients={clients}
                onClientUpdated={handleDetailUpdate}
                onClientDeleted={handleDetailDelete}
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
              <ListPane {...listPaneProps} />

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
      )}
    </>
  )
}
