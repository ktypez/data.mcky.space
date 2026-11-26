import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const topBar = readFileSync(path.resolve(import.meta.dirname, '..', 'src/components/TopBar.svelte'), 'utf8')

describe('TopBar SPA navigation', () => {
  it('uses hash routes for internal links instead of causing document navigation', () => {
    expect(topBar).toContain('href="#/"')
    expect(topBar).toContain('href={`#${item.to}`}')
    expect(topBar).toContain('href="#/add"')
    expect(topBar).not.toContain('href={item.to}')
    expect(topBar).not.toContain('href="/add"')
    expect(topBar).not.toContain('href="/maps"')
  })

  it('preserves the unsaved-form guard for hash-route clicks', () => {
    expect(topBar).toContain('function guard(event: MouseEvent, to: string)')
    expect(topBar).toContain('event.preventDefault()')
    expect(topBar).toContain('askLeave(() => push(to))')
  })
})
