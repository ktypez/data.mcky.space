import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useMotion } from '@/lib/motion'
import { useRef, useState, type ReactNode } from 'react'

interface PopoverMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  children: ReactNode
  position?: 'auto' | 'left' | 'right' | 'right-edge'
}

export function PopoverMenu({ open, onOpenChange, trigger, children, position = 'auto' }: PopoverMenuProps) {
  const { scaleIn, fadeIn, spring } = useMotion()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [pos, setPos] = useState({ top: 0, left: 0 })

  const handleOpen = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const gap = 8
    const popupWidth = 300
    let top = rect.bottom + gap
    let left = rect.left

    if (position === 'left') {
      left = Math.max(gap, rect.left - popupWidth)
    } else if (position === 'right') {
      left = rect.left
    } else if (position === 'right-edge') {
      left = 'auto' as unknown as number
    } else {
      // auto
      if (left + popupWidth > window.innerWidth - gap) {
        left = Math.max(gap, window.innerWidth - popupWidth - gap)
      }
    }

    if (top + 200 > window.innerHeight - gap) {
      top = Math.max(gap, rect.top - 200 - gap)
    }

    setPos({ top, left })
    onOpenChange(true)
  }

  return (
    <>
      <button ref={buttonRef} onClick={handleOpen} className="inline-block">
        {trigger}
      </button>

      {typeof document === 'object' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="popover-backdrop"
                className="fixed inset-0 z-40"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={spring}
                onClick={() => onOpenChange(false)}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}

      {typeof document === 'object' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="popover-menu"
                onClick={(e) => e.stopPropagation()}
                className="fixed z-[999] w-fit min-w-36 bg-card border border-border rounded-xl shadow-xl p-1.5"
                style={{
                  top: pos.top,
                  left: position === 'right-edge' ? undefined : pos.left,
                  right: position === 'right-edge' ? 8 : undefined,
                }}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={spring}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
