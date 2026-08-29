import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import V2MobileNav from './V2MobileNav'

/**
 * V2MobileNav render assertions (node env, SSR — no interaction tests).
 * Covers the admin trash item (v2 mobile previously had no path to
 * /v2/trash for admins) and the 3→4 column reflow.
 *
 * The auth store is mocked: under SSR, zustand renders from
 * getServerSnapshot (the INITIAL state), so runtime setAdmin(true)
 * would be invisible to renderToStaticMarkup. The mock's flag flips
 * per test instead.
 */
const { admin } = vi.hoisted(() => ({ admin: { value: false } }))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ isAdmin: admin.value }),
}))

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/v2']}>
      <V2MobileNav />
    </MemoryRouter>,
  )
}

describe('V2MobileNav', () => {
  beforeEach(() => {
    admin.value = false
  })

  it('guest sees three items and no Trash', () => {
    const html = render()
    expect(html).toContain('>Registry<')
    expect(html).toContain('>Add<')
    expect(html).toContain('>Classic<')
    expect(html).not.toContain('>Trash<')
    expect(html).toContain('grid-cols-3')
    expect(html).not.toContain('grid-cols-4')
  })

  it('admin sees a fourth Trash item', () => {
    admin.value = true
    const html = render()
    expect(html).toContain('>Trash<')
    expect(html).toContain('grid-cols-4')
  })

  it('marks Registry active on /v2', () => {
    const html = render()
    expect(html).toContain('aria-current="page"')
    // Icon SVG paths are long; look back far enough to cross them.
    const idx = html.indexOf('>Registry<')
    const before = html.slice(Math.max(0, idx - 1500), idx)
    expect(before).toContain('data-active="true"')
  })
})
