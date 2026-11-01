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
  ['--radius', '0.625rem'],
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
    description: 'โทนเขียวทั้งธีม — กระดาษเขียวอ่อน หมึกเขียวมรกต เขียวอมฟ้าเป็นสีหลัก (ค่าเริ่มต้น)',
    fonts: { display: 'Noto Sans Thai, sans-serif', body: 'Noto Sans Thai, sans-serif', mono: SYSTEM_MONO },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai&display=swap',
    light: { bg: '#e6f1e9', fg: '#0b2417', card: '#f7fbf8', border: '#a3c9b1', muted: '#cfe5d6', mutedFg: '#3d5a49', primary: '#0b7a5c', primaryFg: '#ffffff', destructive: '#b3261e', accent: '#c2410c' },
    dark:  { bg: '#08160f', fg: '#ddf3e4', card: '#102319', border: '#295540', muted: '#17301f', mutedFg: '#8fbc9f', primary: '#34e08f', primaryFg: '#03150c', destructive: '#f87171', accent: '#fbbf24' },
  },
  {
    id: 'claude',
    label: 'Claude',
    description: 'กระดาษพาร์ชเมนต์อุ่น ตัวอักษรเซริฟ สีหลักทองอำพันเข้ม',
    fonts: { display: "'Noto Serif Thai', Georgia, serif", body: 'Noto Sans Thai, sans-serif', mono: JETBRAINS },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+Thai&family=Noto+Sans+Thai&family=JetBrains+Mono&display=swap',
    light: { bg: '#f7f0e0', fg: '#241a07', card: '#fffbf2', border: '#d6bf93', muted: '#eee0c4', mutedFg: '#5c4a24', primary: '#96610a', primaryFg: '#ffffff', destructive: '#a3341f', accent: '#9a3412' },
    dark:  { bg: '#1a1408', fg: '#f2e8d2', card: '#26200f', border: '#4d4127', muted: '#332a15', mutedFg: '#c2ab7d', primary: '#e0a52a', primaryFg: '#201603', destructive: '#e06a4a', accent: '#c2410c' },
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'กระดาษเทคนิคโทนฟ้าเย็น สีหลักโคบอลต์เข้มจัด',
    fonts: { display: 'Noto Sans Thai, monospace', body: 'Noto Sans Thai, monospace', mono: SYSTEM_MONO },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai&display=swap',
    light: { bg: '#e4edfb', fg: '#081c39', card: '#f5f9ff', border: '#93b4e6', muted: '#c9daf7', mutedFg: '#2f4a70', primary: '#1852d6', primaryFg: '#ffffff', destructive: '#c0392b', accent: '#0891b2' },
    dark:  { bg: '#060f1f', fg: '#dce9fb', card: '#0d1a30', border: '#1e3b63', muted: '#132742', mutedFg: '#93b3dd', primary: '#5c9bff', primaryFg: '#04122a', destructive: '#f87171', accent: '#22d3ee' },
  },
  {
    id: 'mono',
    label: 'Mono',
    description: 'ขาวดำล้วน ไม่มีสี hue — ดำ ขาว และกราไฟต์ ตลอดทั้งธีม',
    fonts: { display: JETBRAINS, body: JETBRAINS, mono: JETBRAINS },
    fontUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap',
    light: { bg: '#f2f2f2', fg: '#111111', card: '#fbfbfb', border: '#c4c4c4', muted: '#e2e2e2', mutedFg: '#4d4d4d', primary: '#1a1a1a', primaryFg: '#fafafa', destructive: '#b3261e', accent: '#737373' },
    dark:  { bg: '#0d0d0d', fg: '#f2f2f2', card: '#1a1a1a', border: '#3d3d3d', muted: '#262626', mutedFg: '#a3a3a3', primary: '#fafafa', primaryFg: '#111111', destructive: '#f87171', accent: '#a3a3a3' },
  },
  {
    id: 'lotus',
    label: 'Lotus',
    description: 'กระดาษลาเวนเดอร์ สีหลักม่วงไวโอเลตจัดจ้าน เน้นชมพูฮอตพิงก์',
    fonts: { display: 'Noto Sans Thai, sans-serif', body: 'Noto Sans Thai, sans-serif', mono: SYSTEM_MONO },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai&display=swap',
    light: { bg: '#f4eaf8', fg: '#240e2e', card: '#fdf8ff', border: '#c9a4d8', muted: '#e7d3ef', mutedFg: '#543a63', primary: '#7c22ce', primaryFg: '#ffffff', destructive: '#c0392b', accent: '#db2777' },
    dark:  { bg: '#160a1c', fg: '#f0e2f6', card: '#221228', border: '#452a52', muted: '#2f1a36', mutedFg: '#c0a0cc', primary: '#c084fc', primaryFg: '#1c0725', destructive: '#f87171', accent: '#f472b6' },
  },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'จอ CRT เขียวกรด — เขียวฟอสเฟอร์สว่างบนดำสนิท',
    fonts: { display: 'Noto Sans Thai, monospace', body: 'Noto Sans Thai, monospace', mono: JETBRAINS },
    fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai&family=JetBrains+Mono&display=swap',
    light: { bg: '#f0f8e6', fg: '#14260a', card: '#fafff4', border: '#b8e08a', muted: '#dcedbf', mutedFg: '#425a1c', primary: '#3d7d12', primaryFg: '#ffffff', destructive: '#c62828', accent: '#5c8f0a' },
    dark:  { bg: '#04120a', fg: '#b8ffd0', card: '#0a1f10', border: '#1c5230', muted: '#0f2c16', mutedFg: '#6ee7a0', primary: '#22ff88', primaryFg: '#001a08', destructive: '#ff5555', accent: '#a3e635' },
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
    '--sidebar-border': '#d1d5db', '--sidebar-ring': '#2563eb', '--radius': '0.625rem',
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
    '--sidebar-border': '#334155', '--sidebar-ring': '#a3e635', '--radius': '0.625rem',
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
