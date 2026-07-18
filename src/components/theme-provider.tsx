import { useEffect, useId } from 'react'
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/lib/theme-context'
import { useUIStore } from '@/stores/ui-store'
import { themes, defaultTheme } from '@/lib/design/themes'

function ThemeInjector() {
  const themeId = useUIStore((s) => s.theme)
  const { resolvedTheme } = useTheme()
  const id = useId()

  useEffect(() => {
    const t = themes.find((th) => th.id === themeId) ?? defaultTheme
    const isDark = resolvedTheme === 'dark'
    const vars = isDark ? t.dark : t.light
    const root = document.documentElement
    root.dataset.theme = t.id

    let style = document.getElementById(id) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    const colorVars = Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')
    const isVoid = t.id === 'void'
    const glass = isVoid
      ? `[data-theme="void"] .bg-background,[data-theme="void"] .bg-card,[data-theme="void"] .bg-popover,[data-theme="void"] .bg-sidebar,[data-theme="void"] .bg-muted{-webkit-backdrop-filter:blur(20px) saturate(1.3);backdrop-filter:blur(20px) saturate(1.3)}`
      : ''
    style.textContent = `:root,[data-theme="${t.id}"]{${colorVars}}${glass}`
  }, [themeId, resolvedTheme, id])

  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <CustomThemeProvider>
      <ThemeInjector />
      {children}
    </CustomThemeProvider>
  )
}
