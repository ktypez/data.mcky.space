
import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useDebounce } from '@/hooks/useDebounce'
import { hasValidCoords } from '@/lib/utils'
import { clientMatchesQuery } from '@/lib/clientNames'
import SearchDropdown from '@/components/SearchDropdown'

const InlineMap = lazy(() => import('@/components/InlineMap'))

export default function MapPage() {
  const navigate = useNavigate()
  const { clients, initialize } = useClientStore()
  const { search, setSearch } = useFilterStore()
  const { isAdmin } = useAuthStore()
  const { mapFocusId, setMapFocusId } = useUIStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  const debouncedSearch = useDebounce(search, 150)
  const query = debouncedSearch.trim().toLowerCase()

  const filtered = useMemo(() => {
    let result = [...clients]
    if (query) {
      result = result.filter(
        (c) =>
          clientMatchesQuery(c, query) ||
          c.address.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query),
      )
    }
    return result
  }, [clients, query])

  const navigateToClient = useCallback((client: import('@/types').Client) => {
    navigate(`/c/${client.id}`)
  }, [navigate])

  return (
    <div className="relative flex-1 min-h-0">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            กำลังโหลดแผนที่…
          </div>
        }
      >
        <InlineMap
          clients={filtered.filter((c) => hasValidCoords(c.lat, c.lng))}
          focusClientId={mapFocusId}
          onSelectClient={navigateToClient}
        />
      </Suspense>
    </div>
  )
}
