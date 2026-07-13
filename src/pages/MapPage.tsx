'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useDebounce } from '@/hooks/useDebounce'
import PageHeader from '@/components/PageHeader'
import SearchDropdown from '@/components/SearchDropdown'

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
          c.name.toLowerCase().includes(query) ||
          c.shopName.toLowerCase().includes(query) ||
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
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        variant="map"
        showBack
        onBack={() => navigate('/')}
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setMapFocusId(null)
        }}
        onSearchClear={() => {
          setSearch('')
          setMapFocusId(null)
        }}
        onSearchKeyDown={(e) => {
          if (e.key === 'Escape') {
            setSearch('')
            setMapFocusId(null)
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
                  setMapFocusId(id)
                }}
              />
            </div>
          ) : undefined
        }
      />
      <div
        style={{ position: 'relative', height: 'calc(100dvh - 56px)' }}
        className="flex items-center justify-center bg-background text-muted-foreground"
      >
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <p className="text-sm">แผนที่ปิดชั่วคราว</p>
          <p className="text-xs text-muted-foreground/70">กำลังปรับปรุงระบบแผนที่ใหม่</p>
        </div>
      </div>
    </div>
  )
}
