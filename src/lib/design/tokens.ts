/** Selectable app-owned palette. */
export interface Theme {
  id: string
  label: string
  description: string
  modes?: Array<'light' | 'dark'>
}

/** Picker buckets, derived from a theme's supported modes. */
export type ThemeGroupId = 'dual' | 'light' | 'dark'

export interface ThemeGroup {
  id: ThemeGroupId
  label: string
  description: string
  matches: (theme: Theme) => boolean
}
