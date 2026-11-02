// =============================================================================
// scripts/gen-themes.mjs
// -----------------------------------------------------------------------------
// Single source of truth for the V5 “paper pop” palettes.
// Emits:
//   - public/themes/paper-pop.css  (byte-copy of src/styles/v5-tokens.css —
//     the whole V5 token block, all 4 palettes × light/dark, so the pre-paint
//     boot script and the bundled copy can never drift)
//   - src/lib/design/themes.ts     (Theme metadata + ThemeVars + V5_PALETTES)
//
// The prototype drives colour with data-palette (matcha · coral · blueberry ·
// butter) × .dark. The app keeps its data-theme + .dark mechanism; the theme
// id IS the palette id, and every entry points staticCss at the one shared
// stylesheet. Fonts ship from index.html, so no fontUrl is emitted.
// Run:
//   node scripts/gen-themes.mjs
// =============================================================================
import { writeFileSync, mkdirSync, rmSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SORA = '"Sora", "Noto Sans Thai", ui-sans-serif, system-ui, sans-serif'
const JETBRAINS = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace'

// ——— the 4 V5 palettes (ids/labels/hues = design/v5 PALETTES) ————————
const PALETTES = [
  {
    id: 'matcha',
    label: 'Matcha',
    description: 'กระดาษอุ่นโทนชามัทฉะ — เขียวขี้มังกรเป็นสีหลัก ส้มพีชเป็นสีป๊อป (ค่าเริ่มต้น)',
    light: { acc: '#158068', accStrong: '#0f6652', accTint: '#e2f2e8', accInk: '#0c5b44', pop: '#f2593f', popTint: '#fde6e0', popInk: '#b23a24' },
    dark: { acc: '#35c49c', accStrong: '#4ad3ac', accTint: '#163c31', accInk: '#8ae0c2', pop: '#ff7a63', popTint: '#42241f', popInk: '#ffa695' },
  },
  {
    id: 'coral',
    label: 'Coral',
    description: 'คอรัลส้มแดงเป็นสีหลัก ทีลเข้มเป็นสีป๊อป — อบอุ่นและสดใส',
    light: { acc: '#e8503a', accStrong: '#c93b27', accTint: '#fce7e1', accInk: '#a93a27', pop: '#17918c', popTint: '#dff2f1', popInk: '#0e5f5b' },
    dark: { acc: '#ff6b52', accStrong: '#ff8570', accTint: '#40211c', accInk: '#ffa18d', pop: '#2bb5af', popTint: '#153b3a', popInk: '#7fd8d3' },
  },
  {
    id: 'blueberry',
    label: 'Blueberry',
    description: 'บลูเบอร์รีน้ำเงินเป็นสีหลัก หมักเขียวเป็นสีป๊อป — เย็นและมั่นคง',
    light: { acc: '#3e63dd', accStrong: '#2f4fc0', accTint: '#e7ecfc', accInk: '#2b49ae', pop: '#f2a93b', popTint: '#fbefd7', popInk: '#8f5a08' },
    dark: { acc: '#7c97f4', accStrong: '#93abf7', accTint: '#1f2a4e', accInk: '#a9bcf8', pop: '#f5b84d', popTint: '#40311a', popInk: '#f6ce85' },
  },
  {
    id: 'butter',
    label: 'Butter',
    description: 'เนยส้มทองเป็นสีหลัก ม่วงไอริสเป็นสีป๊อป — นุ่มละมุน',
    light: { acc: '#c77d0a', accStrong: '#a56607', accTint: '#faedd3', accInk: '#8f5a08', pop: '#6d5bd0', popTint: '#eae7fb', popInk: '#4a3c9e' },
    dark: { acc: '#f2a93f', accStrong: '#f6bc5f', accTint: '#42331a', accInk: '#f6cb7f', pop: '#9b8bf5', popTint: '#2a2450', popInk: '#c4bafb' },
  },
]

// ——— shared base (identical in every palette; mirrors v5-tokens.css) ————
const BASE = {
  light: { paper: '#f6f2e9', paper2: '#eee9db', card: '#fffdf6', ink: '#28251d', inkSoft: '#6f685b', rule: '#e6dfcc' },
  dark: { paper: '#17181d', paper2: '#131419', card: '#1f2128', ink: '#ede9dd', inkSoft: '#a4aab6', rule: '#2e313b' },
  banana: '#f2b63d',
  sky: '#57a7e0',
}

const PALETTE_TO_VARS = (mode, p) => {
  const b = BASE[mode]
  return [
    ['--background', b.paper],
    ['--foreground', b.ink],
    ['--card', b.card],
    ['--card-foreground', b.ink],
    ['--popover', b.card],
    ['--popover-foreground', b.ink],
    ['--primary', p.acc],
    ['--primary-foreground', '#ffffff'],
    ['--secondary', b.paper2],
    ['--secondary-foreground', b.ink],
    ['--muted', b.paper2],
    ['--muted-foreground', b.inkSoft],
    ['--accent', p.pop],
    ['--accent-foreground', p.popInk],
    ['--destructive', mode === 'light' ? '#d9453a' : '#f26d60'],
    ['--destructive-foreground', '#ffffff'],
    ['--success', p.acc],
    ['--success-foreground', '#ffffff'],
    ['--warning', BASE.banana],
    ['--warning-foreground', b.ink],
    ['--info', BASE.sky],
    ['--info-foreground', '#ffffff'],
    ['--border', b.rule],
    ['--input', b.rule],
    ['--ring', p.acc],
    ['--sidebar', b.card],
    ['--sidebar-foreground', b.ink],
    ['--sidebar-accent', b.paper2],
    ['--sidebar-accent-foreground', b.ink],
    ['--sidebar-border', b.rule],
    ['--sidebar-ring', p.acc],
    ['--radius', '0.625rem'],
    ['--pin-color', p.acc],
  ]
}

function toTsVarBlock(vars) {
  return Object.entries(vars).map(([k, v]) => `      '${k}': ${JSON.stringify(v)},`).join('\n')
}

// ——— emit public/themes/paper-pop.css ---------------------------------------
// Byte-copy of the bundled token file: the pre-paint stylesheet and the app
// bundle can never drift apart.
const tokensCss = readFileSync(resolve(ROOT, 'src/styles/v5-tokens.css'), 'utf8')
mkdirSync(resolve(ROOT, 'public/themes'), { recursive: true })
writeFileSync(resolve(ROOT, 'public/themes/paper-pop.css'), tokensCss)

// Retire the 6 pre-V5 theme stylesheets — nothing references them anymore.
const themesDir = resolve(ROOT, 'public/themes')
for (const file of readdirSync(themesDir)) {
  if (file !== 'paper-pop.css' && file.endsWith('.css')) rmSync(resolve(themesDir, file))
}

// ——— emit src/lib/design/themes.ts -----------------------------------------
const themeEntries = PALETTES.map((p) => `  {
    id: '${p.id}',
    label: '${p.label}',
    description: '${p.description}',
    character: 'plain',
    modes: ['light', 'dark'],
    fonts: { display: ${JSON.stringify(SORA)}, body: ${JSON.stringify(SORA)}, mono: ${JSON.stringify(JETBRAINS)} },
    staticCss: '/themes/paper-pop.css',
    light: {
${toTsVarBlock(Object.fromEntries(PALETTE_TO_VARS('light', p.light)))}
    },
    dark: {
${toTsVarBlock(Object.fromEntries(PALETTE_TO_VARS('dark', p.dark)))}
    },
  }`).join(',\n')

const swatchEntries = PALETTES.map(
  (p) => `  { key: '${p.id}', name: '${p.label}', acc: '${p.light.acc}', pop: '${p.light.pop}', tint: '${p.light.accTint}' },`,
).join('\n')

const ts = `// =============================================================================
// themes.ts — data.mcky.space theme registry
// -----------------------------------------------------------------------------
// GENERATED by scripts/gen-themes.mjs — do not edit by hand.
//
// The 4 V5 “paper pop” palettes below replace the 6 pre-V5 presets. Each is a
// dual-mode colour palette applied via the one shared static stylesheet at
// /themes/paper-pop.css that the boot script preloads and app-theme.ts keeps
// active. The theme id IS the palette id (matcha is the default).
// =============================================================================
import type { Theme, ThemeGroup } from './tokens'

export type { Theme, ThemeGroup, ThemeVars } from './tokens'

export const themes: Theme[] = [
${themeEntries},
]

/** Swatch metadata for the Settings palette picker (light-mode hues). */
export const V5_PALETTES: Array<{ key: string; name: string; acc: string; pop: string; tint: string }> = [
${swatchEntries}
]

const defaultTheme: Theme = themes.find((t) => t.id === 'matcha') ?? themes[0]

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

console.log('Generated themes.ts + paper-pop.css (' + PALETTES.length + ' palettes)')
