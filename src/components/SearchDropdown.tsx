
import { memo } from 'react'
import type { Client } from '@/types'

interface Props {
  clients: Client[]
  query: string
  onSelect: (id: string) => void
}

const SearchDropdown = memo(function SearchDropdown({ clients, query, onSelect }: Props) {
  const results = clients
    .filter((c) => c.lat != null && c.lng != null && !Number.isNaN(c.lat) && !Number.isNaN(c.lng))
    .filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.shopName.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query),
    )
  if (results.length === 0)
    return <div className="p-3 text-xs text-muted-foreground">ไม่พบผลลัพธ์</div>
  return results.map((c) => (
    <button
      key={c.id}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(c.id)}
      className="w-full text-left px-3 py-2 text-xs hover:bg-card transition-colors border-b border-border last:border-b-0"
    >
      <div className="font-medium text-foreground">{c.shopName || c.name}</div>
      <div className="text-[12px] text-muted-foreground truncate">{c.address}</div>
    </button>
  ))
})

export default SearchDropdown
