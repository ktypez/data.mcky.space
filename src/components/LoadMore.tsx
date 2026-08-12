
import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { staggerItem } from '@/lib/motion'

interface Props {
  remaining: number
  onClick: () => void
}

export default function LoadMore({ remaining, onClick }: Props) {
  if (remaining <= 0) return null
  return (
    <motion.div variants={staggerItem} initial="hidden" animate="visible">
      <Button
        variant="outline"
        onClick={onClick}
        aria-label={`โหลดเพิ่ม ${remaining} รายการ`}
      >
        โหลดเพิ่ม ({remaining} รายการ)
      </Button>
    </motion.div>
  )
}
