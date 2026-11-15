import { describe, expect, it } from 'vitest'
import { getTheme, themeGroups, themes } from '@/lib/design/themes'
import { normaliseAppMode, resolveThemeMode, themeSupportsMode } from '@/lib/app-theme'

describe('V6 monochrome app theme', () => {
  it('exposes one monochrome theme and migrates legacy palette IDs', () => {
    expect(themes.map(theme => theme.id)).toEqual(['monochrome'])
    for (const legacy of ['matcha', 'coral', 'blueberry', 'butter', 'ledger', 'terminal']) {
      expect(getTheme(legacy).id).toBe('monochrome')
    }
    expect(getTheme('unknown').id).toBe('monochrome')
  })

  it('partitions the theme into exactly one mode group', () => {
    for (const theme of themes) expect(themeGroups.filter(group => group.matches(theme))).toHaveLength(1)
    expect(themeGroups.find(group => group.matches(getTheme('monochrome')))?.id).toBe('dual')
  })

  it('supports light, dark, and auto modes', () => {
    const theme = getTheme('monochrome')
    expect(themeSupportsMode(theme, 'light')).toBe(true)
    expect(themeSupportsMode(theme, 'dark')).toBe(true)
    expect(resolveThemeMode(theme, 'auto', false)).toBe('light')
    expect(resolveThemeMode(theme, 'auto', true)).toBe('dark')
    expect(normaliseAppMode('system')).toBe('auto')
    expect(normaliseAppMode('unknown')).toBeNull()
  })
})
