import { Moon, Sun, Monitor } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme-context'
import { useUIStore } from '@/old/stores/ui-store'
import { getTheme, isDarkOnlyTheme, isLightOnlyTheme } from '@/lib/design/themes'

const CYCLE = ['system', 'light', 'dark'] as const
const ICONS = { system: Monitor, light: Sun, dark: Moon }
const LABELS = { system: 'Auto', light: 'Light', dark: 'Dark' }

export default function ThemeModePicker() {
  const { theme, setTheme } = useTheme()
  const themeId = useUIStore((s) => s.theme)

  const current = getTheme(themeId)
  if (isDarkOnlyTheme(current) || isLightOnlyTheme(current)) return null

  const next = () => {
    const i = CYCLE.indexOf(theme)
    setTheme(CYCLE[(i + 1) % CYCLE.length])
  }

  const Icon = ICONS[theme]

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`โหมด: ${LABELS[theme]} — คลิกสลับ`}
      onClick={next}
    >
      <Icon className="w-4 h-4 text-primary" />
    </Button>
  )
}
