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

// One-shot focus intent that survives remounts: the shortcut may fire while
// this toolbar is NOT mounted (record/editor/trash pages). The intent is
// remembered here, consumed on the next mount, and cleared whenever the
// live event listener handles it.
let pendingFocusSearch = false

/** Focus the catalog search — safe from anywhere in the v2 shell. */
export function requestSearchFocus() {
  pendingFocusSearch = true
  window.dispatchEvent(new CustomEvent('v2:focus-search'))
}

export default function V2Toolbar({ search, onSearchChange }: V2ToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onFocusRequest = () => {
      pendingFocusSearch = false
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    window.addEventListener('v2:focus-search', onFocusRequest)
    // A shortcut fired while we were unmounted → focus now.
    if (pendingFocusSearch) onFocusRequest()
    return () => window.removeEventListener('v2:focus-search', onFocusRequest)
  }, [])

  return (
    <div className="v2-search-wrap">
      <input
        id="v2-search-input"
        ref={inputRef}
        type="search"
        name="q"
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
