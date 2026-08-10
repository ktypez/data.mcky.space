
import { memo } from 'react'
import { motion } from 'motion/react'
import type { Client, FilterKey } from '@/types'
import ClientCopyButton from '@/components/ClientCopyButton'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/utils'
import ClientCardBadges, { PlaceholderAvatar } from '@/components/ClientCardBadges'
import BadgeTag from '@/components/BadgeTag'
import LoadMore from '@/components/LoadMore'
import { Card } from '@/components/ui/card'
import { staggerContainer, staggerItem } from '@/lib/motion'

interface DesktopCardViewProps {
 displayed: Client[]
 filtered: Client[]
 displayLimit: number
 selectionMode: boolean
 selectedIds: Set<string>
copiedKey: string | null
  hasMore: boolean
  isGlobalEmpty: boolean
  filter: FilterKey
  search: string
  onSelectClient: (client: Client) => void
  onToggleSelect: (id: string) => void
  onCopySmart: (client: Client) => void
  onLoadMore: () => void
}

const DesktopCardView = memo(function DesktopCardView({
 displayed,
 filtered,
 displayLimit,
 selectionMode,
 selectedIds,
copiedKey,
  hasMore,
  isGlobalEmpty,
  filter,
  search,
  onSelectClient,
  onToggleSelect,
  onCopySmart,
  onLoadMore,
}: DesktopCardViewProps) {
 return (
 <div className="max-md:hidden p-4">
 {displayed.length === 0 ? (
  <EmptyState isGlobalEmpty={isGlobalEmpty} isAdmin={false} filter={filter} search={search} />
 ) : (
 <>
 <motion.div
   className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
   variants={staggerContainer(0.03)}
   initial="hidden"
   animate="visible"
   key={displayed.map((c) => c.id).join(',')}
 >
 {displayed.map((client) => {
 const isSelected = selectedIds.has(client.id)
 return (
 <motion.div key={client.id} variants={staggerItem}>
 <Card
     onClick={() =>
      selectionMode ? onToggleSelect(client.id) : onSelectClient(client)
     }
     className={`p-3.5 flex flex-col gap-2.5 overflow-visible transition-[box-shadow,transform,border-color] duration-200 cursor-pointer ${
      isSelected
       ? 'ring-2 ring-accent border-accent'
       : 'hover:shadow-lg hover:-translate-y-0.5 hover:border-border/80'
     } ${selectionMode ? 'select-none' : ''}`}
    >
 {/* Header: photo + name + copy */}
 <div className="flex items-start gap-3">
 <div className="relative shrink-0">
 {client.images.length > 0 ? (
 <img
 src={client.images[0]}
 alt=""
 loading="lazy"
 className="w-14 h-14 aspect-square rounded-[6px] object-cover shrink-0"
 />
  ) : (
  <PlaceholderAvatar className="w-14 h-14 aspect-square rounded-[6px] shrink-0" />
  )}
 <ClientCardBadges
   hasNotes={!!client.notes}
   hasBadge={!!client.badge}
 />
 </div>
  <div className="min-w-0 flex-1">
  <div className="font-semibold text-[16px] text-foreground truncate">
  {client.shopName || client.name}
  </div>
   {client.shopName && (
   <div className="text-[14px] text-muted-foreground truncate">
   {client.name}
   </div>
   )}
   </div>
 </div>

 {/* Footer: date + badge + copy */}
 <div className="flex items-center justify-between">
 <span className="font-mono text-[12px] text-muted-foreground ">
 {formatDate(client.updatedAt)}
 </span>
  <div className="flex items-center gap-1.5">
  <BadgeTag badge={client.badge} size="sm" />
  <ClientCopyButton
  client={client}
  copiedKey={copiedKey}
  onCopySmart={onCopySmart}
  />
  </div>
 </div>
 </Card>
 </motion.div>
 )
 })}
 </motion.div>
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
