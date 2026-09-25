import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.resolve(import.meta.dirname, '..', file), 'utf8')
const app = read('src/App.tsx')
const shell = read('src/styles/ledger.css')
const catalog = read('src/pages/Catalog.tsx')
const maps = read('src/pages/Maps.tsx')
const settings = read('src/pages/Settings.tsx')

describe('locked application viewport', () => {
  it('keeps page overscroll available while giving long pages an internal scroll area', () => {
    expect(shell).toContain('body:has(.ledger-shell)')
    expect(shell).toContain('overscroll-behavior-y: auto')
    expect(shell).toMatch(/body:has\(\.ledger-shell\)\s*\{[^}]*\}/s)
    expect(shell.match(/body:has\(\.ledger-shell\)\s*\{[^}]*\}/s)?.[0]).not.toContain('overflow: hidden')
    expect(shell).toContain('#root:has(.ledger-shell)')
    expect(app).toContain('flex-1 overflow-y-auto overscroll-contain')
  })

  it('keeps navigation in flow and fits full-height pages to the main area', () => {
    expect(app).toContain('ledger-bottom-nav relative')
    expect(app).not.toContain('<footer')
    expect(settings).toContain('DATA Ledger · V3')
    expect(catalog).toContain('flex h-full max-w-xl flex-col')
    expect(maps).toContain('flex h-full max-w-xl flex-col')
  })
})
