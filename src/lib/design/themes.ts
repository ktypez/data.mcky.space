import type { Theme, ThemeGroup } from './tokens'

export type { Theme, ThemeGroup } from './tokens'

/** Palette metadata; colour ramps are defined in the app design tokens. */
export const themes: Theme[] = [
  { id: 'mochi', label: 'Mochi', description: 'ม่วงโมจินุ่มตัดชมพูซากุระ', modes: ['light', 'dark'] },
  { id: 'matcha', label: 'Matcha', description: 'เขียวมัทฉะตัดชมพูซากุระ', modes: ['light', 'dark'] },
  { id: 'soda', label: 'Soda', description: 'น้ำเงินโซดาตัดฟ้าใส', modes: ['light', 'dark'] },
  { id: 'sakura', label: 'Sakura', description: 'ชมพูซากุระตัดคอรัล', modes: ['light', 'dark'] },
]

/** Colour swatches follow the four palettes in the supplied prototype. */
export const DESIGN_PALETTES: Array<{ key: string; name: string; acc: string; pop: string; tint: string }> = [
  { key: 'mochi', name: 'Mochi', acc: 'hsl(256 58% 55%)', pop: 'hsl(338 65% 56%)', tint: 'hsl(256 54% 94%)' },
  { key: 'matcha', name: 'Matcha', acc: 'hsl(158 58% 48%)', pop: 'hsl(338 65% 56%)', tint: 'hsl(158 54% 92%)' },
  { key: 'soda', name: 'Soda', acc: 'hsl(222 58% 55%)', pop: 'hsl(190 65% 52%)', tint: 'hsl(222 54% 94%)' },
  { key: 'sakura', name: 'Sakura', acc: 'hsl(338 65% 56%)', pop: 'hsl(16 65% 56%)', tint: 'hsl(338 54% 94%)' },
]

const defaultTheme: Theme = themes.find((theme) => theme.id === 'mochi') ?? themes[0]

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
