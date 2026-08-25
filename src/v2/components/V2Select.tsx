import { CaretDown, Check } from '@phosphor-icons/react'
import { PopoverMenu } from '@/components/ui/popover-menu'

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
 * V2Select — custom popover-based select (no native/system dialog).
 * Trigger reads like a compact v2 well-button; menu items are mono rows
 * with a checkmark on the active option.
 */
export default function V2Select<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: V2SelectProps<T>) {
  const current = options.find((o) => o.value === value) ?? options[0]

  return (
    <PopoverMenu
      trigger={
        <button
          type="button"
          className="v2-select-trigger"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
        >
          <span>{current?.label}</span>
          <CaretDown className="h-3 w-3 shrink-0" aria-hidden="true" />
        </button>
      }
    >
      <div role="listbox" aria-label={ariaLabel}>
        {options.map((option) => {
          const isActive = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isActive}
              className={`v2-select-option${isActive ? ' is-active' : ''}`}
              onClick={() => onChange(option.value)}
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
      </div>
    </PopoverMenu>
  )
}
