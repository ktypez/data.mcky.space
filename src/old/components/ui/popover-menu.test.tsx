import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PopoverMenu } from './popover-menu'

/**
 * Regression: PopoverMenu used to wrap its `trigger` (already a <button>)
 * in another <button>, which is invalid HTML and triggered React's
 * "cannot be a descendant of <button>" / "nested button" console warning.
 *
 * Rendered via react-dom/server so it runs in the existing node test env
 * (no jsdom needed). The trigger here is a real <button>, exactly like
 * NavDropdown / ThemePresetPicker / ThemeModePicker pass in.
 */
describe('PopoverMenu — no nested button', () => {
  function render() {
    return renderToStaticMarkup(
      <PopoverMenu open={false} onOpenChange={() => {}} trigger={<button type="button">Open</button>}>
        <div>menu items</div>
      </PopoverMenu>,
    )
  }

  it('renders the trigger as the only <button> (no wrapping <button>)', () => {
    const html = render()
    // The trigger button is the only <button> — a regression would wrap it
    // in an extra one, producing two (and nested) buttons.
    expect((html.match(/<button/g) ?? []).length).toBe(1)
    // Defensive: no <button> may ever appear as a child of another <button>.
    expect(/<button[^>]*>\s*<button/i.test(html)).toBe(false)
    // The trigger itself is still present and intact.
    expect(html).toContain('>Open</button>')
  })

  it('wraps the trigger in a non-interactive element, not another <button>', () => {
    // The regression was the wrapper being a <button> around the trigger
    // <button> (invalid HTML → React "cannot be a descendant of <button>"
    // warning). Pin the wrapper to a non-button element. Note: react-dom/server
    // does NOT run validateDOMNesting, so we assert structure instead of the
    // console warning (which only fires on the client renderer).
    const html = render()
    expect(html).toMatch(/^<span /)
    expect(html).not.toMatch(/^<button/)
  })
})
