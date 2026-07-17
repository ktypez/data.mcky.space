
import { memo } from 'react'
import type { Client, FilterKey } from '@/types'
import CopyDropdown from '@/components/CopyDropdown'
import EmptyState from '@/components/EmptyState'
import ClientCardBadges, { PlaceholderAvatar } from '@/components/ClientCardBadges'
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
  <div className="rounded-[4px]">
  <img
   src={client.images[0]}
   alt=""
   loading="lazy"
   className="w-full h-full object-cover"
  />
  </div>
  <ClientCardBadges
    hasNotes={!!client.notes}
    hasBadge={!!client.badge}
    hasSuggestion={pendingSuggestionIds.has(client.id)}
  />
  </div>
  ) : (
  <div className="w-8 h-8 aspect-square rounded-[4px] shrink-0 relative">
    <PlaceholderAvatar className="w-full h-full rounded-[4px]" />
    <ClientCardBadges
      hasNotes={!!client.notes}
      hasBadge={!!client.badge}
      hasSuggestion={pendingSuggestionIds.has(client.id)}
    />
  </div>
  )}
  </td>
  <td className="px-3 py-2 align-middle">
  <div className="font-semibold max-md:text-[17px] md:text-[15px] text-[var(--text-primary)] ">
  {client.shopName || client.name}
  </div>
   {client.shopName && (
   <div className="font-sans font-medium max-md:text-[16px] md:text-[14px] text-[var(--text-secondary)] mt-[1px]">
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
