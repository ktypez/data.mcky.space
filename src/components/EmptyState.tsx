import { MagnifyingGlass, ImageIcon, Circle, Clock, CurrencyDollar } from '@phosphor-icons/react'
import { FilterKey } from '@/types'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/lib/motion'

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
  [FilterKey.Penpay]: <CurrencyDollar className="w-8 h-8 mx-auto mb-2 opacity-40" />,
  [FilterKey.Credit]: <CurrencyDollar className="w-8 h-8 mx-auto mb-2 opacity-40" />,
}

const filterLabels: Record<FilterKey, string> = {
  [FilterKey.All]: 'ลูกค้า',
  [FilterKey.WithImages]: 'ลูกค้าที่มีรูป',
  [FilterKey.NoImages]: 'ลูกค้าที่ไม่มีรูป',
  [FilterKey.Recent]: 'ลูกค้าที่สร้างใน 7 วัน',
  [FilterKey.Penpay]: 'ลูกค้าจ่ายในวัน',
  [FilterKey.Credit]: 'ลูกค้าบัตรเครดิต',
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
   className={`flex items-center justify-center text-muted-foreground ${mobile ? 'py-16' : 'py-20'}`}
   aria-live="polite"
  >
   <motion.div
    className="text-center"
    variants={staggerContainer(0.06)}
    initial="hidden"
    animate="visible"
   >
   <motion.div variants={staggerItem}>{filterIcons[filter]}</motion.div>
   {isGlobalEmpty ? (
   <>
   <motion.p variants={staggerItem} className="text-sm font-medium">ยังไม่มีข้อมูลลูกค้า</motion.p>
   {isAdmin && (
   <motion.p variants={staggerItem} className="text-[13px] mt-1">
    กดปุ่ม &ldquo;{mobile ? '+' : 'เพิ่ม'}&rdquo; เพื่อเริ่มต้น
   </motion.p>
   )}
   </>
   ) : hasSearch ? (
   <>
   <motion.p variants={staggerItem} className="text-sm font-medium">ไม่พบ &ldquo;{search?.trim()}&rdquo;</motion.p>
   <motion.p variants={staggerItem} className="text-[13px] mt-1">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</motion.p>
   </>
   ) : isFiltered ? (
   <>
   <motion.p variants={staggerItem} className="text-sm font-medium">ไม่มี{filterLabels[filter]}ในขณะนี้</motion.p>
   {!mobile && (
   <motion.p variants={staggerItem} className="text-[13px] mt-1">
    ลองเลิกกรอง &ldquo;{filterLabels[filter]}&rdquo; หรือเพิ่มลูกค้าใหม่
   </motion.p>
   )}
   </>
   ) : (
   <>
   <motion.p variants={staggerItem} className="text-sm font-medium">ไม่พบข้อมูล</motion.p>
   {!mobile && <motion.p variants={staggerItem} className="text-[13px] mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</motion.p>}
   </>
   )}
   </motion.div>
  </div>
  )
}
