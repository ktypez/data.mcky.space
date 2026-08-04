import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type ThemeMode = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (t: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children, ..._props }: { children: ReactNode; [key: string]: any }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme') as ThemeMode | null
    return saved && ['system', 'light', 'dark'].includes(saved) ? saved : 'system'
  })
  // Resolve synchronously on first render so ThemeInjector applies the right
  // .dark class immediately — avoids a light→dark flash for dark-mode users.
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return 'dark'
    if (saved === 'light') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const resolve = () => (theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme)
    const update = () => {
      const t = resolve()
      setResolvedTheme(t)
      // NOTE: .dark class toggling lives in ThemeInjector (theme-provider.tsx).
      // It is the single owner of the class so dark-only character themes can
      // force it on without fighting this effect's ordering.
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [theme])

  const setTheme = (t: ThemeMode) => {
    localStorage.setItem('theme', t)
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
