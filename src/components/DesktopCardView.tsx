'use client'

import { memo } from 'react'
import { Note, CurrencyBht } from '@phosphor-icons/react'
import type { Client, FilterKey } from '@/types'
import CopyDropdown from '@/components/CopyDropdown'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/utils'
import SuggestionBadge from '@/components/SuggestionBadge'
import BadgeTag from '@/components/BadgeTag'
import LoadMore from '@/components/LoadMore'
import { Card } from '@/components/ui/card'

interface DesktopCardViewProps {
 displayed: Client[]
 filtered: Client[]
 displayLimit: number
 selectionMode: boolean
 selectedIds: Set<string>
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

const DesktopCardView = memo(function DesktopCardView({
 displayed,
 filtered,
 displayLimit,
 selectionMode,
 selectedIds,
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
}: DesktopCardViewProps) {
 return (
 <div className="max-md:hidden p-4">
 {displayed.length === 0 ? (
  <EmptyState isGlobalEmpty={isGlobalEmpty} isAdmin={false} filter={filter} search={search} />
 ) : (
 <>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
 {displayed.map((client) => {
 const isSelected = selectedIds.has(client.id)
 return (
<Card
    key={client.id}
    onClick={() =>
     selectionMode ? onToggleSelect(client.id) : onSelectClient(client)
    }
    className={`p-3.5 flex flex-col gap-2.5 overflow-visible transition-[box-shadow,transform,border-color] duration-200 cursor-pointer ${
     isSelected
      ? 'ring-2 ring-[var(--accent-blue)] border-[var(--accent-blue)]'
      : 'hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--border-hover)]'
    } ${selectionMode ? 'select-none' : ''}`}
   >
 {/* Header: photo + name + copy */}
 <div className="flex items-start gap-3">
 <div className="relative shrink-0">
 {client.images.length > 0 ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img
 src={client.images[0]}
 alt=""
 loading="lazy"
 className="w-14 h-14 aspect-square rounded-[6px] object-cover shrink-0"
 />
  ) : (
  <div className="w-14 h-14 aspect-square rounded-[6px] bg-[var(--surface-hover)] shrink-0 flex items-center justify-center text-muted-foreground/30">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></svg>
  </div>
  )}
 {pendingSuggestionIds.has(client.id) && <SuggestionBadge size="md" />}
  {client.badge && (
    <div className="absolute -top-2 -right-2 bg-[var(--destructive)] rounded-full p-1">
      <CurrencyBht className="w-3 h-3 text-[var(--destructive-foreground)]" />
    </div>
  )}
  {client.notes && (
    <div className="absolute -bottom-1 -left-1 bg-accent rounded-full p-1">
      <Note className="w-3 h-3 text-accent-foreground" />
    </div>
  )}
 </div>
  <div className="min-w-0 flex-1">
  <div className="font-semibold text-[14px] text-[var(--text-primary)] truncate">
  {client.shopName || client.name}
  </div>
   {client.shopName && (
   <div className="text-[12px] text-[var(--text-secondary)] truncate">
   {client.name}
   </div>
   )}
   </div>
 </div>

 {/* Footer: date + badge + copy */}
 <div className="flex items-center justify-between">
 <span className="font-mono text-[10px] text-[var(--text-muted)] ">
 {formatDate(client.updatedAt)}
 </span>
  <div className="flex items-center gap-1.5">
  <BadgeTag badge={client.badge} size="sm" />
  <CopyDropdown
  client={client}
  copiedId={copiedId}
  isOpen={openCopyId === client.id}
  onToggle={() => onToggleCopyDropdown(client.id)}
  onCopyText={onCopyText}
  onCopyTextAndMaps={onCopyTextAndMaps}
  onClose={onCloseCopyDropdown}
  size="sm"
  />
  </div>
 </div>
 </Card>
 )
 })}
 </div>
 {hasMore && (
 <div className="flex justify-center py-6">
 <LoadMore onClick={onLoadMore} remaining={filtered.length - displayLimit} />
 </div>
 )}
 </>
 )}
 </div>
 )
})

export default DesktopCardView
