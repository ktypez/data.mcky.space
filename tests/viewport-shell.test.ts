import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.resolve(import.meta.dirname, '..', file), 'utf8')
const app = read('src/App.svelte')
const shell = read('src/styles/ledger.css')
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

  it('never sizes the shell past the smallest viewport so the nav stays on screen', () => {
    // dvh grows when the browser chrome collapses, which pushed the bottom nav
    // off screen on reload. The shell must stay capped at the svh height.
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*max-height:\s*100svh/s)
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*height:\s*100dvh/s)
  })

  it('keeps navigation in flow and fits full-height pages to the main area', () => {
    expect(app).toContain('ledger-bottom-nav relative')
    expect(app).not.toContain('<footer')
    expect(settings).toContain('DATA Ledger · V3')
    // The catalog root is a full-height column on the shared pill column, so
    // the list, the search pill and the nav pill all share their edges.
    expect(catalog).toContain('ledger-full-bleed ledger-column flex h-full flex-col')
    expect(maps).toContain('flex h-full max-w-xl flex-col')
  })

  it('floats the search pill above the list rather than collapsing it', () => {
    expect(catalog).toContain('ledger-field catalog-head')
    expect(catalog).not.toContain('data-collapsed')
    expect(shell).toMatch(/\.catalog-head\s*\{[^}]*position:\s*absolute/s)
    // The list scrolls under both pills, so the scroller pads both ends.
    expect(catalog).toContain('h-[var(--ledger-head-clear)]')
    expect(catalog).toContain('calc(var(--ledger-nav-height)+var(--ledger-nav-inset))')
  })
})
