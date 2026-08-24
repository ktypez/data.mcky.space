import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import V2App from './V2App'

/**
 * Regression: the v2 <Routes> used to declare RELATIVE paths ("/", "/add")
 * while being mounted outside any parent <Route> — so they were matched
 * against the FULL pathname ("/v2"), never matched, and fell through to the
 * wildcard <Navigate to="/v2"> loop. Production showed an empty page at /v2.
 *
 * Rendered via react-dom/server (node env, no jsdom): SSR runs no effects,
 * so no store fetch / Clerk / network is involved — this purely asserts
 * that route matching resolves to the right page shell.
 */
function renderAt(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <V2App />
    </MemoryRouter>,
  )
}

describe('V2App routing — full-pathname matching', () => {
  it('renders the catalog at /v2', () => {
    expect(renderAt('/v2')).toContain('client index')
  })

  it('renders trailing-slash /v2/ as the catalog too', () => {
    expect(renderAt('/v2/')).toContain('client index')
  })

  it('renders the editor shell at /v2/add', () => {
    expect(renderAt('/v2/add')).toContain('new record')
    expect(renderAt('/v2/add')).not.toContain('client index')
  })

  it('renders the editor shell at /v2/edit/:id (empty store → new-record shell)', () => {
    const html = renderAt('/v2/edit/some-id')
    // With no clients loaded, editClient resolves null → editor shows its
    // "new" shell. Either way it must NOT fall through to the catalog.
    expect(html).not.toContain('client index')
    expect(html).toContain('back')
  })

  it('renders the loading state for a record at /v2/c/:id', () => {
    expect(renderAt('/v2/c/some-id')).toContain('loading record')
  })

  it('sidebar highlights Add entry — not Clients — at /v2/add', () => {
    const html = renderAt('/v2/add')
    // Icon SVG paths are long; look back far enough to cross them.
    const before = (marker: string): [number, string] => {
      const idx = html.indexOf(marker)
      expect(idx).toBeGreaterThan(-1)
      return [idx, html.slice(Math.max(0, idx - 1500), idx)]
    }
    const [, addBefore] = before('Add entry')
    expect(addBefore).toContain('data-active="true"')
    const [, clientsBefore] = before('>Clients<')
    expect(clientsBefore).toContain('data-active="false"')
  })
})
