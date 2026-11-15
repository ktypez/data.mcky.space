import { describe, expect, it } from 'vitest'
import { getTheme, themeGroups, themes } from '@/lib/design/themes'
import { normaliseAppMode, resolveThemeMode, themeSupportsMode } from '@/lib/app-theme'

const PRESET_IDS = ['matcha', 'coral', 'blueberry', 'butter']

describe('shared app theme mode', () => {
  it('registers exactly the 4 V5 palettes, with no custom theme', () => {
    expect(new Set(themes.map(theme => theme.id)).size).toBe(themes.length)
    expect(themes.map(theme => theme.id)).toEqual(PRESET_IDS)
    expect(getTheme('custom').id).toBe('matcha')
    expect(getTheme('nope').id).toBe('matcha')
    // Stale pre-V5 preset ids migrate to the matcha default.
    expect(getTheme('ledger').id).toBe('matcha')
    expect(getTheme('terminal').id).toBe('matcha')
  })

  it('partitions every preset into exactly one mode group', () => {
    // A theme in no group is invisible; a theme in two groups is duplicated.
    // Both are silent failures, so assert the partition holds.
    for (const theme of themes) {
      expect(themeGroups.filter(group => group.matches(theme))).toHaveLength(1)
    }
    for (const group of themeGroups) {
      expect(themes.filter(theme => group.matches(theme)).length).toBeGreaterThan(0)
    }
    expect(new Set(themeGroups.map(group => group.id)).size).toBe(themeGroups.length)
  })

  it('buckets by supported mode, not by a hand-assigned field', () => {
    const bucket = (id: string) => themeGroups.find(group => group.matches(getTheme(id)))?.id
    // All 4 V5 palettes are dual-mode.
    for (const id of PRESET_IDS) {
      expect(bucket(id)).toBe('dual')
      expect(getTheme(id).modes).toEqual(['light', 'dark'])
      expect(themeSupportsMode(getTheme(id), 'light')).toBe(true)
      expect(themeSupportsMode(getTheme(id), 'dark')).toBe(true)
    }
  })

  it('normalizes the legacy system value to auto', () => {
    expect(normaliseAppMode('system')).toBe('auto')
    expect(normaliseAppMode('light')).toBe('light')
    expect(normaliseAppMode('unknown')).toBeNull()
  })

  it('resolves auto from the operating system for dual themes', () => {
    const matcha = getTheme('matcha')
    expect(resolveThemeMode(matcha, 'auto', false)).toBe('light')
    expect(resolveThemeMode(matcha, 'auto', true)).toBe('dark')
    expect(resolveThemeMode(matcha, 'light', true)).toBe('light')
    expect(resolveThemeMode(matcha, 'dark', false)).toBe('dark')
  })
})
