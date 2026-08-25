import { useEffect, useRef } from 'react'
import { MagnifyingGlass, CaretDown } from '@phosphor-icons/react'
import { PopoverMenu } from '@/components/ui/popover-menu'

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
 * V2Toolbar — search on top, sort rendered as a compact filter chip below
 * using a custom PopoverMenu (no native select / system dialog).
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

  const currentLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort'

  const sortTrigger = (
    <button
      type="button"
      className="v2-sort-trigger"
      aria-label="Sort records"
      aria-haspopup="listbox"
      aria-expanded="false"
    >
      <span>{currentLabel}</span>
      <CaretDown className="h-3 w-3" aria-hidden="true" />
    </button>
  )

  return (
    <div className="v2-panel v2-toolbar flex flex-col gap-2 p-2">
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

      <div className="v2-filter-bar">
        <PopoverMenu trigger={sortTrigger} position="right-edge">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={sort === option.value}
              className={`v2-sort-menu-item ${sort === option.value ? 'is-active' : ''}`}
              onClick={() => onSortChange(option.value)}
            >
              <span>{option.label}</span>
              {sort === option.value && (
                <span className="v2-sort-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </PopoverMenu>
      </div>
    </div>
  )
}
