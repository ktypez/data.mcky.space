import { useEffect, useId, useRef, useState } from 'react'
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
 *
 * Keyboard (combobox pattern): focus stays on the trigger,
 * aria-activedescendant carries the highlight.
 * - closed: Enter / Space / ArrowDown opens
 * - open: ArrowUp/Down + Home/End move the highlight, Enter/Space selects,
 *   Escape closes (document listener), Tab closes and moves on
 */
export default function V2Select<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: V2SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionIdPrefix = useId()
  const { fadeScaleIn, spring } = useMotion()

  const current = options.find((o) => o.value === value) ?? options[0]

  const openMenu = () => {
    const idx = options.findIndex((o) => o.value === value)
    setActiveIdx(idx >= 0 ? idx : 0)
    setOpen(true)
  }

  // Outside press / Escape → close. pointerdown fires before any other
  // click handling, so toggling the trigger from open state stays clean.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        openMenu()
      }
      return
    }
    const n = options.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % n)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + n) % n)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIdx(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIdx(Math.max(0, n - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const option = options[activeIdx]
      if (option) {
        onChange(option.value)
        setOpen(false)
      }
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="v2-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span>{current?.label}</span>
        <CaretDown className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={`${optionIdPrefix}-${activeIdx}`}
            className="v2-select-menu absolute left-0 top-full z-50 mt-1"
            variants={fadeScaleIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={spring}
          >
            {options.map((option, i) => {
              const isActive = option.value === value
              return (
                <button
                  key={option.value}
                  id={`${optionIdPrefix}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  tabIndex={-1}
                  className={`v2-select-option${isActive ? ' is-active' : ''}${
                    i === activeIdx ? ' is-focus' : ''
                  }`}
                  onMouseEnter={() => setActiveIdx(i)}
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
