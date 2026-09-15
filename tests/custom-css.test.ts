// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  looksLikeCss,
  transformCustomCss,
  getCustomCss,
  setCustomCss,
  clearCustomCss,
  isCustomCssOn,
  setCustomCssOn,
  applyCustomCss,
  CSS_KEY,
  CSS_ON_KEY,
} from '../src/v3/lib/custom-css'
import { CSS_PRESETS } from '../src/v3/lib/css-presets'

/** Normalize whitespace inside braces for tolerant comparisons. */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

/* ------------------------------------------------------------------ */
/* looksLikeCss                                                        */
/* ------------------------------------------------------------------ */
describe('looksLikeCss', () => {
  it('returns false for empty / non-CSS strings', () => {
    expect(looksLikeCss('')).toBe(false)
    expect(looksLikeCss('hello world')).toBe(false)
  })

  it('accepts simple valid CSS', () => {
    expect(looksLikeCss(':root { --bg: red; }')).toBe(true)
  })

  it('rejects unbalanced braces', () => {
    expect(looksLikeCss(':root { --bg: red;')).toBe(false)
    expect(looksLikeCss(':root } --bg: red; {')).toBe(false)
  })

  it('handles strings containing braces', () => {
    expect(looksLikeCss(":root { content: '{'; }")).toBe(true)
    expect(looksLikeCss(':root { content: "{"; }')).toBe(true)
  })

  it('handles comments containing braces', () => {
    expect(looksLikeCss('/* { */ :root { --a: 1; }')).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/* transformCustomCss                                                  */
/* ------------------------------------------------------------------ */
describe('transformCustomCss', () => {
  it('rewrites :root → v3 light scope', () => {
    const out = transformCustomCss(':root { --background: white; }')
    expect(norm(out)).toContain("html:has(.v3-shell):root{ --background: white; }")
  })

  it('rewrites .dark → v3 dark scope + auto-dark @media', () => {
    const out = transformCustomCss('.dark { --background: black; }')
    expect(norm(out)).toContain("html:has(.v3-shell[data-mode='dark']):root{ --background: black; }")
    expect(norm(out)).toContain('@media (prefers-color-scheme: dark)')
    expect(norm(out)).toContain("html:has(.v3-shell[data-mode='auto']):root")
  })

  it('handles `:root,.dark` in one comma-separated selector', () => {
    const out = transformCustomCss(':root,.dark { --radius: 0.5rem; }')
    expect(norm(out)).toContain("html:has(.v3-shell):root{ --radius: 0.5rem; }")
    expect(norm(out)).toContain("html:has(.v3-shell[data-mode='dark']):root{ --radius: 0.5rem; }")
    expect(norm(out)).toContain('@media (prefers-color-scheme: dark)')
  })

  it('unwraps @layer', () => {
    const out = transformCustomCss('@layer base { :root { --x: 1; } }')
    expect(norm(out)).toContain("html:has(.v3-shell):root{ --x: 1; }")
    expect(norm(out)).not.toContain('@layer')
  })

  it('leaves non-root selectors alone', () => {
    const out = transformCustomCss('.my-class { color: red; }')
    // Prelude is trimmed on re-emit, so the space before `{` goes away.
    expect(norm(out)).toBe('.my-class{ color: red; }')
  })

  it('leaves already-scoped selectors alone', () => {
    const src = "html:has(.v3-shell):root { --bg: white; }"
    const out = transformCustomCss(src)
    expect(norm(out)).toBe('html:has(.v3-shell):root{ --bg: white; }')
  })

  it('handles a real tweakcn export', () => {
    const tweakcn = `@layer base {
  :root {
    --background: oklch(0.99 0.002 240);
    --foreground: oklch(0.17 0.02 260);
    --primary: oklch(0.43 0.12 265);
    --primary-foreground: oklch(0.98 0.002 240);
    --radius: 0.625rem;
  }
  .dark {
    --background: oklch(0.17 0.02 260);
    --foreground: oklch(0.95 0.004 240);
    --primary: oklch(0.55 0.14 265);
    --primary-foreground: oklch(0.17 0.02 260);
  }
}`
    const out = transformCustomCss(tweakcn)
    const normOut = norm(out)
    expect(normOut).toContain('html:has(.v3-shell):root')
    expect(normOut).toContain("html:has(.v3-shell[data-mode='dark']):root")
    expect(normOut).toContain('@media (prefers-color-scheme: dark)')
    expect(normOut).not.toContain('@layer')
    expect(normOut).toContain('--primary: oklch(0.43 0.12 265)')
    expect(normOut).toContain('--background: oklch(0.17 0.02 260)')
  })
})

/* ------------------------------------------------------------------ */
/* Storage helpers (jsdom localStorage stub)                           */
/* ------------------------------------------------------------------ */
describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('get/set/clear custom css', () => {
    expect(getCustomCss()).toBe('')
    setCustomCss(':root { --bg: red; }')
    expect(getCustomCss()).toBe(':root { --bg: red; }')
    clearCustomCss()
    expect(getCustomCss()).toBe('')
    expect(isCustomCssOn()).toBe(false)
  })

  it('isCustomCssOn/setCustomCssOn', () => {
    expect(isCustomCssOn()).toBe(false)
    setCustomCssOn(true)
    expect(isCustomCssOn()).toBe(true)
    expect(localStorage.getItem(CSS_ON_KEY)).toBe('1')
    setCustomCssOn(false)
    expect(isCustomCssOn()).toBe(false)
    expect(localStorage.getItem(CSS_ON_KEY)).toBe('0')
  })
})

/* ------------------------------------------------------------------ */
/* applyCustomCss                                                      */
/* ------------------------------------------------------------------ */
describe('applyCustomCss', () => {
  beforeEach(() => {
    localStorage.clear()
    document.getElementById('v3-custom-css')?.remove()
  })

  it('does nothing when css is off / empty', () => {
    setCustomCss(':root{--bg:red}')
    setCustomCssOn(false)
    applyCustomCss()
    expect(document.getElementById('v3-custom-css')).toBeNull()
  })

  it('injects <style> when on with valid css', () => {
    setCustomCss(':root{--bg:red}')
    setCustomCssOn(true)
    applyCustomCss()
    const el = document.getElementById('v3-custom-css') as HTMLStyleElement
    expect(el).not.toBeNull()
    expect(norm(el.textContent!)).toContain('html:has(.v3-shell):root')
  })

  it('removes style element when css is cleared', () => {
    setCustomCss(':root{--bg:red}')
    setCustomCssOn(true)
    applyCustomCss()
    expect(document.getElementById('v3-custom-css')).not.toBeNull()
    clearCustomCss()
    applyCustomCss()
    expect(document.getElementById('v3-custom-css')).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/* Baked-in tweakcn presets (generated file)                           */
/* ------------------------------------------------------------------ */
describe('CSS_PRESETS', () => {
  it('has presets with unique ids and labels', () => {
    expect(CSS_PRESETS.length).toBeGreaterThan(10)
    const ids = new Set(CSS_PRESETS.map((p) => p.id))
    expect(ids.size).toBe(CSS_PRESETS.length)
    for (const p of CSS_PRESETS) expect(p.label.length).toBeGreaterThan(0)
  })

  it('every preset parses as CSS and survives the v3 scope transform', () => {
    for (const p of CSS_PRESETS) {
      expect(looksLikeCss(p.css), p.id).toBe(true)
      const out = norm(transformCustomCss(p.css))
      expect(out, p.id).toContain('html:has(.v3-shell):root')
      expect(out, p.id).toContain("html:has(.v3-shell[data-mode='dark']):root")
      expect(out, p.id).toContain('@media (prefers-color-scheme: dark)')
      expect(out, p.id).toContain('--background')
      expect(out, p.id).toContain('--primary')
      expect(out, p.id).not.toContain('--font-sans') // fonts stay ours
    }
  })

  it('preset css round-trips through storage + inject', () => {
    const p = CSS_PRESETS[0]
    localStorage.clear()
    document.getElementById('v3-custom-css')?.remove()
    setCustomCss(p.css)
    setCustomCssOn(true)
    applyCustomCss()
    const el = document.getElementById('v3-custom-css') as HTMLStyleElement
    expect(el.textContent).toContain('html:has(.v3-shell):root')
  })
})
