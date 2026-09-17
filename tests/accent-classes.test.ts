import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Accent surfaces (active pills, primary buttons) must use --primary, not
 * --foreground — otherwise tweakcn presets / custom CSS that retint
 * --primary won't show up (the black "foreground" stays). See thread
 * "เพิ่ม custom theme แบบ user ใส่เอง" 2026-09-15.
 */
function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(tsx|ts)$/.test(e)) out.push(p)
  }
  return out
}

describe('V3 accent classes (static scan)', () => {
  it('no bg-foreground/text-background accents remain in src/v3', () => {
    const root = path.resolve(import.meta.dirname, '../src/v3')
    const offenders: string[] = []
    for (const f of walk(root)) {
      const src = readFileSync(f, 'utf8')
      src.split('\n').forEach((line, i) => {
        if (/bg-foreground|text-background(?!\/)|hover:bg-foreground/.test(line))
          offenders.push(`${path.relative(root, f)}:${i + 1}: ${line.trim().slice(0, 100)}`)
      })
    }
    expect(offenders, 'accent surfaces should use bg-primary text-primary-foreground').toEqual([])
  })
})
