import { useEffect, useRef } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'

export type V2SortKey = 'updated' | 'created' | 'name'

export const SORT_OPTIONS: { value: V2SortKey; label: string }[] = [
  { value: 'updated', label: 'Recent activity' },
  { value: 'created', label: 'Newest first' },
  { value: 'name', label: 'A–Z' },
]

interface V2ToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  sort: V2SortKey
  onSortChange: (s: V2SortKey) => void
}

/**
 * V2Toolbar — hairline search panel; sort lives OUTSIDE the panel as its own
 * chip row below, sharing V2FilterBar's label+chips layout so all control
 * rows align.
 *
 * Shortcuts:
 * - Ctrl/Cmd+K anywhere dispatches `v2:focus-search` → focuses this input
 * - Escape clears the query, or blurs when already empty
 */
export default function V2Toolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
}: V2ToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onFocusRequest = () => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    window.addEventListener('v2:focus-search', onFocusRequest)
    return () => window.removeEventListener('v2:focus-search', onFocusRequest)
  }, [])

  return (
    <>
      <div className="v2-panel v2-toolbar">
        <div className="v2-search">
          <MagnifyingGlass aria-hidden="true" />
          <label className="sr-only" htmlFor="v2-search-input">
            Search clients
          </label>
          <input
            id="v2-search-input"
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (e.currentTarget.value) {
                  onSearchChange('')
                } else {
                  e.currentTarget.blur()
                }
              }
            }}
            placeholder="search name, shop, address, id…"
            maxLength={160}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded="false"
            aria-controls="v2-registry-grid"
          />
          {search && (
            <button
              type="button"
              className="v2-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          Sort
        </span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort records">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="v2-chip"
              aria-pressed={sort === option.value}
              onClick={() => onSortChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
