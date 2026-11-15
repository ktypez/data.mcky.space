import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (file: string) => readFileSync(resolve(process.cwd(), 'src', file), 'utf8')

describe('V6 monochrome integration', () => {
  it('loads the shared mcky-ui CSS foundation', () => {
    const css = read('index.css')
    expect(css).toContain("@import '@mcky/ui/core.css';")
    expect(css).toContain("./styles/v6-compat.css")
  })

  it('maps legacy app tokens to neutral semantic tokens', () => {
    const css = read('styles/v6-compat.css')
    expect(css).toContain('@import \'@mcky/ui/tokens.css\';')
    expect(css).toContain('--acc: var(--ui-fg)')
    expect(css).toContain('--pop: var(--ui-gray-700)')
    expect(css).not.toMatch(/#[0-9a-fA-F]{6}/)
  })

  it('removes the V5 stylesheet and paper texture', () => {
    const html = read('../index.html')
    const primitives = read('styles/v6-primitives.css')
    expect(html).not.toContain('paper-pop.css')
    expect(primitives).toContain('background-image: none')
  })
})
