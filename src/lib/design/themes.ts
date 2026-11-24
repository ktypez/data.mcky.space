import type { Theme, ThemeGroup } from './tokens'

export type { Theme, ThemeGroup } from './tokens'

/** Palette metadata only. Actual colours come from @mcky/ui/v6-base.css via the local adapter. */
export const themes: Theme[] = [
  { id: 'matcha', label: 'Matcha', description: 'กระดาษอุ่นโทนชามัทฉะ, เขียวเป็นสีหลักและคอรัลเป็นสีป๊อป (ค่าเริ่มต้น)', modes: ['light', 'dark'] },
  { id: 'coral', label: 'Coral', description: 'คอรัลส้มแดงเป็นสีหลักและทีลเข้มเป็นสีป๊อป', modes: ['light', 'dark'] },
  { id: 'blueberry', label: 'Blueberry', description: 'น้ำเงินบลูเบอร์รีเป็นสีหลักและเหลืองอำพันเป็นสีป๊อป', modes: ['light', 'dark'] },
  { id: 'butter', label: 'Butter', description: 'ส้มเนยเป็นสีหลักและม่วงไอริสเป็นสีป๊อป', modes: ['light', 'dark'] },
]

/** Picker swatches point at canonical V6 tokens; runtime colours are not sourced from this list. */
export const V5_PALETTES: Array<{ key: string; name: string; acc: string; pop: string; tint: string }> = [
  { key: 'matcha', name: 'Matcha', acc: 'var(--mcky-v6-scenery-hill-alt)', pop: 'var(--mcky-v6-orange)', tint: 'var(--acc-tint)' },
  { key: 'coral', name: 'Coral', acc: 'var(--mcky-v6-orange)', pop: 'var(--mcky-v6-red)', tint: 'var(--acc-tint)' },
  { key: 'blueberry', name: 'Blueberry', acc: 'var(--mcky-v6-blue)', pop: 'var(--mcky-v6-purple)', tint: 'var(--acc-tint)' },
  { key: 'butter', name: 'Butter', acc: 'var(--mcky-v6-yellow)', pop: 'var(--mcky-v6-purple)', tint: 'var(--acc-tint)' },
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
