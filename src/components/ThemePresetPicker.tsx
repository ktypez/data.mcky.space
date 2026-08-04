import { useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { Palette, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { setProfileTheme } from '@/lib/api'
import { themes, isCharacterTheme, isDarkOnlyTheme } from '@/lib/design/themes'
import type { Theme } from '@/lib/design/tokens'
import { PopoverMenu } from '@/components/ui/popover-menu'

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/10"
      style={{ backgroundColor: color }}
      title={label}
    />
  )
}

/** Dark-only themes always preview their dark tokens. */
function previewVars(t: Theme, resolved: 'light' | 'dark') {
  return isDarkOnlyTheme(t) ? t.dark : resolved === 'dark' ? t.dark : t.light
}

function ThemeCard({
  t,
  active,
  resolved,
  onPick,
}: {
  t: Theme
  active: boolean
  resolved: 'light' | 'dark'
  onPick: () => void
}) {
  const vars = previewVars(t, resolved)
  const isChar = isCharacterTheme(t)
  return (
    <button
      onClick={onPick}
      aria-pressed={active}
      className={`group w-[128px] shrink-0 text-left rounded-lg border p-1.5 transition-colors ${
        active ? 'border-primary bg-accent/20' : 'border-border hover:bg-muted'
      }`}
    >
      <div
        className="h-12 rounded-md border overflow-hidden"
        style={{ backgroundColor: vars['--background'], borderColor: vars['--border'] }}
      >
        <div className="flex items-center gap-1 p-1.5">
          <Swatch color={vars['--primary']} label="primary" />
          <Swatch color={vars['--accent']} label="accent" />
          <Swatch color={vars['--foreground']} label="foreground" />
        </div>
        <div
          className="px-1.5 text-[13px] leading-none truncate"
          style={{ color: vars['--foreground'], fontFamily: t.fonts?.display }}
        >
          Aa กขค
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        <span className="text-[12px] font-medium flex-1 truncate">{t.label}</span>
        {isChar && (
          <span className="text-[9px] font-mono uppercase tracking-wide text-primary shrink-0">
            {t.character}
          </span>
        )}
        {active && <Check className="w-3 h-3 shrink-0 text-primary" weight="bold" />}
      </div>
    </button>
  )
}

/** One horizontal scrollable row of theme cards. */
function ThemeRow({
  title,
  items,
  activeId,
  resolved,
  onPick,
}: {
  title: string
  items: Theme[]
  activeId: string
  resolved: 'light' | 'dark'
  onPick: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <>
      <p className="px-1 pb-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
        {items.map((t) => (
          <ThemeCard
            key={t.id}
            t={t}
            active={activeId === t.id}
            resolved={resolved}
            onPick={() => onPick(t.id)}
          />
        ))}
      </div>
    </>
  )
}

export default function ThemePresetPicker() {
  const [open, setOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const themeId = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  const close = () => setOpen(false)
  const resolved: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  const classicThemes = themes.filter((t) => !isCharacterTheme(t))
  const characterThemes = themes.filter((t) => isCharacterTheme(t))

  const handlePick = (id: string) => {
    setTheme(id)
    if (useAuthStore.getState().isAdmin) void setProfileTheme(id)
    close()
  }

  const trigger = (
    <Button variant="outline" size="icon" aria-label="เลือกธีม" aria-expanded={open}>
      <Palette className="w-4 h-4 text-primary" />
    </Button>
  )

  return (
    <PopoverMenu open={open} onOpenChange={setOpen} trigger={trigger} position="right-edge">
      <div className="w-[340px] max-w-[90vw]">
        <ThemeRow
          title="Classic"
          items={classicThemes}
          activeId={themeId}
          resolved={resolved}
          onPick={handlePick}
        />
        <div className="h-2" />
        <ThemeRow
          title="Character"
          items={characterThemes}
          activeId={themeId}
          resolved={resolved}
          onPick={handlePick}
        />
      </div>
    </PopoverMenu>
  )
}
