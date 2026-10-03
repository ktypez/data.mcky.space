import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const appSource = readFileSync(path.resolve(import.meta.dirname, '../src/App.tsx'), 'utf8')

describe('application Clerk wiring', () => {
  it('keeps AuthSync mounted in the main application shell', () => {
    expect(appSource).toContain("import { AuthSync } from '@/components/AuthSync'")
    expect(appSource).toMatch(/<AuthSync\s*\/>/)
  })

  it('opens the login page for /login and the settings login action', () => {
    expect(appSource).toContain("location.pathname === '/login' || loginOpen")
    expect(appSource).toContain('<LoginPage />')
  })
})
