import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import './AppDialog.css'

type AppDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  panelClassName?: string
  dialogClassName?: string
  showHeader?: boolean
  closeLabel?: string
  variant?: 'dialog' | 'drawer' | 'lightbox'
  lockBody?: boolean
}

export default function AppDialog({
  open,
  onClose,
  title,
  children,
  panelClassName = '',
  dialogClassName = '',
  showHeader = true,
  closeLabel = 'ปิด',
  variant = 'dialog',
  lockBody = false,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
      const previousOverflow = document.body.style.overflow
      if (lockBody) document.body.style.overflow = 'hidden'
      dialog.showModal()
      return () => {
        if (dialog.open) dialog.close()
        if (lockBody) document.body.style.overflow = previousOverflow
        previous?.focus()
      }
    }

    if (!open && dialog.open) dialog.close()
  }, [lockBody, open])

  return (
    <dialog
      ref={dialogRef}
      className={`app-dialog app-dialog--${variant} ${dialogClassName}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className={`app-dialog-panel ${panelClassName}`} onClick={(event) => event.stopPropagation()}>
        {showHeader && (
          <div className="app-dialog-header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="app-dialog-close" onClick={onClose} aria-label={closeLabel}>
              <X size={16} weight="bold" aria-hidden />
            </button>
          </div>
        )}
        {!showHeader && <h2 id={titleId} className="sr-only">{title}</h2>}
        {children}
      </div>
    </dialog>
  )
}
