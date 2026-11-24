import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.resolve(import.meta.dirname, '..', file), 'utf8')
const app = read('src/App.svelte')
const shell = read('src/styles/v5-ui.css')
const layout = read('src/styles/workspace-layout.css')
const catalog = read('src/pages/Catalog.svelte')
const maps = read('src/pages/Maps.svelte')
const settings = read('src/pages/Settings.svelte')

describe('Application viewport (V6 Work Shell)', () => {
  it('keeps page overscroll available while giving long pages an internal scroll area', () => {
    expect(shell).toContain('body:has(.ledger-shell)')
    expect(shell).toContain('overscroll-behavior-y: auto')
    expect(shell).not.toContain('overscroll-behavior-y: none')
    expect(shell).toMatch(/body:has\(\.ledger-shell\)\s*\{[^}]*\}/s)
    expect(shell.match(/body:has\(\.ledger-shell\)\s*\{[^}]*\}/s)?.[0]).not.toContain('overflow: hidden')
    expect(shell).toContain('#root:has(.ledger-shell)')
    expect(app).toContain('flex-1 overflow-y-auto')
    expect(app).not.toContain('overscroll-contain')
    expect(catalog).not.toContain('overscroll-contain')
  })

  it('fills the dynamic mobile viewport and respects safe areas', () => {
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*height:\s*100dvh/s)
    expect(shell).not.toMatch(/\.ledger-shell\s*\{[^}]*max-height:\s*100s?vh/s)
    expect(read('index.html')).toContain('viewport-fit=cover')
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*safe-area-inset-bottom/s)
    expect(shell).toMatch(/\.ledger-shell\s*\{[^}]*safe-area-inset-top/s)
  })

  it('uses the shared horizontal V5 top navigation and keeps map pages full height', () => {
    expect(app).toContain('TopBar')
    expect(app).toContain('app-workspace')
    expect(settings).toContain('DATA Ledger')
    expect(maps).toContain('flex h-full max-w-6xl flex-col')
    expect(layout).toContain('.page-shell--maps')
    expect(layout).toContain('.mcky-v6-scenery-content .page-shell')
  })

  it('scrolls the catalog with the page instead of inside its own card', () => {
    expect(catalog).not.toContain('flex h-full max-w-6xl flex-col')
    expect(catalog).not.toMatch(/bind:this=\{parentRef\}[^>]*overflow-(?:auto|scroll)/)
    expect(catalog).toContain("document.getElementById('ledger-main')")
    expect(catalog).toContain('scrollMargin')
    expect(catalog).toMatch(/class="[^"]*sticky[^"]*"/)
    expect(app).toContain("document.getElementById('ledger-main')?.scrollTo")
  })

  it('uses px type tokens and maintains 44px interactive targets', () => {
    expect(shell).toContain(".ledger-shell :is(button, a[href], [role='button'], [role='tab'], [role='option'], [role='switch'])")
    expect(shell).toMatch(/min-height:\s*44px/)
    expect(shell).toContain('select { min-height: 44px; font-size: 14px; }')
    const indexCss = read('src/index.css')
    expect(indexCss).toContain('--text-xs: 12px;')
    expect(indexCss).toContain('--text-sm: 14px;')
    expect(indexCss).toContain('--text-base: 16px;')
  })

  it('keeps search and filter controls separate with the V6 shell in place', () => {
    expect(catalog).toContain('name="q"')
    expect(catalog).toContain('aria-pressed={filter === choice.key}')
    expect(catalog).not.toContain('ledger-field')
    expect(catalog).not.toContain('รีเฟรชหน้า')
    expect(app).toContain('TopBar')
    expect(app).toContain('mcky-v6-scenery-content')
    expect(layout).toContain('.mcky-v6-scenery-content .page-shell')
    expect(shell).toContain('var(--mcky-v6-')
  })
})
