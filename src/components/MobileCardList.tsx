
import { memo } from 'react'
import { motion } from 'motion/react'
import ClientCopyButton from '@/components/ClientCopyButton'
import EmptyState from '@/components/EmptyState'
import ClientCardBadges, { PlaceholderAvatar } from '@/components/ClientCardBadges'
import LoadMore from '@/components/LoadMore'
import type { Client, FilterKey } from '@/types'
import { clientTitle, clientSubNames } from '@/lib/clientNames'
import { Card } from '@/components/ui/card'
import { staggerContainer, staggerItem } from '@/lib/motion'

interface MobileCardListProps {
 displayed: Client[]
 filtered: Client[]
 displayLimit: number
 selectionMode: boolean
selectedIds: Set<string>
  isAdmin: boolean
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

const MobileCardList = memo(function MobileCardList({
 displayed,
 filtered,
 displayLimit,
 selectionMode,
selectedIds,
  isAdmin,
copiedKey,
  hasMore,
  isGlobalEmpty,
  filter,
  search,
  onSelectClient,
  onToggleSelect,
  onCopySmart,
  onLoadMore,
}: MobileCardListProps) {
 return (
 <div className="md:hidden p-3 space-y-2">
 {filtered.length === 0 ? (
 <EmptyState isGlobalEmpty={isGlobalEmpty} isAdmin={isAdmin} filter={filter} search={search} mobile />
 ) : (
 <>
 <motion.div
   className="space-y-2"
   variants={staggerContainer(0.02)}
   initial="hidden"
   animate="visible"
   key={displayed.map((c) => c.id).join(',')}
 >
 {displayed.map((client) => {
 const isSelected = selectedIds.has(client.id)
 return (
   <motion.div key={client.id} variants={staggerItem}>
     <Card
       onClick={() => (selectionMode ? onToggleSelect(client.id) : onSelectClient(client))}
       className={`size-sm w-full p-2.5 flex flex-row items-center gap-2.5 overflow-visible transition-all active:shadow-md cursor-pointer ${
         isSelected ? 'ring-1 ring-accent' : ''
       }`}
     >
 <div className="relative shrink-0">
 {client.images.length > 0 ? (
 <img
 src={client.images[0]}
 alt=""
 loading="lazy"
 className="w-12 h-12 aspect-square rounded-[4px] object-cover shrink-0"
 />
  ) : (
  <PlaceholderAvatar className="w-12 h-12 aspect-square rounded-[4px] shrink-0" />
  )}
 <ClientCardBadges
   hasNotes={!!client.notes}
   hasBadge={!!client.badge}
 />
 </div>
   <div className="flex-1 min-w-0 text-left">
   <div className="font-semibold text-[17px] text-foreground truncate">
   {clientTitle(client)}
   </div>
   {clientSubNames(client) && (
   <div className="font-medium max-md:text-[16px] md:text-[14px] text-muted-foreground mt-[1px] truncate">
   {clientSubNames(client)}
   </div>
   )}
   </div>
<div className="shrink-0">
  <ClientCopyButton
 client={client}
 copiedKey={copiedKey}
 onCopySmart={onCopySmart}
 />
  </div>
 </Card>
 </motion.div>
 )
 })}
 </motion.div>
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
