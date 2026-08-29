import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, ArrowRight, ArrowClockwise } from '@phosphor-icons/react'
import { FilterKey } from '@/types'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useFilteredClients, DISPLAY_STEP } from '@/hooks/useFilteredClients'
import V2Toolbar, { type V2SortKey, SORT_OPTIONS } from '@/v2/components/V2Toolbar'
import V2FilterBar from '@/v2/components/V2FilterBar'
import RegistryGrid from '@/v2/components/RegistryGrid'
import V2RayCanvas from '@/v2/components/V2RayCanvas'

function sortName(c: { name: string[]; shopName: string[] }): string {
  return (c.name[0] || c.shopName[0] || '').trim()
}

// Read once at mount — seeds local + store state from ?q=&filter=&sort=
const initialParams = new URLSearchParams(window.location.search)

export default function V2Catalog() {
  const navigate = useNavigate()
  const [sort, setSort] = useState<V2SortKey>(() => {
    const p = initialParams.get('sort')
    return SORT_OPTIONS.some((o) => o.value === p) ? (p as V2SortKey) : 'updated'
  })

  const clients = useClientStore((s) => s.clients)
  const loading = useClientStore((s) => s.loading)
  const error = useClientStore((s) => s.error)

  const search = useFilterStore((s) => s.search)
  const setSearch = useFilterStore((s) => s.setSearch)
  const filter = useFilterStore((s) => s.filter)
  const setFilter = useFilterStore((s) => s.setFilter)

  // Deep-link seed: hydrate the shared filter store once on first mount
  useEffect(() => {
    const q = initialParams.get('q')
    if (q) setSearch(q)
    const f = initialParams.get('filter')
    if (f && Object.values(FilterKey).includes(f as FilterKey)) {
      setFilter(f as FilterKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect state in the URL (replaceState, debounced for typing)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (filter !== FilterKey.All) params.set('filter', filter)
      if (sort !== 'updated') params.set('sort', sort)
      const qs = params.toString()
      window.history.replaceState(
        null,
        '',
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      )
    }, 250)
    return () => clearTimeout(t)
  }, [search, filter, sort])

  // Shared engine with the classic list — debounce, counts, filter, windowing
  const { counts, filtered, displayed, hasMore, displayLimit } = useFilteredClients()

  // v2-only presentation sort on top of the shared filter pipeline
  const sorted = useMemo(() => {
    if (sort === 'updated') return displayed
    const arr = [...displayed]
    if (sort === 'created') {
      arr.sort((a, b) => b.createdAt - a.createdAt)
    } else {
      arr.sort((a, b) => sortName(a).localeCompare(sortName(b), 'th'))
    }
    return arr
  }, [displayed, sort])

  const isFiltering =
    search.trim().length > 0 || filter !== FilterKey.All
  const globalEmpty = clients.length === 0 && !loading && !error
  const noResults = !globalEmpty && !loading && filtered.length === 0

  const loadMoreRef = useRef<HTMLButtonElement>(null)
  // Viewport Y of the load-more button at click time. Rows append BELOW it,
  // so the layout effect below scrolls the button back to this exact spot.
  const loadMoreAnchorRef = useRef<number | null>(null)

  const loadMore = () => {
    const btn = loadMoreRef.current
    if (btn) loadMoreAnchorRef.current = btn.getBoundingClientRect().top
    useClientStore.getState().setDisplayLimit(displayLimit + DISPLAY_STEP)
  }

  // Keep the button pinned in the viewport after its own click grows the
  // grid — without this, each "load more" pushes the button further down
  // and the user has to scroll after every single click.
  useLayoutEffect(() => {
    const btn = loadMoreRef.current
    const anchor = loadMoreAnchorRef.current
    loadMoreAnchorRef.current = null
    if (!btn || anchor === null) return
    const delta = btn.getBoundingClientRect().top - anchor
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta })
  }, [displayLimit])

  const resetAll = () => {
    setSearch('')
    setFilter(FilterKey.All)
  }

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[1100px] px-5 pt-10 pb-28 md:px-8">
      {/* Hero — copy left, parametric widget right (desktop) */}
      <section aria-labelledby="v2-catalog-title" className="flex items-start justify-between gap-8">
        <div className="v2-fade-up min-w-0">
          <p className="v2-eyebrow">
            <span className="v2-ord">00</span>
            <span className="v2-dot-mid">·</span>Personal registry
          </p>
          <h1 id="v2-catalog-title" className="v2-title">
            client <em>index</em>
          </h1>
          <p className="v2-meta mt-4" role="status" aria-live="polite">
            {loading ? (
              <span>loading registry…</span>
            ) : (
              <>
                <span>
                  {isFiltering ? `${filtered.length} / ${counts.total}` : counts.total} records
                </span>
                {hasMore && <span>showing {sorted.length}</span>}
                {filter !== FilterKey.All && <span>filtered</span>}
              </>
            )}
          </p>
        </div>
        <div className="v2-fade-up v2-delay-1 hidden w-[220px] shrink-0 md:block">
          <V2RayCanvas />
        </div>
      </section>

      {/* Toolbar + filters */}
      {!globalEmpty && (
        <>
          <div className="v2-fade-up v2-delay-2 mt-8">
            <V2Toolbar search={search} onSearchChange={setSearch} />
            <V2FilterBar
              filter={filter}
              counts={counts}
              onChange={setFilter}
              sort={sort}
              onSortChange={setSort}
            />
          </div>

          {/* Grid */}
          <RegistryGrid clients={sorted} totalCount={counts.total} />

          {/* Load more */}
          {hasMore && (
            <button ref={loadMoreRef} type="button" className="v2-loadmore mt-px" onClick={loadMore}>
              <span>load more</span>
              <span className="text-muted-foreground/70 tabular-nums">
                {filtered.length - displayLimit} remaining
              </span>
            </button>
          )}

          {/* No results after filtering */}
          {noResults && (
            <div className="mt-6 flex min-h-[220px] flex-col items-center justify-center border border-dashed border-border px-6 py-12 text-center">
              <MagnifyingGlass className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-3 font-mono text-base font-semibold">no records found</h2>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                {search.trim()
                  ? `ไม่พบอะไรที่ตรงกับ “${search.trim()}” ในตัวกรองปัจจุบัน`
                  : 'ตัวกรองปัจจุบันไม่มีเรคคอร์ด'}
              </p>
              <button type="button" className="v2-btn mt-5" onClick={resetAll}>
                clear filters ×
              </button>
            </div>
          )}
        </>
      )}

      {/* Global empty — nothing in the registry at all */}
      {globalEmpty && (
        <div className="mt-10 flex min-h-[260px] flex-col items-center justify-center border border-dashed border-border px-6 py-14 text-center">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">
            registry empty
          </p>
          <h2 className="mt-3 font-mono text-lg font-semibold">ยังไม่มีเรคคอร์ด</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            เพิ่มลูกค้าคนแรกได้เลย — บันทึกแล้วจะโผล่ใน registry ทันที
          </p>
          <button type="button" className="v2-btn v2-btn-accent mt-6" onClick={() => navigate('/v2/add')}>
            add first entry
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="mt-10 flex min-h-[200px] flex-col items-center justify-center border border-destructive px-6 py-12 text-center">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase" style={{ color: 'var(--destructive)' }}>
            load failed
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button type="button" className="v2-btn mt-5" onClick={() => window.location.reload()}>
            <ArrowClockwise className="h-3.5 w-3.5" aria-hidden="true" />
            retry
          </button>
        </div>
      )}
    </div>
  )
}
