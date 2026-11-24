import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('V6 shared design-system integration', () => {
  it('loads the font-free V6 entry after the shared V5 primitives', async () => {
    const [index, adapter, base, core] = await Promise.all([
      read('../src/index.css'),
      read('../src/styles/v6-tokens.css'),
      read('../node_modules/@mcky/ui/src/styles/v6-base.css'),
      read('../node_modules/@mcky/ui/src/styles/core.css'),
    ])

    expect(index).toContain("@import '@mcky/ui/core.css'")
    expect(index).toContain("@import '@mcky/ui/v6-base.css'")
    expect(index.indexOf("@import '@mcky/ui/core.css'")).toBeLessThan(
      index.indexOf("@import '@mcky/ui/v6-base.css'"),
    )
    expect(index).toContain("@import './styles/v6-tokens.css'")
    expect(base).toContain("@import './v6-theme.css'")
    expect(base).toContain('mcky-v6-scenery-content')
    expect(core).toContain('@import "./tokens.css"')

    expect(adapter).toContain('--paper: var(--mcky-v6-cream)')
    expect(adapter).toContain('--card: var(--mcky-v6-paper)')
    expect(adapter).toContain('--ink: var(--mcky-v6-ink)')
    expect(adapter).toContain('--hard: var(--mcky-v6-ink)')
    expect(adapter).toContain('--acc: var(--mcky-v6-blue)')
    expect(adapter).toContain('--danger: var(--mcky-v6-red)')
    // No palette hex may be re-declared locally: the ramp comes from the library.
    expect(adapter).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('mounts the shared scenery once and keeps routed content above it', async () => {
    const [app, layout] = await Promise.all([
      read('../src/App.svelte'),
      read('../src/styles/workspace-layout.css'),
    ])
    expect(app).toContain("from '@mcky/ui/scenery'")
    expect(app.match(/<Scenery \/>/g)).toHaveLength(1)
    expect(app).toContain('class="ledger-shell mcky-v6-scenery-content"')
    expect(app).toContain('id="ledger-main"')
    expect(app).toContain('<main id="ledger-main" class="app-workspace min-h-0 flex-1 overflow-y-auto">')
    expect(layout).toContain('.mcky-v6-scenery-content .page-shell')
    expect(layout).toContain('.page-shell')
  })

  it('mirrors the app mode into the canonical twilight ramp before paint', async () => {
    const [html, theme, appTheme] = await Promise.all([
      read('../index.html'),
      read('../node_modules/@mcky/ui/src/styles/v6-theme.css'),
      read('../src/lib/app-theme.ts'),
    ])

    expect(html).toContain("root.setAttribute('data-mode', dark ? 'dark' : 'light')")
    expect(html).toContain("root.setAttribute('data-v6-mode', dark ? 'dark' : 'light')")
    expect(html).toContain("root.setAttribute('data-palette', palette)")
    expect(html).toContain("root.setAttribute('data-theme', palette)")
    expect(html).toContain("['matcha', 'coral', 'blueberry', 'butter']")
    expect(html).toContain("root.setAttribute('data-texture', texture)")
    expect(html).not.toContain('monochrome')
    expect(html).not.toContain('fonts.googleapis.com')

    expect(theme).toContain(":root[data-v6-mode='dark']")
    expect(theme).toContain('--mcky-v6-sky: #1b2440')
    expect(theme).toContain('--mcky-v6-cream: #263354')
    expect(theme).toContain('--mcky-v6-paper: #314066')
    expect(theme).toContain('--mcky-v6-ink: #f4f1e8')
    expect(theme).toContain('--mcky-v6-yellow: #ffd84d')

    expect(appTheme).toContain("from '@mcky/ui/theme'")
    expect(appTheme).toContain('root.dataset.v6Mode = state.resolvedMode')
    expect(appTheme).toContain('applyV6Mode(state.mode)')
    expect(appTheme).toContain('onV6ModeChange(handleV6ModeChange)')
    expect(appTheme).toContain('localStorage.removeItem(V6_MODE_STORAGE_KEY)')
  })

  it('reuses the shared mode toggle in the existing top bar', async () => {
    const topBar = await read('../src/components/TopBar.svelte')
    expect(topBar).toContain("from '@mcky/ui/mode-toggle'")
    expect(topBar).toContain('<ModeToggle />')
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

  it('keeps the existing workspace layout contracts while V6 paints above them', async () => {
    const [app, layout, pages] = await Promise.all([
      read('../src/App.svelte'),
      read('../src/styles/workspace-layout.css'),
      Promise.all(
        ['Catalog.svelte', 'Editor.svelte', 'Maps.svelte', 'Record.svelte', 'Settings.svelte', 'Trash.svelte']
          .map((file) => read(`../src/pages/${file}`)),
      ),
    ])
    expect(app).toContain('app-workspace')
    expect(layout).toContain('.page-shell')
    for (const page of pages) expect(page).toContain('page-shell')
  })
})

describe('shared V5 component adapters', () => {
  it('routes generic buttons and count stickers through mcky-ui', async () => {
    const button = await read('../src/components/ui/Button.svelte')
    const sticker = await read('../src/components/ui/CountSticker.svelte')
    expect(button).toContain('@mcky/ui/button')
    expect(button).toContain('variant={sharedVariant}')
    expect(button).toContain("outline: 'secondary'")
    expect(sticker).toContain('@mcky/ui/count-sticker')
    expect(sticker).toContain('value={n}')
  })
})
