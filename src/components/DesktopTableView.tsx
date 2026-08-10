
import { memo } from 'react'
import { motion } from 'motion/react'
import type { Client, FilterKey } from '@/types'
import ClientCopyButton from '@/components/ClientCopyButton'
import EmptyState from '@/components/EmptyState'
import ClientCardBadges, { PlaceholderAvatar } from '@/components/ClientCardBadges'
import BadgeTag from '@/components/BadgeTag'
import LoadMore from '@/components/LoadMore'
import ClientNames from '@/components/ClientNames'
import { staggerContainer, staggerItem } from '@/lib/motion'

interface DesktopTableViewProps {
 displayed: Client[]
 filtered: Client[]
 displayLimit: number
 selectionMode: boolean
 selectedIds: Set<string>
copiedKey: string | null
  hasMore: boolean
  onSelectClient: (client: Client) => void
  onToggleSelect: (id: string) => void
  onCopySmart: (client: Client) => void
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
copiedKey,
  hasMore,
  onSelectClient,
  onToggleSelect,
  onCopySmart,
  onLoadMore,
  isGlobalEmpty,
  filter,
  search,
}: DesktopTableViewProps) {
 return (
  <>
  <table className="w-full border-collapse">
  <motion.tbody
    variants={staggerContainer(0.02)}
    initial="hidden"
    animate="visible"
    key={displayed.map((c) => c.id).join(',')}
  >
  {displayed.map((client) => {
  const isSelected = selectedIds.has(client.id)
  return (
  <motion.tr
   key={client.id}
   variants={staggerItem}
   onClick={() => (selectionMode ? onToggleSelect(client.id) : onSelectClient(client))}
   className={`transition-colors duration-75 cursor-pointer border-b border-border/50 ${
    isSelected
     ? 'bg-accent/10 '
     : 'bg-card hover:bg-card '
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
  />
  </div>
  ) : (
  <div className="w-8 h-8 aspect-square rounded-[4px] shrink-0 relative">
    <PlaceholderAvatar className="w-full h-full rounded-[4px]" />
    <ClientCardBadges
      hasNotes={!!client.notes}
      hasBadge={!!client.badge}
    />
  </div>
  )}
  </td>
  <td className="px-3 py-2 align-middle">
  <ClientNames
    client={client}
    titleClassName="font-semibold max-md:text-[17px] md:text-[15px] text-foreground"
    subClassName="font-sans font-medium max-md:text-[16px] md:text-[14px] text-muted-foreground mt-[1px]"
  />
  </td>
   <td className="px-3 py-2 align-middle hidden md:table-cell">
<div className="flex items-center gap-2">
  <BadgeTag badge={client.badge} size="sm" />
  <ClientCopyButton
 client={client}
 copiedKey={copiedKey}
 onCopySmart={onCopySmart}
 />
  </div>
  </td>
  </motion.tr>
  )
  })}
  </motion.tbody>
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
