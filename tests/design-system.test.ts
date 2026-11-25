import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('app-owned Mochi Ledger design system', () => {
  it('loads local semantic tokens without importing the shared UI package', async () => {
    const [index, tokens, packageJson, lockfile] = await Promise.all([
      read('../src/index.css'),
      read('../src/styles/design-tokens.css'),
      read('../package.json'),
      read('../package-lock.json'),
    ])

    expect(index).toContain("@import './styles/design-tokens.css'")
    expect(index).not.toContain('@mcky/ui')
    expect(tokens).toContain('--paper: #fffdf8')
    expect(tokens).toContain("--font-ui: 'Itim', 'Prompt'")
    expect(tokens).toContain('--mochi-ease-spring')
    expect(tokens).toContain("data-palette='matcha'")
    expect(tokens).toContain("data-palette='mochi'")
    expect(tokens).toContain("data-palette='soda'")
    expect(tokens).toContain("data-palette='sakura'")
    expect(tokens).toContain(":root[data-mode='dark']")
    expect(packageJson).not.toContain('@mcky/ui')
    expect(lockfile).not.toContain('@mcky/ui')
  })

  it('keeps routed pages in the app shell with app-owned theme controls', async () => {
    const [app, layout, topBar] = await Promise.all([
      read('../src/App.svelte'),
      read('../src/styles/app-layout.css'),
      read('../src/components/TopBar.svelte'),
    ])

    expect(app).not.toContain('@mcky/ui')
    expect(app).not.toContain('<Scenery />')
    expect(app).toContain('class="ledger-shell"')
    expect(app).toContain('id="ledger-main"')
    expect(layout).toContain('.page-shell')
    expect(layout).toContain('--mochi-radius-md')
    expect(topBar).not.toContain('@mcky/ui')
    expect(topBar).toContain('setMode(')
  })

  it('provides local Svelte primitives for buttons and count stickers', async () => {
    const [button, sticker] = await Promise.all([
      read('../src/components/ui/Button.svelte'),
      read('../src/components/ui/CountSticker.svelte'),
    ])
    expect(button).not.toContain('@mcky/ui')
    expect(button).toContain('<button')
    expect(button).toContain('ui-button')
    expect(sticker).not.toContain('@mcky/ui')
    expect(sticker).toContain('{n}')
    expect(sticker).toContain('{label}')
  })

  it('applies the saved palette and mode before first paint', async () => {
    const [html, appTheme] = await Promise.all([
      read('../index.html'),
      read('../src/lib/app-theme.ts'),
    ])
    expect(html).toContain("root.setAttribute('data-mode', dark ? 'dark' : 'light')")
    expect(html).toContain("root.setAttribute('data-palette', palette)")
    expect(html).toContain("root.setAttribute('data-theme', dark ? 'dark' : 'light')")
    expect(html).toContain("root.setAttribute('data-texture', texture)")
    expect(html).toContain('fonts.googleapis.com')
    expect(html).not.toContain('data-v6-mode')
    expect(appTheme).not.toContain('@mcky/ui')
    expect(appTheme).toContain('root.dataset.palette = state.palette')
  })

  it('keeps every existing routed page inside the shared layout contract', async () => {
    const [app, layout, pages] = await Promise.all([
      read('../src/App.svelte'),
      read('../src/styles/app-layout.css'),
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
