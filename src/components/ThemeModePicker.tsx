import { useState } from 'react'
import { Moon, Sun, Monitor } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme-context'
import { PopoverMenu } from '@/components/ui/popover-menu'
import { Check } from '@phosphor-icons/react'

const MODES = [
  { id: 'system' as const, label: 'Auto', icon: Monitor },
  { id: 'light' as const, label: 'Light', icon: Sun },
  { id: 'dark' as const, label: 'Dark', icon: Moon },
]

export default function ThemeModePicker() {
  const [open, setOpen] = useState(false)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const close = () => setOpen(false)

  const Icon = resolvedTheme === 'dark' ? Moon : Sun

  const trigger = (
    <Button variant="outline" size="icon" aria-label="เลือกโหมดสี" aria-expanded={open}>
      <Icon className="w-4 h-4 text-primary" />
    </Button>
  )

  return (
    <PopoverMenu open={open} onOpenChange={setOpen} trigger={trigger} position="right-edge">
      <div className="space-y-0.5">
        {MODES.map((m) => {
          const isActive = theme === m.id
          const IconItem = m.icon
          return (
            <button
              key={m.id}
              onClick={() => {
                setTheme(m.id)
                close()
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <IconItem className="w-4 h-4 shrink-0" />
              <span className="text-[15px] font-medium flex-1">{m.label}</span>
              {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
            </button>
          )
        })}
      </div>
    </PopoverMenu>
  )
}
