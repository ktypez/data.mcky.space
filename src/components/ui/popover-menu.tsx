import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useMotion } from '@/lib/motion'
import { useState, type ReactNode } from 'react'

interface PopoverMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  children: ReactNode
  position?: 'auto' | 'left' | 'right' | 'right-edge'
}

export function PopoverMenu({ open, onOpenChange, trigger, children, position = 'auto' }: PopoverMenuProps) {
  const { scaleIn, fadeIn, spring } = useMotion()

  const [pos, setPos] = useState({ top: 0, left: 0 })

  const handleOpen = (e: React.MouseEvent | React.KeyboardEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
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

  // NOTE: wrapper is a span, not a button element — the trigger prop is already
  // a button (e.g. NavDropdown, theme pickers), so nesting it inside another
  // button element would be invalid HTML and trigger a React hydration warning.
  // Clicks on the trigger button bubble up here; keyboard activation works
  // because the trigger button itself fires a click event.
  return (
    <>
      <span
        className="inline-block"
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleOpen(e)
          }
        }}
      >
        {trigger}
      </span>

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
