
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/lib/theme-context'
import { Palette, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { themes } from '@/lib/design/themes'

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="w-4 h-4 rounded-full shrink-0 border border-black/10 dark:border-white/10"
      style={{ backgroundColor: color }}
      title={label}
    />
  )
}

export default function ThemePresetPicker() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { resolvedTheme } = useTheme()
  const themeId = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'

  const close = () => setOpen(false)

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const gap = 8
      const estHeight = 400
      let top = rect.bottom + 6
      const right = Math.max(gap, window.innerWidth - rect.right)
      if (top + estHeight > window.innerHeight - gap) {
        top = Math.max(gap, rect.top - estHeight - gap)
      }
      setPos({ top, right })
    }
    setOpen(!open)
  }

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        size="icon"
        onClick={handleToggle}
        aria-label="เลือกธีม"
        aria-expanded={open}
      >
        <Palette className="w-4 h-4 text-primary" />
      </Button>

      {open && <div className="fixed inset-0 z-40" onClick={close} />}

      {open && typeof document === 'object' &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[999] w-fit min-w-40 bg-card border border-border rounded-xl shadow-xl p-2 animate-in fade-in zoom-in-95 max-h-[70vh] overflow-y-auto"
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="space-y-0.5">
              {themes.map((t) => {
                const isActive = themeId === t.id
                const vars = mode === 'dark' ? t.dark : t.light
                const primaryColor = vars['--primary']
                const bgColor = vars['--background']
                const fgColor = vars['--foreground']

                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id)
                      close()
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex gap-0.5 shrink-0">
                      <Swatch color={primaryColor} label="primary" />
                      <Swatch color={bgColor} label="background" />
                      <Swatch color={fgColor} label="foreground" />
                    </div>
                    <span className="text-[15px] font-medium flex-1 truncate">{t.label}</span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
