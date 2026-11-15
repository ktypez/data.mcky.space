import type { Theme, ThemeGroup } from './tokens'

export type { Theme, ThemeGroup, ThemeVars } from './tokens'

const LIGHT: Theme['light'] = {
  '--background': '#ffffff', '--foreground': '#090909',
  '--card': '#ffffff', '--card-foreground': '#090909',
  '--popover': '#ffffff', '--popover-foreground': '#090909',
  '--primary': '#090909', '--primary-foreground': '#ffffff',
  '--secondary': '#f7f7f7', '--secondary-foreground': '#090909',
  '--muted': '#f7f7f7', '--muted-foreground': '#555555',
  '--accent': '#242424', '--accent-foreground': '#ffffff',
  '--destructive': '#242424', '--destructive-foreground': '#ffffff',
  '--success': '#242424', '--success-foreground': '#ffffff',
  '--warning': '#555555', '--warning-foreground': '#ffffff',
  '--info': '#555555', '--info-foreground': '#ffffff',
  '--border': '#dedede', '--input': '#c5c5c5', '--ring': '#737373',
  '--sidebar': '#ffffff', '--sidebar-foreground': '#090909',
  '--sidebar-accent': '#f7f7f7', '--sidebar-accent-foreground': '#090909',
  '--sidebar-border': '#dedede', '--sidebar-ring': '#737373',
  '--radius': '10px', '--pin-color': '#090909',
}
const DARK: Theme['dark'] = {
  '--background': '#0b0b0b', '--foreground': '#f7f7f7',
  '--card': '#141414', '--card-foreground': '#f7f7f7',
  '--popover': '#141414', '--popover-foreground': '#f7f7f7',
  '--primary': '#f7f7f7', '--primary-foreground': '#090909',
  '--secondary': '#202020', '--secondary-foreground': '#f7f7f7',
  '--muted': '#202020', '--muted-foreground': '#b0b0b0',
  '--accent': '#dedede', '--accent-foreground': '#090909',
  '--destructive': '#dedede', '--destructive-foreground': '#090909',
  '--success': '#dedede', '--success-foreground': '#090909',
  '--warning': '#b0b0b0', '--warning-foreground': '#090909',
  '--info': '#b0b0b0', '--info-foreground': '#090909',
  '--border': '#292929', '--input': '#414141', '--ring': '#999999',
  '--sidebar': '#141414', '--sidebar-foreground': '#f7f7f7',
  '--sidebar-accent': '#202020', '--sidebar-accent-foreground': '#f7f7f7',
  '--sidebar-border': '#292929', '--sidebar-ring': '#999999',
  '--radius': '10px', '--pin-color': '#f7f7f7',
}

export const themes: Theme[] = [{
  id: 'monochrome', label: 'Monochrome V6',
  description: 'Black, white, and neutral gray',
  character: 'plain', modes: ['light', 'dark'],
  fonts: {
    display: '"Inter", "Noto Sans Thai", ui-sans-serif, system-ui, sans-serif',
    body: '"Inter", "Noto Sans Thai", ui-sans-serif, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  light: LIGHT, dark: DARK,
}]

export const V6_PALETTES = [{ key: 'monochrome', name: 'Monochrome', acc: '#090909', pop: '#242424', tint: '#f7f7f7' }]
const defaultTheme = themes[0]
export function getTheme(id: string | undefined | null): Theme {
  // Old persisted palette IDs all migrate to the single V6 visual language.
  return themes.find(theme => theme.id === id) ?? defaultTheme
}
export function isDarkOnlyTheme(theme: Theme): boolean { return !!theme.modes && theme.modes.length === 1 && theme.modes[0] === 'dark' }
export function isLightOnlyTheme(theme: Theme): boolean { return !!theme.modes && theme.modes.length === 1 && theme.modes[0] === 'light' }
export function isDualModeTheme(theme: Theme): boolean { return !isLightOnlyTheme(theme) && !isDarkOnlyTheme(theme) }
export function isCharacterTheme(theme: Theme): boolean { return !!theme.character && theme.character !== 'plain' }
const GROUPS: ThemeGroup[] = [
  { id: 'dual', label: 'DUO', description: 'Light and dark modes', matches: isDualModeTheme },
  { id: 'light', label: 'LIGHT', description: 'Light mode only', matches: isLightOnlyTheme },
  { id: 'dark', label: 'DARK', description: 'Dark mode only', matches: isDarkOnlyTheme },
]
export const themeGroups = GROUPS.filter(group => themes.some(theme => group.matches(theme)))
{­²Ö­ºÍ