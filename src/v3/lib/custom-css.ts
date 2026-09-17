/**
 * V3 custom theme: user pastes raw CSS from tweakcn.com (or any shadcn-style
 * `:root { --vars } .dark { --vars }` generator) and we scope-inject it so it
 * overrides src/v3/styles/v3.css.
 *
 * Why a transform instead of injecting raw CSS: v3.css declares tokens under
 * `html:has(.v3-shell):root` / `html:has(.v3-shell[data-mode='dark']):root`.
 * A bare `:root` / `.dark` block from tweakcn loses on specificity, and a
 * same-specificity rewrite would lose on order only if injected before v3.css
 * — but `@layer`-wrapped paste would ALSO lose to unlayered rules regardless
 * of order. So we rewrite selectors to the exact v3 form (unlayered) and
 * append the <style> at the end of <head>: equal specificity, later wins.
 *
 * The dark body is mirrored under
 * `@media (prefers-color-scheme: dark){ html:has(.v3-shell[data-mode='auto']) }`
 * so `auto` mode follows the system, matching v3.css's own behavior.
 */

const LIGHT_ROOT = `html:has(.v3-shell):root`
const DARK_ROOT = `html:has(.v3-shell[data-mode='dark']):root`
const AUTO_DARK_ROOT = `html:has(.v3-shell[data-mode='auto']):root`

export const CSS_KEY = 'ezzylist-v3-custom-css'
export const CSS_ON_KEY = 'ezzylist-v3-custom-css-on'
export const MAX_CSS_CHARS = 60_000
const STYLE_ID = 'v3-custom-css'

/* ------------------------------------------------------------------ */
/* Pure transform (unit-tested)                                        */
/* ------------------------------------------------------------------ */

/** Cheap sanity check: brace-balanced and actually contains a block. */
export function looksLikeCss(css: string): boolean {
  if (!css.includes('{')) return false
  let depth = 0
  let inSq = false
  let inDq = false
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (inSq) {
      if (c === '\\') i++
      else if (c === "'") inSq = false
      continue
    }
    if (inDq) {
      if (c === '\\') i++
      else if (c === '"') inDq = false
      continue
    }
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end < 0 ? css.length : end + 1
      continue
    }
    if (c === "'") inSq = true
    else if (c === '"') inDq = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth < 0) return false
    }
  }
  return depth === 0
}

type Chunk = { kind: 'rule'; prelude: string; body: string } | { kind: 'raw'; text: string }

function skipComment(css: string, i: number): number {
  const end = css.indexOf('*/', i + 2)
  return end < 0 ? css.length : end + 2
}

function skipString(css: string, i: number): number {
  const quote = css[i]
  let j = i + 1
  while (j < css.length) {
    if (css[j] === '\\') {
      j += 2
      continue
    }
    if (css[j] === quote) return j + 1
    j++
  }
  return css.length
}

/** Split top-level statements: rules become {prelude, body}, everything
 *  else (at-rules with blocks are also captured as rules) stays raw. */
function splitTop(css: string): Chunk[] {
  const chunks: Chunk[] = []
  const n = css.length
  let i = 0
  let bufStart = 0
  while (i < n) {
    const c = css[i]
    if (c === '/' && css[i + 1] === '*') {
      i = skipComment(css, i)
      continue
    }
    if (c === '"' || c === "'") {
      i = skipString(css, i)
      continue
    }
    if (c === ';') {
      chunks.push({ kind: 'raw', text: css.slice(bufStart, i + 1) })
      i++
      bufStart = i
      continue
    }
    if (c === '{') {
      const prelude = css.slice(bufStart, i)
      let depth = 1
      let j = i + 1
      while (j < n && depth > 0) {
        const d = css[j]
        if (d === '/' && css[j + 1] === '*') {
          j = skipComment(css, j)
          continue
        }
        if (d === '"' || d === "'") {
          j = skipString(css, j)
          continue
        }
        if (d === '{') depth++
        else if (d === '}') depth--
        j++
      }
      const body = css.slice(i + 1, Math.max(i + 1, j - 1))
      chunks.push({ kind: 'rule', prelude, body })
      i = j
      bufStart = j
      continue
    }
    i++
  }
  const tail = css.slice(bufStart)
  if (tail.trim()) chunks.push({ kind: 'raw', text: tail })
  return chunks
}

/** Any `.dark` class token in the selector = shadcn dark block (covers
 *  `.dark`, `.dark foo`, `html.dark`, `:root.dark`). */
const DARK_RE = /\.dark\b/
/** bare `html`, `:root`, `html:root`, or a selector that already carries our :has() scope */
const LIGHT_RE = /(^|[\s,])::?root\b|(^|[\s,:])html(:?[\s,{]|$)/

function mapPart(part: string): { text: string; dark: boolean; alreadyScoped: boolean } {
  const s = part.trim()
  if (s.includes(':has(.v3-shell')) return { text: s, dark: false, alreadyScoped: true }
  if (DARK_RE.test(s)) return { text: DARK_ROOT, dark: true, alreadyScoped: false }
  if (LIGHT_RE.test(s)) return { text: LIGHT_ROOT, dark: false, alreadyScoped: false }
  return { text: s, dark: false, alreadyScoped: false }
}

/** Rewrite tweakcn-style CSS so tokens win over v3.css (see header comment). */
export function transformCustomCss(css: string): string {
  const chunks = splitTop(css)
  const out: string[] = []
  for (const chunk of chunks) {
    if (chunk.kind === 'raw') {
      if (chunk.text.trim()) out.push(chunk.text.trim())
      continue
    }
    const prelude = chunk.prelude.trim()
    const body = chunk.body
    // @layer-wrapped paste (shadcn globals style) would lose to v3.css's
    // unlayered rules regardless of order — unlayered beats layered in the
    // cascade. Unwrap and process the inside as plain rules.
    if (prelude.startsWith('@layer')) {
      out.push(transformCustomCss(body))
      continue
    }
    if (prelude.startsWith('@')) {
      out.push(`${prelude}{${body}}`)
      continue
    }
    const parts = prelude.split(',')
    const mapped = parts.map(mapPart)
    const hadDark = mapped.some((m) => m.dark)
    const selector = mapped.map((m) => m.text).join(', ')
    if (hadDark) {
      // :root,.dark in one block: keep light parts, emit dark separately.
      const lightOnly = mapped.filter((m) => !m.dark).map((m) => m.text)
      const blocks: string[] = []
      if (lightOnly.length) blocks.push(`${lightOnly.join(', ')}{${body}}`)
      blocks.push(`${DARK_ROOT}{${body}}`)
      blocks.push(`@media (prefers-color-scheme: dark){${AUTO_DARK_ROOT}{${body}}}`)
      out.push(blocks.join('\n'))
    } else {
      out.push(`${selector}{${body}}`)
    }
  }
  return out.join('\n')
}

/* ------------------------------------------------------------------ */
/* Storage + DOM injection                                             */
/* ------------------------------------------------------------------ */

export function getCustomCss(): string {
  try {
    return localStorage.getItem(CSS_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setCustomCss(css: string): void {
  try {
    localStorage.setItem(CSS_KEY, css)
  } catch {}
}

export function clearCustomCss(): void {
  try {
    localStorage.removeItem(CSS_KEY)
    localStorage.removeItem(CSS_ON_KEY)
  } catch {}
}

export function isCustomCssOn(): boolean {
  try {
    return localStorage.getItem(CSS_ON_KEY) === '1'
  } catch {
    return false
  }
}

export function setCustomCssOn(on: boolean): void {
  try {
    localStorage.setItem(CSS_ON_KEY, on ? '1' : '0')
  } catch {}
}

/** (Re)apply the stored custom CSS to <head>. Safe to call repeatedly. */
export function applyCustomCss(): void {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  const css = isCustomCssOn() ? getCustomCss() : ''
  if (!css) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  } else {
    // Re-append so we stay LAST in <head> even if other styles got injected
    // (dev HMR, theme boot script link) after us.
    document.head.appendChild(el)
  }
  el.textContent = transformCustomCss(css)
}
