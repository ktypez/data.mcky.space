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
 * V2Toolbar — omarchy market-toolbar pattern: one hairline strip,
 * search grows left, native sort select docked right behind a hairline.
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
    <div className="v2-panel v2-toolbar flex min-h-[44px]">
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

      <div className="v2-select">
        <label className="sr-only" htmlFor="v2-sort-select">
          Sort records
        </label>
        <select
          id="v2-sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as V2SortKey)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
