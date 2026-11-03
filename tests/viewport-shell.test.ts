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
    // The scroll container must NOT contain overscroll, or the gesture never
    // chains to the root scroller and the browser's pull-to-refresh dies.
    expect(app).toContain('flex-1 overflow-y-auto')
    expect(app).not.toContain('overscroll-contain')
    expect(catalog).not.toContain('overscroll-contain')
  })

  it('fills the dynamic mobile viewport instead of stopping at the smallest one', () => {
    // 100dvh tracks the visible viewport, so the shell grows back when the
    // mobile browser chrome hides. Capping at 100svh used to leave a dead strip
    // at the bottom on phones (the app looked letterboxed).
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*height:\s*100dvh/s)
    expect(shell).not.toMatch(/\.ledger-shell\s*\{[^}]*max-height:\s*100s?vh/s)
    // Standalone PWA paints edge to edge (viewport-fit=cover) and insets the
    // shell so content stays clear of the notch / home indicator.
    expect(app.length).toBeGreaterThan(0)
    expect(read('index.html')).toContain('viewport-fit=cover')
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*safe-area-inset-bottom/s)
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*safe-area-inset-top/s)
  })

  it('keeps navigation in flow and fits full-height pages to the main area', () => {
    expect(app).toContain('TopBar')
    expect(settings).toContain('DATA Ledger')
    // Maps still fills <main> exactly — it is a map, not a document.
    expect(maps).toContain('flex h-full max-w-6xl flex-col')
  })

  it('scrolls the catalog with the page instead of inside its own card', () => {
    // The catalog is one long page: the card no longer owns a scroll box, so
    // the whole document scrolls (and pull-to-refresh reaches the browser).
    expect(catalog).not.toContain('flex h-full max-w-6xl flex-col')
    expect(catalog).not.toMatch(/bind:this=\{parentRef\}[^>]*overflow-(?:auto|scroll)/)
    // The virtualiser therefore measures against <main>, the only scroller,
    // using scrollMargin to compensate for the header above the list.
    expect(catalog).toContain("document.getElementById('ledger-main')")
    expect(catalog).toContain('scrollMargin')
    // The search field stays reachable while the rows scroll underneath.
    expect(catalog).toMatch(/class="[^"]*sticky[^"]*"/)
    // Route changes reset <main>, or the catalog reopens mid-scroll.
    expect(app).toContain("document.getElementById('ledger-main')?.scrollTo")
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
