import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDown, Check } from '@phosphor-icons/react'
import { useMotion } from '@/lib/motion'

export interface V2SelectOption<T extends string> {
  value: T
  label: string
  /** Optional right-aligned hint (e.g. record counts) */
  hint?: string | number
}

interface V2SelectProps<T extends string> {
  ariaLabel: string
  value: T
  options: V2SelectOption<T>[]
  onChange: (v: T) => void
}

/**
 * V2Select — anchored dropdown, no modal backdrop. Menu opens flush under
 * the trigger; closes on outside press, Escape, or selection.
 */
export default function V2Select<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: V2SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { fadeScaleIn, spring } = useMotion()

  // Outside press / Escape → close. pointerdown fires before any other
  // click handling, so toggling the trigger from open state stays clean.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const current = options.find((o) => o.value === value) ?? options[0]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="v2-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{current?.label}</span>
        <CaretDown className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={ariaLabel}
            className="v2-select-menu absolute left-0 top-full z-50 mt-1"
            variants={fadeScaleIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={spring}
          >
            {options.map((option) => {
              const isActive = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`v2-select-option${isActive ? ' is-active' : ''}`}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="flex-1 text-left">{option.label}</span>
                  {option.hint !== undefined && (
                    <span className="v2-select-hint">{option.hint}</span>
                  )}
                  {isActive && (
                    <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
