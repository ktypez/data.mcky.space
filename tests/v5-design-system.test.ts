import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('V5 shared design-system integration', () => {
  it('uses mcky-ui as the only source of palette and semantic color tokens', async () => {
    const adapter = await read('../src/styles/v5-tokens.css')
    const index = await read('../src/index.css')
    const core = await read('../node_modules/@mcky/ui/src/styles/core.css')
    expect(index).toContain("@import '@mcky/ui/core.css'")
    expect(core).toContain("@import \"./tokens.css\"")
    expect(adapter).toContain('--primary: var(--acc)')
    expect(adapter).toContain('--background: var(--paper)')
    expect(adapter).not.toContain('data-palette="matcha"')
    expect(adapter).not.toContain('#f6f2e9')
  })

  it('starts in the V5 matcha palette before the app mounts', async () => {
    const html = await read('../index.html')
    expect(html).toContain("root.setAttribute('data-palette', palette)")
    expect(html).toContain("root.setAttribute('data-theme', palette)")
    expect(html).toContain("['matcha', 'coral', 'blueberry', 'butter']")
    expect(html).toContain("root.setAttribute('data-texture', texture)")
    expect(html).not.toContain('monochrome')
    expect(html).not.toContain('family=Inter')
  })

  it('keeps theme registry metadata-only and delegates palette CSS to mcky-ui', async () => {
    const registry = await read('../src/lib/design/themes.ts')
    expect(registry).toContain("id: 'matcha'")
    expect(registry).toContain("id: 'coral'")
    expect(registry).toContain("id: 'blueberry'")
    expect(registry).toContain("id: 'butter'")
    expect(registry).not.toContain('staticCss')
    expect(registry).not.toContain("'--primary'")
  })

  it('does not retain V6 shell naming in active page layout', async () => {
    const [app, layout, pages] = await Promise.all([
      read('../src/App.svelte'),
      read('../src/styles/workspace-layout.css'),
      Promise.all(['Catalog.svelte', 'Editor.svelte', 'Maps.svelte', 'Record.svelte', 'Settings.svelte', 'Trash.svelte'].map((file) => read(`../src/pages/${file}`))),
    ])
    expect(app).toContain('app-workspace')
    expect(layout).toContain('.page-shell')
    expect(layout).not.toContain('v6-')
    for (const page of pages) expect(page).not.toContain('v6-')
  })
})


describe('shared V5 component adapters', () => {
  it('routes generic buttons and count stickers through mcky-ui', async () => {
    const button = await read('../src/components/ui/Button.svelte')
    const sticker = await read('../src/components/ui/CountSticker.svelte')
    expect(button).toContain("@mcky/ui/svelte")
    expect(button).toContain('variant={sharedVariant}')
    expect(button).toContain("outline: 'secondary'")
    expect(sticker).toContain("@mcky/ui/svelte")
    expect(sticker).toContain('value={n}')
  })
})
