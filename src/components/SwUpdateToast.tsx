
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { ArrowClockwise } from '@phosphor-icons/react'
import { slideUp, smooth } from '@/lib/motion'

export default function SwUpdateToast() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = () => setShow(true)
    window.addEventListener('sw-update-available', handler)
    return () => window.removeEventListener('sw-update-available', handler)
  }, [])

  const handleUpdate = () => {
    // Ask the new SW to skip waiting
    navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-lg px-4 py-2.5 flex items-center gap-3"
          variants={slideUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={smooth}
        >
          <span className="text-sm text-[var(--text-primary)]">มีเวอร์ชันใหม่</span>
          <Button
            size="sm"
            variant="default"
            className="h-7 gap-1"
            onClick={handleUpdate}
          >
            <ArrowClockwise className="w-3 h-3" />
            อัปเดต
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}