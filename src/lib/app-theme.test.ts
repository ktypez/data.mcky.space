import { describe, expect, it } from 'vitest'
import { getTheme, themeGroups, themes } from '@/lib/design/themes'
import {
  DEFAULT_CUSTOM_PALETTE,
  normaliseAppMode,
  normaliseCustomPalette,
  hasReadableForeground,
  readableForeground,
  resolveThemeMode,
  themeSupportsMode,
} from '@/lib/app-theme'

describe('shared app theme mode', () => {
  it('keeps a unique registry for the app', () => {
    expect(new Set(themes.map(theme => theme.id)).size).toBe(themes.length)
    expect(themes.map(theme => theme.id)).toContain('portal')
    expect(themes.map(theme => theme.id)).toContain('mcky')
    expect(getTheme('custom').modes).toEqual(['light', 'dark'])
  })

  it('partitions every preset into exactly one mode group', () => {
    const presets = themes.filter(theme => theme.id !== 'custom')
    // A theme in no group is invisible; a theme in two groups is duplicated.
    // Both are silent failures, so assert the partition holds.
    for (const theme of presets) {
      expect(themeGroups.filter(group => group.matches(theme))).toHaveLength(1)
    }
    for (const group of themeGroups) {
      expect(presets.filter(theme => group.matches(theme)).length).toBeGreaterThan(0)
    }
    expect(new Set(themeGroups.map(group => group.id)).size).toBe(themeGroups.length)
  })

  it('buckets by supported mode, not by a hand-assigned field', () => {
    const bucket = (id: string) => themeGroups.find(group => group.matches(getTheme(id)))?.id
    expect(bucket('mcky')).toBe('light')
    expect(bucket('crt')).toBe('dark')
    expect(bucket('portal')).toBe('dual')
    // bubblegum and slate are dual-mode but carry no explicit `modes` until
    // they were declared as such, so this also guards that declaration.
    expect(getTheme('bubblegum').modes).toEqual(['light', 'dark'])
    expect(bucket('bubblegum')).toBe('dual')
    expect(bucket('slate')).toBe('dual')
  })

  it('normalizes the legacy system value to auto', () => {
    expect(normaliseAppMode('system')).toBe('auto')
    expect(normaliseAppMode('light')).toBe('light')
    expect(normaliseAppMode('unknown')).toBeNull()
  })

  it('resolves auto from the operating system for dual themes', () => {
    const portal = getTheme('portal')
    expect(resolveThemeMode(portal, 'auto', false)).toBe('light')
    expect(resolveThemeMode(portal, 'auto', true)).toBe('dark')
  })

  it('normalizes custom colors and derives readable accent text', () => {
    const custom = normaliseCustomPalette({
      light: { background: '#112233', primary: '#ffffff' },
      dark: { background: 'invalid', primary: '#000000' },
    })
    expect(custom.light.background).toBe('#112233')
    expect(custom.light.primaryForeground).toBe('#0f172a')
    expect(custom.dark.background).toBe(DEFAULT_CUSTOM_PALETTE.dark.background)
    expect(custom.dark.primaryForeground).toBe('#ffffff')
    expect(readableForeground('#ffffff')).toBe('#0f172a')
    expect(readableForeground('#000000')).toBe('#ffffff')
  })

  it('detects when neither automatic foreground reaches 4.5:1', () => {
    expect(hasReadableForeground('#db4455')).toBe(false)
    expect(hasReadableForeground('#2563eb')).toBe(true)
  })

  it('forces single-mode themes while retaining support metadata', () => {
    const lightOnly = getTheme('mcky')
    const darkOnly = getTheme('crt')
    expect(themeSupportsMode(lightOnly, 'light')).toBe(true)
    expect(themeSupportsMode(lightOnly, 'dark')).toBe(false)
    expect(resolveThemeMode(lightOnly, 'dark', false)).toBe('light')
    expect(resolveThemeMode(darkOnly, 'light', false)).toBe('dark')
  })
})
