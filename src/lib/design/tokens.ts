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

export interface Theme {
  id: string
  label: string
  description: string
  light: ThemeVars
  dark: ThemeVars
}
