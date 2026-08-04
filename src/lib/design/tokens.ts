export interface ThemeVars {
  '--background': string
  '--foreground': string
  '--card': string
  '--card-foreground': string
  '--popover': string
  '--popover-foreground': string
  '--primary': string
  '--primary-foreground': string
  '--secondary': string
  '--secondary-foreground': string
  '--muted': string
  '--muted-foreground': string
  '--accent': string
  '--accent-foreground': string
  '--destructive': string
  '--destructive-foreground': string
  '--success': string
  '--success-foreground': string
  '--warning': string
  '--warning-foreground': string
  '--info': string
  '--info-foreground': string
  '--border': string
  '--input': string
  '--ring': string
  '--sidebar': string
  '--sidebar-foreground': string
  '--sidebar-accent': string
  '--sidebar-accent-foreground': string
  '--sidebar-border': string
  '--sidebar-ring': string
  '--radius': string
  '--pin-color': string
}

export interface ThemeFonts {
  /** display/heading font stack (maps to --theme-font-display) */
  display: string
  /** body font stack (maps to --theme-font-body) */
  body: string
  /** mono/label font stack (maps to --theme-font-mono) */
  mono: string
}

export interface Theme {
  id: string
  label: string
  description: string
  /**
   * Character family. 'plain' (default) = color-swap only, applied via
   * JS-injected CSS vars. Anything else = full character theme with its
   * own static stylesheet in public/themes/.
   */
  character?: 'plain' | 'glitch' | 'crt' | 'paper' | 'rack' | 'noc' | 'min' | 'brut' | 'moss' | 'mcky'
  /** Color modes this theme supports. Dark-only themes force .dark. */
  modes?: Array<'light' | 'dark'>
  /** Font stacks exposed as --theme-font-{display,body,mono} */
  fonts?: Partial<ThemeFonts>
  /** Google Fonts URL — lazy-injected while the theme is active */
  fontUrl?: string
  /**
   * Static stylesheet (public/themes/{id}.css) loaded via <link>.
   * Present only on character themes; owns the full var set + effects.
   */
  staticCss?: string
  light: ThemeVars
  dark: ThemeVars
}
