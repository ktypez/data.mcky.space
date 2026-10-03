import { describe, it, expect } from 'vitest'
import { scanJsxNesting } from '../scripts/lint-jsx-nesting.mjs'

/**
 * Regression net (vitest wrapper) around scripts/lint-jsx-nesting.mjs — the
 * same scan also runs standalone via `npm run lint:jsx-nesting` and in CI.
 *
 * Invalid HTML like a button nested in a button, a Button component inside
 * an anchor/Link, or form controls inside a button triggers React's
 * validateDOMNesting console warnings and breaks semantics. The PopoverMenu
 * wrapper was a button-in-button offender (fixed to a span) and RouteModal
 * had a Button inside an <a> (fixed to style the anchor with buttonVariants).
 *
 * Parsed with the TypeScript compiler API so comments, string literals and
 * arrow functions inside attributes can't produce false positives, and it
 * runs in the existing node env with no jsdom.
 */
describe('JSX interactive nesting (static scan)', () => {
  it('no interactive element is nested inside another interactive element', () => {
    const hits = scanJsxNesting()
    const lines = hits.map((h) => `${h.file}:${h.line} <${h.parent}> contains <${h.child}>`)
    expect(lines).toEqual([])
  })
})
