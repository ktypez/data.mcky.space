import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useMotion } from '@/lib/motion'

interface V2ConfirmProps {
  open: boolean
  /** Headline question, e.g. "delete record?" */
  title: string
  /** Supporting copy under the title. */
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Destructive: red side-bar + red confirm button. */
  destructive?: boolean
  /** Both buttons disable while the confirm action is in flight. */
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * V2Confirm — v2-styled modal confirm (replaces native `window.confirm`).
 * Portal-bound to <body> (like Radix dialogs), so its CSS lives under the
 * `html:has(.v2-shell)` prefix in v2.css.
 *
 * Focus: opens on the CANCEL button (safe default — Enter can't fire a
 * destructive action by accident), Tab is trapped between the two buttons,
 * Escape / backdrop press closes.
 */
export default function V2Confirm({
  open,
  title,
  body,
  confirmLabel = 'confirm',
  cancelLabel = 'cancel',
  destructive,
  busy,
  onConfirm,
  onClose,
}: V2ConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const { fadeScaleIn, fadeIn, spring } = useMotion()

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    // Lock page scroll behind the dialog (same as V2Lightbox), restore on close.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Tab') {
        // Two-button trap — keep focus cycling inside the dialog.
        const fromCancel = document.activeElement === cancelRef.current
        const fromConfirm = document.activeElement === confirmRef.current
        if (e.shiftKey && fromCancel) {
          e.preventDefault()
          confirmRef.current?.focus()
        } else if (!e.shiftKey && fromConfirm) {
          e.preventDefault()
          cancelRef.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="v2-confirm-backdrop"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={spring}
          onClick={onClose}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            data-destructive={destructive || undefined}
            className="v2-confirm"
            variants={fadeScaleIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="v2-confirm-body">
              <p className={`v2-eyebrow${destructive ? ' v2-eyebrow-destructive' : ''}`}>
                {destructive ? 'danger' : 'confirm'}
              </p>
              <h2 className="v2-confirm-title">{title}</h2>
              {body && <p className="v2-confirm-text">{body}</p>}
            </div>
            <div className="v2-confirm-actions">
              <button
                ref={cancelRef}
                type="button"
                className="v2-btn"
                disabled={busy}
                onClick={onClose}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`v2-btn ${destructive ? 'v2-btn-destructive' : 'v2-btn-accent'}`}
                disabled={busy}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
