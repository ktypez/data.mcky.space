import { Plus, X } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface MultiValueInputProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  maxLength?: number
  addLabel?: string
  variant?: 'default' | 'error'
  autoFocus?: boolean
  inlineAdd?: boolean
}

/**
 * Todo-list style multi-value input: one field per value, a "×" to remove
 * each row (except the last), and a "+" button to append a new empty value.
 */
export default function MultiValueInput({
  values,
  onChange,
  placeholder,
  maxLength,
  addLabel = 'เพิ่ม',
  variant = 'default',
  autoFocus,
  inlineAdd,
}: MultiValueInputProps) {
  const update = (i: number, v: string) => {
    const next = [...values]
    next[i] = v
    onChange(next)
  }
  const remove = (i: number) => {
    onChange(values.filter((_, idx) => idx !== i))
  }
  const add = () => onChange([...values, ''])

  const showInline = inlineAdd && values.length >= 1
  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            type="text"
            value={v}
            onChange={(e) => update(i, e.target.value)}
            maxLength={maxLength}
            variant={variant}
            placeholder={placeholder}
            autoFocus={autoFocus && i === 0}
            autoComplete="off"
            spellCheck={false}
            name={i === 0 ? placeholder : `${placeholder}-${i}`}
          />
          {values.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground"
              onClick={() => remove(i)}
              aria-label="ลบช่องนี้"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : showInline && i === 0 ? (
            <Button
              type="button"
              onClick={add}
              aria-label={addLabel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background hover:opacity-90"
            >
              <Plus className="h-4 w-4" weight="bold" />
            </Button>
          ) : null}
          {showInline && values.length > 1 && i === values.length - 1 && (
            <Button
              type="button"
              onClick={add}
              aria-label={addLabel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background hover:opacity-90"
            >
              <Plus className="h-4 w-4" weight="bold" />
            </Button>
          )}
        </div>
      ))}
      {!inlineAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={add}
        >
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </Button>
      )}
      {inlineAdd && values.length === 0 && (
        <Button
          type="button"
          onClick={add}
          aria-label={addLabel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background hover:opacity-90"
        >
          <Plus className="h-4 w-4" weight="bold" />
        </Button>
      )}
    </div>
  )
}