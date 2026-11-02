import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.resolve(import.meta.dirname, '..', file), 'utf8')
const app = read('src/App.svelte')
// V5 “paper pop” replaced the V4 ledger.css shell (rail + header + bottom nav)
// with the component classes in v5-ui.css; the shell rules live there now.
const shell = read('src/styles/v5-ui.css')
const catalog = read('src/pages/Catalog.svelte')
const maps = read('src/pages/Maps.svelte')
const settings = read('src/pages/Settings.svelte')

describe('locked application viewport', () => {
  it('keeps page overscroll available while giving long pages an internal scroll area', () => {
    expect(shell).toContain('body:has(.ledger-shell)')
    expect(shell).toContain('overscroll-behavior-y: auto')
    expect(shell).not.toContain('overscroll-behavior-y: none')
    expect(shell).toMatch(/body:has\(\.ledger-shell\)\s*\{[^}]*\}/s)
    expect(shell.match(/body:has\(\.ledger-shell\)\s*\{[^}]*\}/s)?.[0]).not.toContain('overflow: hidden')
    expect(shell).toContain('#root:has(.ledger-shell)')
    expect(app).toContain('flex-1 overflow-y-auto overscroll-contain')
  })

  it('never sizes the shell past the smallest viewport so the top bar stays on screen', () => {
    // dvh grows when the browser chrome collapses, which pushed the bottom nav
    // off screen on reload. The shell must stay capped at the svh height.
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*max-height:\s*100svh/s)
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*height:\s*100dvh/s)
  })

  it('keeps navigation in flow and fits full-height pages to the main area', () => {
    expect(app).toContain('TopBar')
    expect(settings).toContain('DATA Ledger')
    // The catalog is a full-height column with the card filling the rest.
    expect(catalog).toContain('flex h-full max-w-6xl flex-col')
    expect(maps).toContain('flex h-full max-w-6xl flex-col')
  })

  it('uses px type tokens and ≥44px touch targets', () => {
    // V5 dropped the 75% root font-size: sizing is px-based via the text-*
    // tokens in index.css, so the touch-target floor is stated in px too.
    expect(shell).toContain(".ledger-shell :is(button, a[href], [role='button'], [role='tab'], [role='option'], [role='switch'])")
    expect(shell).toMatch(/min-height:\s*44px/)
    expect(shell).toContain('select { min-height: 44px; font-size: 14px; }')
    const indexCss = read('src/index.css')
    expect(indexCss).toContain('--text-xs: 12px;')
    expect(indexCss).toContain('--text-sm: 14px;')
    expect(indexCss).toContain('--text-base: 16px;')
  })

  it('keeps the search field and filter button as separate controls', () => {
    expect(catalog).toContain('name="q"')
    expect(catalog).toContain('aria-pressed={filter === choice.key}')
    expect(catalog).not.toContain('ledger-field')
    expect(catalog).not.toContain('รีเฟรชหน้า')
    // The nav is a sticky top bar in flow with its own primary action.
    expect(app).toContain('TopBar')
    expect(shell).toContain('.ledger-shell')
    expect(shell).not.toContain('lg-nav-dist')
  })
})
