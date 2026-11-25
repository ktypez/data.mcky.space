import type { Theme, ThemeGroup } from './tokens'

export type { Theme, ThemeGroup } from './tokens'

/** Palette metadata; colour ramps are defined locally in styles/v6-tokens.css. */
export const themes: Theme[] = [
  { id: 'matcha', label: 'Matcha', description: 'กระดาษอุ่นโทนชามัทฉะ, เขียวเป็นสีหลักและคอรัลเป็นสีป๊อป (ค่าเริ่มต้น)', modes: ['light', 'dark'] },
  { id: 'coral', label: 'Coral', description: 'คอรัลส้มแดงเป็นสีหลักและทีลเข้มเป็นสีป๊อป', modes: ['light', 'dark'] },
  { id: 'blueberry', label: 'Blueberry', description: 'น้ำเงินบลูเบอร์รีเป็นสีหลักและเหลืองอำพันเป็นสีป๊อป', modes: ['light', 'dark'] },
  { id: 'butter', label: 'Butter', description: 'ส้มเนยเป็นสีหลักและม่วงไอริสเป็นสีป๊อป', modes: ['light', 'dark'] },
]

/** Picker swatches use the app-owned semantic palette tokens. */
export const V5_PALETTES: Array<{ key: string; name: string; acc: string; pop: string; tint: string }> = [
  { key: 'matcha', name: 'Matcha', acc: 'var(--pri)', pop: 'var(--acc)', tint: 'var(--pri-soft)' },
  { key: 'coral', name: 'Coral', acc: 'hsl(16 72% 59%)', pop: 'var(--acc)', tint: 'var(--pri-soft)' },
  { key: 'blueberry', name: 'Blueberry', acc: 'var(--pri)', pop: 'var(--acc)', tint: 'var(--pri-soft)' },
  { key: 'butter', name: 'Butter', acc: 'hsl(45 78% 58%)', pop: 'var(--acc)', tint: 'var(--pri-soft)' },
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
