import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

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
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      <div className={cn('fixed bg-card shadow-lg border', sideStyles[side])}>
        {children}
      </div>
    </div>,
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
