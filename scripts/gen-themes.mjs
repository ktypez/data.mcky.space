// =============================================================================
// scripts/gen-themes.mjs
// -----------------------------------------------------------------------------
// Single source of truth for the 6 adopted design-prototype themes (+ custom).
// Emits:
//   - src/lib/design/themes.ts   (Theme metadata + ThemeVars for picker/swatches)
//   - public/themes/{id}.css     (the actual CSS-var definitions, pre-paint)
//
// Proto palette (10 colours) is mapped into the app's full ThemeVars shape so
// index.css / ledger.css / every component keep working unchanged. Run:
//   node scripts/gen-themes.mjs
// =============================================================================
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SYSTEM_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
const JETBRAINS = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

const PALETTE_TO_VARS = (p) => [
  ['--background', p.bg],
  ['--foreground', p.fg],
  ['--card', p.card],
  ['--card-foreground', p.fg],
  ['--popover', p.card],
  ['--popover-foreground', p.fg],
  ['--primary', p.primary],
  ['--primary-foreground', p.primaryFg],
  ['--secondary', p.muted],
  ['--secondary-foreground', p.fg],
  ['--muted', p.muted],
  ['--muted-foreground', p.mutedFg],
  ['--accent', p.accent],
  ['--accent-foreground', p.fg],
  ['--destructive', p.destructive],
  ['--destructive-foreground', p.primaryFg],
  ['--success', p.primary],
  ['--success-foreground', p.primaryFg],
  ['--warning', p.accent],
  ['--warning-foreground', p.primaryFg],
  ['--info', p.primary],
  ['--info-foreground', p.primaryFg],
  ['--border', p.border],
  ['--input', p.border],
  ['--ring', p.primary],
  ['--sidebar', p.card],
  ['--sidebar-foreground', p.fg],
  ['--sidebar-accent', p.muted],
  ['--sidebar-accent-foreground', p.fg],
  ['--sidebar-border', p.border],
  ['--sidebar-ring', p.primary],
  ['--radius', '0.4rem'],
  ['--pin-color', p.primary],
]

const CSS_VARS = (p, fonts) => [
  ...PALETTE_TO_VARS(p),
  ['--theme-font-display', fonts.display],
  ['--theme-font-body', fonts.body],
  ['--theme-font-mono', fonts.mono],
]

const THEMES = [
  {
    id: 'ledger',
    label: 'Ledger',
    description: 'Cream ledger with a forest-green primary — the prototype default.',
    fonts: { display: 'Noto Sans Thai, sans-serif', body: 'Noto Sans Thai, sans-serif', mono: SYSTEM_MONO },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai&display=swap',
    light: { bg: '#f6f6f4', fg: '#2a2a2a', card: '#ffffff', border: '#d8d8d4', muted: '#ececea', mutedFg: '#6b6b69', primary: '#1f6f54', primaryFg: '#ffffff', destructive: '#c0392b', accent: '#e07a3f' },
    dark:  { bg: '#1a1a1a', fg: '#e8e8e6', card: '#262626', border: '#3a3a3a', muted: '#2e2e2e', mutedFg: '#a0a09e', primary: '#4ecb8f', primaryFg: '#12231d', destructive: '#e74c3c', accent: '#f0a868' },
  },
  {
    id: 'claude',
    label: 'Claude',
    description: 'Warm paper with an editorial serif and amber-gold primary.',
    fonts: { display: "'Noto Serif Thai', Georgia, serif", body: 'Noto Sans Thai, sans-serif', mono: JETBRAINS },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+Thai&family=Noto+Sans+Thai&family=JetBrains+Mono&display=swap',
    light: { bg: '#faf9f5', fg: '#1a1814', card: '#ffffff', border: '#e8e4da', muted: '#f0ede6', mutedFg: '#6b655a', primary: '#b8860b', primaryFg: '#ffffff', destructive: '#a0522d', accent: '#cd853f' },
    dark:  { bg: '#1c1a15', fg: '#ece8df', card: '#2a2721', border: '#3d382e', muted: '#332f28', mutedFg: '#a8a193', primary: '#d4a72c', primaryFg: '#1a1608', destructive: '#c0623a', accent: '#d99a5b' },
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'Cool technical paper with a blue primary.',
    fonts: { display: 'Noto Sans Thai, monospace', body: 'Noto Sans Thai, monospace', mono: SYSTEM_MONO },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai&display=swap',
    light: { bg: '#f0f4f8', fg: '#1a2733', card: '#ffffff', border: '#c5d0dc', muted: '#e4ebf2', mutedFg: '#5a6b7a', primary: '#1a5fb4', primaryFg: '#ffffff', destructive: '#c0392b', accent: '#3a7bd5' },
    dark:  { bg: '#141c26', fg: '#dce6f0', card: '#1e2a36', border: '#2e3e4e', muted: '#243240', mutedFg: '#8a9bab', primary: '#5b9bf0', primaryFg: '#0a1520', destructive: '#e74c3c', accent: '#4a8ae0' },
  },
  {
    id: 'mono',
    label: 'Mono',
    description: 'Neutral monospace-forward theme with a muted green primary.',
    fonts: { display: JETBRAINS, body: JETBRAINS, mono: JETBRAINS },
    fontUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap',
    light: { bg: '#f4f4f4', fg: '#1a1a1a', card: '#ffffff', border: '#d0d0d0', muted: '#e8e8e8', mutedFg: '#666666', primary: '#2f6f54', primaryFg: '#ffffff', destructive: '#c0392b', accent: '#888888' },
    dark:  { bg: '#1a1a1a', fg: '#e0e0e0', card: '#262626', border: '#383838', muted: '#2e2e2e', mutedFg: '#999999', primary: '#4ecb8f', primaryFg: '#12231d', destructive: '#e74c3c', accent: '#aaaaaa' },
  },
  {
    id: 'lotus',
    label: 'Lotus',
    description: 'Soft warm-neutral with a violet primary and pink accent.',
    fonts: { display: 'Noto Sans Thai, sans-serif', body: 'Noto Sans Thai, sans-serif', mono: SYSTEM_MONO },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai&display=swap',
    light: { bg: '#f7f4f2', fg: '#2a2420', card: '#ffffff', border: '#e6ddd6', muted: '#efeae5', mutedFg: '#7a7168', primary: '#9b59b6', primaryFg: '#ffffff', destructive: '#c0392b', accent: '#e08fb0' },
    dark:  { bg: '#1f1b18', fg: '#e8e2dd', card: '#2b2521', border: '#3e3630', muted: '#332c27', mutedFg: '#a89e95', primary: '#c77fdb', primaryFg: '#1a1218', destructive: '#e74c3c', accent: '#e0a0c0' },
  },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'Slightly green-tinted terminal feel with a leaf primary.',
    fonts: { display: 'Noto Sans Thai, monospace', body: 'Noto Sans Thai, monospace', mono: JETBRAINS },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai&family=JetBrains+Mono&display=swap',
    light: { bg: '#f2f2ee', fg: '#1a1a18', card: '#ffffff', border: '#d4d4ce', muted: '#e6e6e1', mutedFg: '#6b6b66', primary: '#2e7d32', primaryFg: '#ffffff', destructive: '#c62828', accent: '#6b8e23' },
    dark:  { bg: '#181816', fg: '#e4e4e0', card: '#242420', border: '#363630', muted: '#2c2c28', mutedFg: '#a0a098', primary: '#5cb870', primaryFg: '#101912', destructive: '#e53935', accent: '#8bc34a' },
  },
]

// custom theme: user-defined palette (kept as-is from the original registry).
const CUSTOM = {
  id: 'custom',
  label: 'Custom',
  description: 'เลือกสีพื้น ตัวอักษร สีหลัก และเส้นขอบเอง',
  character: 'plain',
  modes: ['light', 'dark'],
  staticCss: '/themes/custom.css',
  light: {
    '--background': '#ffffff', '--foreground': '#111111', '--card': '#ffffff',
    '--card-foreground': '#111111', '--popover': '#ffffff', '--popover-foreground': '#111111',
    '--primary': '#2563eb', '--primary-foreground': '#ffffff', '--secondary': '#f1f5f9',
    '--secondary-foreground': '#111111', '--muted': '#f1f5f9', '--muted-foreground': '#475569',
    '--accent': '#2563eb', '--accent-foreground': '#ffffff', '--destructive': '#dc2626',
    '--destructive-foreground': '#ffffff', '--success': '#15803d', '--success-foreground': '#ffffff',
    '--warning': '#a16207', '--warning-foreground': '#ffffff', '--info': '#2563eb',
    '--info-foreground': '#ffffff', '--border': '#d1d5db', '--input': '#d1d5db',
    '--ring': '#2563eb', '--sidebar': '#f8fafc', '--sidebar-foreground': '#111111',
    '--sidebar-accent': '#e2e8f0', '--sidebar-accent-foreground': '#111111',
    '--sidebar-border': '#d1d5db', '--sidebar-ring': '#2563eb', '--radius': '0.5rem',
    '--pin-color': '#2563eb',
  },
  dark: {
    '--background': '#0b0f19', '--foreground': '#f8fafc', '--card': '#111827',
    '--card-foreground': '#f8fafc', '--popover': '#111827', '--popover-foreground': '#f8fafc',
    '--primary': '#a3e635', '--primary-foreground': '#0f172a', '--secondary': '#1e293b',
    '--secondary-foreground': '#f8fafc', '--muted': '#1e293b', '--muted-foreground': '#cbd5e1',
    '--accent': '#a3e635', '--accent-foreground': '#0f172a', '--destructive': '#f87171',
    '--destructive-foreground': '#0f172a', '--success': '#4ade80', '--success-foreground': '#0f172a',
    '--warning': '#fbbf24', '--warning-foreground': '#0f172a', '--info': '#38bdf8',
    '--info-foreground': '#0f172a', '--border': '#334155', '--input': '#334155',
    '--ring': '#a3e635', '--sidebar': '#111827', '--sidebar-foreground': '#f8fafc',
    '--sidebar-accent': '#1e293b', '--sidebar-accent-foreground': '#f8fafc',
    '--sidebar-border': '#334155', '--sidebar-ring': '#a3e635', '--radius': '0.5rem',
    '--pin-color': '#a3e635',
  },
}

// ---- emit public/themes/{id}.css -------------------------------------------
for (const t of THEMES) {
  const light = CSS_VARS(t.light, t.fonts)
  const dark = CSS_VARS(t.dark, t.fonts)
  const css = `/* ============================================================================
   ${t.id}.css — data.mcky.space theme (${t.label})
   -----------------------------------------------------------------------------
   GENERATED by scripts/gen-themes.mjs — do not edit by hand.
   ${t.description}
   Light = [data-theme='${t.id}']  ·  Dark = .dark[data-theme='${t.id}']
   ============================================================================ */
[data-theme='${t.id}'] {
${light.map(([k, v]) => `  ${k}: ${v};`).join('\n')}
}

.dark[data-theme='${t.id}'] {
${dark.map(([k, v]) => `  ${k}: ${v};`).join('\n')}
}
`
  writeFileSync(resolve(ROOT, 'public/themes', `${t.id}.css`), css)
}

// custom.css is hand-maintained; don't overwrite it.

// ---- emit src/lib/design/themes.ts -----------------------------------------
function toTsVarBlock(vars) {
  return Object.entries(vars).map(([k, v]) => `      '${k}': ${JSON.stringify(v)},`).join('\n')
}

function toVarsObj(p) {
  return Object.fromEntries(PALETTE_TO_VARS(p))
}

const protoEntries = THEMES.map((t) => `  {
    id: '${t.id}',
    label: '${t.label}',
    description: '${t.description}',
    character: 'plain',
    modes: ['light', 'dark'],
    fonts: { display: ${JSON.stringify(t.fonts.display)}, body: ${JSON.stringify(t.fonts.body)}, mono: ${JSON.stringify(t.fonts.mono)} },
    fontUrl: '${t.fontUrl}',
    staticCss: '/themes/${t.id}.css',
    light: {
${toTsVarBlock(toVarsObj(t.light))}
    },
    dark: {
${toTsVarBlock(toVarsObj(t.dark))}
    },
  }`).join(',\n')

const customEntry = `  {
    id: 'custom',
    label: 'Custom',
    description: 'เลือกสีพื้น ตัวอักษร สีหลัก และเส้นขอบเอง',
    character: 'plain',
    modes: ['light', 'dark'],
    staticCss: '/themes/custom.css',
    light: {
${toTsVarBlock(CUSTOM.light)}
    },
    dark: {
${toTsVarBlock(CUSTOM.dark)}
    },
  }`

const ts = `// =============================================================================
// themes.ts — data.mcky.space theme registry
// -----------------------------------------------------------------------------
// GENERATED by scripts/gen-themes.mjs — do not edit by hand.
//
// The 6 themes below are adopted from the Ledger design prototype (React).
// Each is a "plain" colour theme (no glitch/crt/brut effects), dual-mode
// (light + dark), applied via a static stylesheet at /themes/{id}.css that the
// boot script preloads and app-theme.ts swaps at runtime.
// The trailing 'custom' theme is the user-editable palette.
// =============================================================================
import type { Theme, ThemeGroup } from './tokens'

export type { Theme, ThemeGroup, ThemeVars } from './tokens'

export const themes: Theme[] = [
${protoEntries},
${customEntry},
]

const defaultTheme: Theme = themes.find((t) => t.id === 'ledger') ?? themes[0]

export function getTheme(id: string | undefined | null): Theme {
  return themes.find((t) => t.id === id) ?? defaultTheme
}

export function isDarkOnlyTheme(t: Theme): boolean {
  return !!t.modes && t.modes.length === 1 && t.modes[0] === 'dark'
}

export function isLightOnlyTheme(t: Theme): boolean {
  return !!t.modes && t.modes.length === 1 && t.modes[0] === 'light'
}

export function isDualModeTheme(t: Theme): boolean {
  return !isLightOnlyTheme(t) && !isDarkOnlyTheme(t)
}

export function isCharacterTheme(t: Theme): boolean {
  return !!t.character && t.character !== 'plain'
}

const GROUPS: ThemeGroup[] = [
  { id: 'dual', label: 'DUO', description: 'ใช้ได้ทั้งโหมดสว่างและโหมดมืด', matches: isDualModeTheme },
  { id: 'light', label: 'LIGHT', description: 'ใช้ได้เฉพาะโหมดสว่าง', matches: isLightOnlyTheme },
  { id: 'dark', label: 'DARK', description: 'ใช้ได้เฉพาะโหมดมืด', matches: isDarkOnlyTheme },
]

export const themeGroups: ThemeGroup[] = GROUPS.filter((g) => themes.some((t) => g.matches(t)))
`
writeFileSync(resolve(ROOT, 'src/lib/design/themes.ts'), ts)

console.log('Generated themes.ts + ' + THEMES.length + ' CSS files (custom.css untouched)')
