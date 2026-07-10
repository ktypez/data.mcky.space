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
    const css = `:root,[data-theme="${t.id}"]{${Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')}}`
    style.textContent = css
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
