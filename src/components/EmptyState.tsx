import { MagnifyingGlass, ImageIcon, Circle, Clock } from '@phosphor-icons/react'
import { FilterKey } from '@/types'

interface EmptyStateProps {
 isGlobalEmpty: boolean
 isAdmin: boolean
 filter?: FilterKey
 search?: string
 mobile?: boolean
}

const filterIcons: Record<FilterKey, React.ReactNode> = {
 [FilterKey.All]: <MagnifyingGlass className="w-8 h-8 mx-auto mb-2 opacity-40" />,
 [FilterKey.WithImages]: <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />,
 [FilterKey.NoImages]: <Circle className="w-8 h-8 mx-auto mb-2 opacity-40" />,
 [FilterKey.Recent]: <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />,
}

const filterLabels: Record<FilterKey, string> = {
 [FilterKey.All]: 'ลูกค้า',
 [FilterKey.WithImages]: 'ลูกค้าที่มีรูป',
 [FilterKey.NoImages]: 'ลูกค้าที่ไม่มีรูป',
 [FilterKey.Recent]: 'ลูกค้าที่สร้างใน 7 วัน',
}

export default function EmptyState({
 isGlobalEmpty,
 isAdmin,
 filter = FilterKey.All,
 search,
 mobile,
}: EmptyStateProps) {
 const isFiltered = filter !== FilterKey.All
 const hasSearch = !!search?.trim()

 return (
 <div
  className={`flex items-center justify-center text-muted-foreground animate-in fade-in duration-500 ${mobile ? 'py-16' : 'py-20'}`}
 aria-live="polite"
 >
 <div className="text-center">
 {filterIcons[filter]}
 {isGlobalEmpty ? (
 <>
 <p className="text-sm font-medium">ยังไม่มีข้อมูลลูกค้า</p>
 {isAdmin && (
 <p className="text-[13px] mt-1">
 กดปุ่ม &ldquo;{mobile ? '+' : 'เพิ่ม'}&rdquo; เพื่อเริ่มต้น
 </p>
 )}
 </>
 ) : hasSearch ? (
 <>
 <p className="text-sm font-medium">ไม่พบ &ldquo;{search?.trim()}&rdquo;</p>
 <p className="text-[13px] mt-1">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
 </>
 ) : isFiltered ? (
 <>
 <p className="text-sm font-medium">ไม่มี{filterLabels[filter]}ในขณะนี้</p>
 {!mobile && (
 <p className="text-[13px] mt-1">
 ลองเลิกกรอง &ldquo;{filterLabels[filter]}&rdquo; หรือเพิ่มลูกค้าใหม่
 </p>
 )}
 </>
 ) : (
 <>
 <p className="text-sm font-medium">ไม่พบข้อมูล</p>
 {!mobile && <p className="text-[13px] mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>}
 </>
 )}
 </div>
 </div>
 )
}
