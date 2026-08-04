import { useEffect } from 'react'
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/lib/theme-context'
import { useUIStore } from '@/stores/ui-store'
import { getTheme, isDarkOnlyTheme } from '@/lib/design/themes'

const CSS_LINK_ID = 'theme-static-css'
const FONT_LINK_ID = 'theme-font'

function getOrCreateLink(id: string): HTMLLinkElement {
  const existing = document.getElementById(id) as HTMLLinkElement | null
  if (existing) return existing
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.id = id
  document.head.appendChild(link)
  return link
}

function removeElement(id: string) {
  document.getElementById(id)?.remove()
}

/**
 * Single owner of the active theme on <html>: sets data-theme, toggles .dark
 * (dark-only themes force it), loads the theme's static stylesheet + fonts.
 * Every theme ships a full static CSS now — no JS-injected vars remain.
 */
function ThemeInjector() {
  const themeId = useUIStore((s) => s.theme)
  const { resolvedTheme } = useTheme()
  const theme = getTheme(themeId)
  const darkOnly = isDarkOnlyTheme(theme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme.id
    root.classList.toggle('dark', darkOnly || resolvedTheme === 'dark')

    // Every theme owns a static stylesheet (boot already loaded it pre-paint;
    // this keeps it correct on live switches without a reload).
    const css = getOrCreateLink(CSS_LINK_ID)
    css.href = theme.staticCss ?? getTheme(null).staticCss!

    // Lazy font loading (fonts are never render-blocking).
    if (theme.fontUrl) {
      const font = getOrCreateLink(FONT_LINK_ID)
      font.href = theme.fontUrl
    } else {
      removeElement(FONT_LINK_ID)
    }
  }, [themeId, resolvedTheme, theme, darkOnly])

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
