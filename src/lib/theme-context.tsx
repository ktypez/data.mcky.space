import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface ThemeContextValue {
  theme: string
  resolvedTheme: string
  setTheme: (t: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children, ..._props }: { children: ReactNode; [key: string]: any }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'system')
  const [resolvedTheme, setResolvedTheme] = useState('light')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      const t = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme
      setResolvedTheme(t)
      document.documentElement.classList.toggle('dark', t === 'dark')
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [theme])

  const setTheme = (t: string) => {
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
