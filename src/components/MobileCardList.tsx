'use client'

import { memo } from 'react'
import { Note } from '@phosphor-icons/react'
import CopyDropdown from '@/components/CopyDropdown'
import EmptyState from '@/components/EmptyState'
import SuggestionBadge from '@/components/SuggestionBadge'
import LoadMore from '@/components/LoadMore'
import type { Client, FilterKey } from '@/types'
import { Card } from '@/components/ui/card'

interface MobileCardListProps {
 displayed: Client[]
 filtered: Client[]
 displayLimit: number
 selectionMode: boolean
 selectedIds: Set<string>
 isAdmin: boolean
 pendingSuggestionIds: Set<string>
 copiedId: string | null
 openCopyId: string | null
 hasMore: boolean
 isGlobalEmpty: boolean
 filter: FilterKey
 search: string
 onSelectClient: (client: Client) => void
 onToggleSelect: (id: string) => void
 onToggleCopyDropdown: (clientId: string) => void
 onCopyText: (client: Client) => void
 onCopyTextAndMaps: (client: Client) => void
 onCloseCopyDropdown: () => void
 onLoadMore: () => void
}

const MobileCardList = memo(function MobileCardList({
 displayed,
 filtered,
 displayLimit,
 selectionMode,
 selectedIds,
 isAdmin,
 pendingSuggestionIds,
 copiedId,
 openCopyId,
 hasMore,
 isGlobalEmpty,
 filter,
 search,
 onSelectClient,
 onToggleSelect,
 onToggleCopyDropdown,
 onCopyText,
 onCopyTextAndMaps,
 onCloseCopyDropdown,
 onLoadMore,
}: MobileCardListProps) {
 return (
 <div className="md:hidden p-3 space-y-2">
 {filtered.length === 0 ? (
 <EmptyState isGlobalEmpty={isGlobalEmpty} isAdmin={isAdmin} filter={filter} search={search} mobile />
 ) : (
 <>
 {displayed.map((client) => {
 const isSelected = selectedIds.has(client.id)
 return (
    <Card
      key={client.id}
      onClick={() => (selectionMode ? onToggleSelect(client.id) : onSelectClient(client))}
      className={`size-sm w-full p-2.5 flex flex-row items-center gap-2.5 overflow-visible transition-all active:shadow-md cursor-pointer ${
        isSelected ? 'ring-1 ring-[var(--accent-blue)]' : ''
      }`}
    >
 <div className={`relative shrink-0 rounded-[4px] ${client.badge ? 'ring-2 ring-destructive' : ''} ${client.badge ? 'hover:shadow-[0_0_12px_rgba(var(--destructive),0.3)]' : ''}`}>
 {client.images.length > 0 ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={client.images[0]}
 alt=""
 loading="lazy"
 className="w-12 h-12 aspect-square rounded-[4px] object-cover shrink-0"
 />
  ) : (
  <div className="w-12 h-12 aspect-square rounded-[4px] bg-[var(--surface-hover)] shrink-0 flex items-center justify-center text-muted-foreground/30">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></svg>
  </div>
  )}
 {pendingSuggestionIds.has(client.id) && <SuggestionBadge size="sm" />}
 {client.notes && (
    <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-1">
      <Note className="w-3 h-3 text-accent-foreground" />
    </div>
  )}
 </div>
  <div className="flex-1 min-w-0 text-left">
  <div className="font-semibold text-[15px] text-[var(--text-primary)] truncate">
  {client.shopName || client.name}
  </div>
  {client.shopName && (
  <div className="font-medium max-md:text-[14px] md:text-[12px] text-[var(--text-secondary)] mt-[1px] truncate">
  {client.name}
  </div>
  )}
  </div>
  <div className="shrink-0 flex flex-col items-center gap-0.5">
  <CopyDropdown
 client={client}
 copiedId={copiedId}
 isOpen={openCopyId === client.id}
 onToggle={() => onToggleCopyDropdown(client.id)}
 onCopyText={onCopyText}
 onCopyTextAndMaps={onCopyTextAndMaps}
 onClose={onCloseCopyDropdown}
 size="sm"
 mt="mt-1"
 />
 </div>
 </Card>
 )
 })}
 {hasMore && (
 <div className="flex justify-center pt-2 pb-4">
 <LoadMore onClick={onLoadMore} remaining={filtered.length - displayLimit} />
 </div>
 )}
 </>
 )}
 </div>
 )
})

export default MobileCardList
