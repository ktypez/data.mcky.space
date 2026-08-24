import { FilterKey } from '@/types'

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
}

const CHIPS: { key: FilterKey; label: string; countOf: (c: V2FilterCounts) => number }[] = [
  { key: FilterKey.All, label: 'All', countOf: (c) => c.total },
  { key: FilterKey.WithImages, label: 'With photos', countOf: (c) => c.withImages },
  { key: FilterKey.NoImages, label: 'No photos', countOf: (c) => c.noImages },
  { key: FilterKey.Recent, label: 'Recent', countOf: (c) => c.recent },
  { key: FilterKey.Penpay, label: 'Penpay', countOf: (c) => c.penpay },
]

/**
 * V2FilterBar — omarchy source/category bar: mono "FILTER" label,
 * chip row with live counts, reset appears only when non-default.
 */
export default function V2FilterBar({ filter, counts, onChange }: V2FilterBarProps) {
  const isDefault = filter === FilterKey.All

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        Filter
      </span>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter records">
        {CHIPS.map(({ key, label, countOf }) => (
          <button
            key={key}
            type="button"
            className="v2-chip"
            aria-pressed={filter === key}
            onClick={() => onChange(key)}
          >
            {label}
            <span className="v2-chip-count">{countOf(counts)}</span>
          </button>
        ))}

        {!isDefault && (
          <button
            type="button"
            className="v2-chip !text-primary hover:!bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]"
            onClick={() => onChange(FilterKey.All)}
            aria-label="Reset filters"
          >
            reset ×
          </button>
        )}
      </div>
    </div>
  )
}
