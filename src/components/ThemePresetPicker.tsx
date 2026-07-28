import { useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { Palette, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { themes } from '@/lib/design/themes'
import { PopoverMenu } from '@/components/ui/popover-menu'

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
  const { resolvedTheme } = useTheme()
  const themeId = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'
  const close = () => setOpen(false)

  const trigger = (
    <Button variant="outline" size="icon" aria-label="เลือกธีม" aria-expanded={open}>
      <Palette className="w-4 h-4 text-primary" />
    </Button>
  )

  return (
    <PopoverMenu open={open} onOpenChange={setOpen} trigger={trigger} position="right-edge">
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
    </PopoverMenu>
  )
}
