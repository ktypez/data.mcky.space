import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { sheetVariants, fadeIn, smooth } from '@/lib/motion'

type Side = 'top' | 'right' | 'bottom' | 'left'

const sideStyles: Record<Side, string> = {
  top: 'top-0 left-0 right-0 w-full max-h-[85vh] rounded-b-xl',
  right: 'right-0 top-0 bottom-0 h-full max-w-xs rounded-l-xl',
  bottom: 'bottom-0 left-0 right-0 w-full max-h-[85vh] rounded-t-xl',
  left: 'left-0 top-0 bottom-0 h-full max-w-xs rounded-r-xl',
}

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: Side
  children?: React.ReactNode
}

function Sheet({ open, onOpenChange, side = 'right', children }: SheetProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
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
            className={cn('fixed bg-card shadow-lg border', sideStyles[side])}
            variants={sheetVariants(side)}
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

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 p-4 border-b', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function SheetContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props}>{children}</div>
}

function SheetClose({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn('ml-auto rounded-md p-1 text-muted-foreground hover:text-foreground', className)}
      {...props}
    >
      <X size={16} />
    </button>
  )
}

export { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent, SheetClose }
