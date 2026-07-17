import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { scaleIn, fadeIn, smooth } from '@/lib/motion'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  popupClassName?: string
  children?: React.ReactNode
}

function Dialog({ open, onOpenChange, popupClassName, children }: DialogProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            variants={fadeIn}
            transition={smooth}
            onClick={() => onOpenChange?.(false)}
          />
          <motion.div
            className={cn(
              'relative w-[calc(100%-2rem)] max-w-lg rounded-xl border bg-card p-4 shadow-lg',
              popupClassName,
            )}
            variants={scaleIn}
            transition={smooth}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean }) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
    </div>
  )
}

function DialogTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  )
}

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export { Dialog, DialogContent, DialogTitle, DialogDescription }
