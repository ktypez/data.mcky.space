// Allowed theme ids for the profile-theme endpoint.
//
// NOTE: keep in sync with `THEME_IDS` in src/lib/design/themes.ts.
// This is a static copy on purpose — Pages Functions are bundled
// separately and importing from src/ risks dragging heavy deps in.

export const THEME_IDS = [
  // plain (legacy)
  'bubblegum',
  'slate',
  // character
  'glitchpage',
  'crt',
  'claude',
  'rack',
  'noc',
  'min',
  'brut',
  'mcky',
  'blueprint',
  'noir',
  'portal',
] as const

export type ThemeId = (typeof THEME_IDS)[number]

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value)
}
