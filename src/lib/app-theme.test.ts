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
    for (const id of ['ledger', 'claude', 'blueprint', 'mono', 'lotus', 'terminal']) {
      expect(themes.map(theme => theme.id)).toContain(id)
    }
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
    // All 6 adopted themes are dual-mode.
    for (const id of ['ledger', 'claude', 'blueprint', 'mono', 'lotus', 'terminal']) {
      expect(bucket(id)).toBe('dual')
      expect(getTheme(id).modes).toEqual(['light', 'dark'])
    }
  })

  it('normalizes the legacy system value to auto', () => {
    expect(normaliseAppMode('system')).toBe('auto')
    expect(normaliseAppMode('light')).toBe('light')
    expect(normaliseAppMode('unknown')).toBeNull()
  })

  it('resolves auto from the operating system for dual themes', () => {
    const ledger = getTheme('ledger')
    expect(resolveThemeMode(ledger, 'auto', false)).toBe('light')
    expect(resolveThemeMode(ledger, 'auto', true)).toBe('dark')
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

  it('custom theme is dual-mode and supports both modes', () => {
    const custom = getTheme('custom')
    expect(themeSupportsMode(custom, 'light')).toBe(true)
    expect(themeSupportsMode(custom, 'dark')).toBe(true)
    expect(resolveThemeMode(custom, 'light', false)).toBe('light')
    expect(resolveThemeMode(custom, 'dark', false)).toBe('dark')
  })
})
