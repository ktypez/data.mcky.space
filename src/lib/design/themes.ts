import type { Theme, ThemeGroup } from './tokens'

export type { Theme, ThemeGroup } from './tokens'

/** Palette metadata only. Actual colors come from @mcky/ui/v5-tokens.css. */
export const themes: Theme[] = [
  { id: 'matcha', label: 'Matcha', description: 'กระดาษอุ่นโทนชามัทฉะ, เขียวเป็นสีหลักและคอรัลเป็นสีป๊อป (ค่าเริ่มต้น)', modes: ['light', 'dark'] },
  { id: 'coral', label: 'Coral', description: 'คอรัลส้มแดงเป็นสีหลักและทีลเข้มเป็นสีป๊อป', modes: ['light', 'dark'] },
  { id: 'blueberry', label: 'Blueberry', description: 'น้ำเงินบลูเบอร์รีเป็นสีหลักและเหลืองอำพันเป็นสีป๊อป', modes: ['light', 'dark'] },
  { id: 'butter', label: 'Butter', description: 'ส้มเนยเป็นสีหลักและม่วงไอริสเป็นสีป๊อป', modes: ['light', 'dark'] },
]

/** Picker swatches; runtime semantic colors are not sourced from this list. */
export const V5_PALETTES: Array<{ key: string; name: string; acc: string; pop: string; tint: string }> = [
  { key: 'matcha', name: 'Matcha', acc: '#158068', pop: '#f2593f', tint: '#e2f2e8' },
  { key: 'coral', name: 'Coral', acc: '#e8503a', pop: '#17918c', tint: '#fce7e1' },
  { key: 'blueberry', name: 'Blueberry', acc: '#3e63dd', pop: '#f2a93b', tint: '#e7ecfc' },
  { key: 'butter', name: 'Butter', acc: '#c77d0a', pop: '#6d5bd0', tint: '#faedd3' },
]

const defaultTheme: Theme = themes.find((theme) => theme.id === 'matcha') ?? themes[0]

export function getTheme(id: string | undefined | null): Theme {
  return themes.find((theme) => theme.id === id) ?? defaultTheme
}

export function isDarkOnlyTheme(theme: Theme): boolean {
  return !!theme.modes && theme.modes.length === 1 && theme.modes[0] === 'dark'
}

export function isLightOnlyTheme(theme: Theme): boolean {
  return !!theme.modes && theme.modes.length === 1 && theme.modes[0] === 'light'
}

export function isDualModeTheme(theme: Theme): boolean {
  return !isLightOnlyTheme(theme) && !isDarkOnlyTheme(theme)
}

const GROUPS: ThemeGroup[] = [
  { id: 'dual', label: 'DUO', description: 'ใช้ได้ทั้งโหมดสว่างและโหมดมืด', matches: isDualModeTheme },
  { id: 'light', label: 'LIGHT', description: 'ใช้ได้เฉพาะโหมดสว่าง', matches: isLightOnlyTheme },
  { id: 'dark', label: 'DARK', description: 'ใช้ได้เฉพาะโหมดมืด', matches: isDarkOnlyTheme },
]

export const themeGroups: ThemeGroup[] = GROUPS.filter((group) => themes.some((theme) => group.matches(theme)))
