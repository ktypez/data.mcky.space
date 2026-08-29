import { useState } from 'react'
import { cva } from 'class-variance-authority'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { Trash, Warning } from '@phosphor-icons/react'

const confirmIconVariants = cva('', {
  variants: {
    variant: {
      default: 'bg-primary/20 text-primary',
      danger: 'bg-destructive/20 text-destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const confirmButtonVariants = cva('flex-1', {
  variants: {
    variant: {
      default: '',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'default' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'ยกเลิก',
  onConfirm,
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm()
    } finally {
      setConfirming(false)
    }
  }

  const Icon = variant === 'danger' ? Trash : Warning

  return (
    <Dialog open={open} onOpenChange={onOpenChange} popupClassName="w-fit min-w-[280px]">
      <DialogContent showCloseButton={false}>
        <div className={cn('w-12 h-12 mx-auto rounded-full flex items-center justify-center', confirmIconVariants({ variant }))}>
          <Icon className="w-5 h-5" />
        </div>
        <DialogTitle className="text-lg font-bold text-foreground text-center">
          {title}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground text-center">
          {description}
        </DialogDescription>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)} disabled={confirming || loading}>
            {cancelLabel}
          </Button>
          <Button
            className={confirmButtonVariants({ variant })}
            onClick={handleConfirm}
            disabled={confirming || loading}
          >
            {confirming || loading ? 'กำลังดำเนินการ...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
