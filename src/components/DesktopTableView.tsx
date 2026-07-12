'use client'

import { memo } from 'react'
import { Note, CurrencyDollar } from '@phosphor-icons/react'
import type { Client, FilterKey } from '@/types'
import CopyDropdown from '@/components/CopyDropdown'
import EmptyState from '@/components/EmptyState'
import SuggestionBadge from '@/components/SuggestionBadge'
import BadgeTag from '@/components/BadgeTag'
import LoadMore from '@/components/LoadMore'

interface DesktopTableViewProps {
 displayed: Client[]
 filtered: Client[]
 displayLimit: number
 selectionMode: boolean
 selectedIds: Set<string>
 pendingSuggestionIds: Set<string>
 copiedId: string | null
 openCopyId: string | null
 hasMore: boolean
 onSelectClient: (client: Client) => void
 onToggleSelect: (id: string) => void
 onToggleCopyDropdown: (clientId: string) => void
 onCopyText: (client: Client) => void
 onCopyTextAndMaps: (client: Client) => void
 onCloseCopyDropdown: () => void
 onLoadMore: () => void
 isGlobalEmpty: boolean
 filter: FilterKey
 search: string
}

const DesktopTableView = memo(function DesktopTableView({
 displayed,
 filtered,
 displayLimit,
 selectionMode,
 selectedIds,
 pendingSuggestionIds,
 copiedId,
 openCopyId,
 hasMore,
 onSelectClient,
 onToggleSelect,
 onToggleCopyDropdown,
 onCopyText,
 onCopyTextAndMaps,
 onCloseCopyDropdown,
 onLoadMore,
 isGlobalEmpty,
 filter,
 search,
}: DesktopTableViewProps) {
 return (
  <>
  <table className="w-full border-collapse">
  <tbody>
  {displayed.map((client) => {
  const isSelected = selectedIds.has(client.id)
  return (
  <tr
   key={client.id}
   onClick={() => (selectionMode ? onToggleSelect(client.id) : onSelectClient(client))}
   className={`transition-colors duration-75 cursor-pointer border-b border-[var(--surface-hover)] ${
    isSelected
     ? 'bg-[var(--selection-bg)] '
     : 'bg-[var(--card)] hover:bg-[var(--surface)] '
   }`}
  >
  <td className="px-3 py-2 align-middle w-10 shrink-0 relative">
  {client.images.length > 0 ? (
  <div className="w-8 h-8 aspect-square rounded-[4px] overflow-hidden shrink-0 relative">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <div className="rounded-[4px]">
  <img
   src={client.images[0]}
   alt=""
   loading="lazy"
   className="w-full h-full object-cover"
  />
  </div>
 <div className="absolute bottom-0 right-0 z-20 flex flex-row-reverse items-center gap-0.5">
  {client.notes && (
    <div className="rounded-full bg-green-500 p-0.5">
      <Note className="w-2.5 h-2.5 text-white" />
    </div>
  )}
  {client.badge && (
    <div className="rounded-full bg-[var(--destructive)] p-0.5">
      <CurrencyDollar className="w-2.5 h-2.5 text-[var(--destructive-foreground)]" />
    </div>
  )}
  {pendingSuggestionIds.has(client.id) && (
    <SuggestionBadge size="sm" />
  )}
 </div>
  </div>
  ) : (
  <div className="w-8 h-8 aspect-square rounded-[4px] bg-[var(--surface-hover)] shrink-0 flex items-center justify-center text-muted-foreground/30 relative">
   <div className="rounded-[4px]">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></svg>
   </div>
 <div className="absolute bottom-0 right-0 z-20 flex flex-row-reverse items-center gap-0.5">
  {client.notes && (
    <div className="rounded-full bg-green-500 p-0.5">
      <Note className="w-2.5 h-2.5 text-white" />
    </div>
  )}
  {client.badge && (
    <div className="rounded-full bg-[var(--destructive)] p-0.5">
      <CurrencyDollar className="w-2.5 h-2.5 text-[var(--destructive-foreground)]" />
    </div>
  )}
  {pendingSuggestionIds.has(client.id) && (
    <SuggestionBadge size="sm" />
  )}
 </div>
  </div>
  )}
  </td>
  <td className="px-3 py-2 align-middle">
  <div className="font-semibold max-md:text-[15px] md:text-[13px] text-[var(--text-primary)] ">
  {client.shopName || client.name}
  </div>
   {client.shopName && (
   <div className="font-sans font-medium max-md:text-[14px] md:text-[12px] text-[var(--text-secondary)] mt-[1px]">
   {client.name}
   </div>
   )}
   </td>
   <td className="px-3 py-2 align-middle hidden md:table-cell">
   <div className="flex items-center gap-2" data-copy-dropdown="true">
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
  </td>
  </tr>
  )
  })}
  </tbody>
  </table>

  {filtered.length === 0 && <EmptyState isGlobalEmpty={isGlobalEmpty} isAdmin={false} filter={filter} search={search} />}
  {hasMore && (
  <div className="flex justify-center py-6">
  <LoadMore onClick={onLoadMore} remaining={filtered.length - displayLimit} />
  </div>
  )}
  </>
 )
})

export default DesktopTableView
