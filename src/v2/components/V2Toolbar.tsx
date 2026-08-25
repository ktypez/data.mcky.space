import { useEffect, useRef } from 'react'
import { X } from '@phosphor-icons/react'

export type V2SortKey = 'updated' | 'created' | 'name'

export const SORT_OPTIONS: { value: V2SortKey; label: string }[] = [
  { value: 'updated', label: 'Recent activity' },
  { value: 'created', label: 'Newest first' },
  { value: 'name', label: 'A–Z' },
]

interface V2ToolbarProps {
  search: string
  onSearchChange: (v: string) => void
}

/**
 * V2Toolbar — borderless recessed search well with an inline ✕ clear
 * button (transparent wrapper keeps it reading as one input).
 * Sort/filter selects live in V2FilterBar.
 *
 * Shortcuts:
 * - Ctrl/Cmd+K anywhere dispatches `v2:focus-search` → focuses this input
 * - Escape clears the query, or blurs when already empty
 */
export default function V2Toolbar({ search, onSearchChange }: V2ToolbarProps) {
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
    <div className="v2-search-wrap">
      <input
        id="v2-search-input"
        ref={inputRef}
        type="search"
        className="v2-search"
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
        aria-label="Search clients"
      />
      {search && (
        <button
          type="button"
          className="v2-search-clear"
          onClick={() => onSearchChange('')}
          aria-label="Clear search"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
