import { FilterKey } from '@/types'
import V2Select from '@/v2/components/V2Select'
import { SORT_OPTIONS, type V2SortKey } from '@/v2/components/V2Toolbar'

export interface V2FilterCounts {
  total: number
  withImages: number
  noImages: number
  recent: number
  penpay: number
}

interface V2FilterBarProps {
  filter: FilterKey
  counts: V2FilterCounts
  onChange: (f: FilterKey) => void
  sort: V2SortKey
  onSortChange: (s: V2SortKey) => void
}

const FILTER_ITEMS: {
  key: FilterKey
  label: string
  countOf: (c: V2FilterCounts) => number
}[] = [
  { key: FilterKey.All, label: 'All', countOf: (c) => c.total },
  { key: FilterKey.WithImages, label: 'With photos', countOf: (c) => c.withImages },
  { key: FilterKey.NoImages, label: 'No photos', countOf: (c) => c.noImages },
  { key: FilterKey.Recent, label: 'Recent', countOf: (c) => c.recent },
  { key: FilterKey.Penpay, label: 'Penpay', countOf: (c) => c.penpay },
]

/**
 * V2FilterBar — one controls row under the search panel:
 * mono "SORT"/"FILTER" labels + custom popover selects (no native dialog).
 */
export default function V2FilterBar({
  filter,
  counts,
  onChange,
  sort,
  onSortChange,
}: V2FilterBarProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          Sort
        </span>
        <V2Select
          ariaLabel="Sort records"
          value={sort}
          options={SORT_OPTIONS}
          onChange={onSortChange}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          Filter
        </span>
        <V2Select
          ariaLabel="Filter records"
          value={filter}
          options={FILTER_ITEMS.map(({ key, label, countOf }) => ({
            value: key,
            label,
            hint: countOf(counts),
          }))}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
