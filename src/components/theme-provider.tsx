import { useEffect, useId } from 'react'
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/lib/theme-context'
import { useUIStore } from '@/stores/ui-store'
import { getTheme, isCharacterTheme, isDarkOnlyTheme } from '@/lib/design/themes'

const CSS_LINK_ID = 'theme-static-css'
const FONT_LINK_ID = 'theme-font'

function getOrCreateLink(id: string, rel: 'stylesheet'): HTMLLinkElement {
  const existing = document.getElementById(id) as HTMLLinkElement | null
  if (existing) return existing
  const link = document.createElement('link')
  link.rel = rel
  link.id = id
  document.head.appendChild(link)
  return link
}

function removeElement(id: string) {
  document.getElementById(id)?.remove()
}

function ThemeInjector() {
  const themeId = useUIStore((s) => s.theme)
  const { resolvedTheme } = useTheme()
  const id = useId()
  const theme = getTheme(themeId)
  const darkOnly = isDarkOnlyTheme(theme)
  const character = isCharacterTheme(theme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme.id
    root.classList.toggle('dark', darkOnly || resolvedTheme === 'dark')

    // Character themes: own static stylesheet (vars + fonts + effects).
    if (character) {
      const css = getOrCreateLink(CSS_LINK_ID, 'stylesheet')
      css.href = theme.staticCss!
      removeElement(id) // drop any plain-theme JS vars
    } else {
      removeElement(CSS_LINK_ID)
    }

    // Lazy font loading (only character themes carry a fontUrl today).
    if (theme.fontUrl) {
      const font = getOrCreateLink(FONT_LINK_ID, 'stylesheet')
      font.href = theme.fontUrl
    } else {
      removeElement(FONT_LINK_ID)
    }

    // Plain themes: inject CSS vars via <style>, as before.
    if (!character) {
      const isDark = resolvedTheme === 'dark'
      const vars = isDark ? theme.dark : theme.light
      let style = document.getElementById(id) as HTMLStyleElement | null
      if (!style) {
        style = document.createElement('style')
        style.id = id
        document.head.appendChild(style)
      }
      const colorVars = Object.entries(vars)
        .map(([k, v]) => `${k}:${v}`)
        .join(';')
      style.textContent = `:root,[data-theme="${theme.id}"]{${colorVars}}`
    }
  }, [themeId, resolvedTheme, id, theme, darkOnly, character])

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
