import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, seedClients } from '../helpers/db'
import { clients } from '../../functions/lib/schema'
import { and, like, or } from 'drizzle-orm'

// Mirror the query in functions/api/clients/search.ts
async function searchClients(db: ReturnType<typeof createTestDb>['db'], q: string) {
  if (!q || !q.trim()) return []
  const keywords = q.trim().split(/\s+/).filter(Boolean)
  const conditions = keywords.map((kw) => {
    const pattern = `%${kw}%`
    return or(like(clients.name, pattern), like(clients.shopName, pattern))
  })
  return db.select().from(clients).where(and(...conditions)).limit(10).all()
}

describe('clients search', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
    seedClients(ctx.db, [
      { id: '1', name: 'Somchai', shopName: 'Khao Man Gai' },
      { id: '2', name: 'Alice', shopName: 'Coffee Shop' },
      { id: '3', name: 'Bob', shopName: 'Somchai Noodle' },
      { id: '4', name: 'Carol', shopName: 'Bakery' },
    ])
  })

  it('returns [] for empty query', async () => {
    expect(await searchClients(ctx.db, '')).toEqual([])
  })

  it('returns [] for whitespace-only query', async () => {
    expect(await searchClients(ctx.db, '   ')).toEqual([])
  })

  it('matches on name (case-insensitive via SQLite LIKE)', async () => {
    // SQLite LIKE is case-insensitive for ASCII by default
    const rows = await searchClients(ctx.db, 'somchai')
    expect(rows.map((r) => r.id).sort()).toEqual(['1', '3'])
  })

  it('matches on shopName', async () => {
    const rows = await searchClients(ctx.db, 'coffee')
    expect(rows.map((r) => r.id)).toEqual(['2'])
  })

  it('AND-combines multiple keywords (all must match)', async () => {
    // "somchai noodle" → name contains "somchai" AND shopName contains "noodle"
    const rows = await searchClients(ctx.db, 'somchai noodle')
    expect(rows.map((r) => r.id)).toEqual(['3'])
  })

  it('AND returns nothing when no single row matches all keywords', async () => {
    const rows = await searchClients(ctx.db, 'alice noodle')
    expect(rows).toEqual([])
  })

  it('limits results to 10', async () => {
    // Add 15 more "Coffee" entries — expect 10 max
    const more = Array.from({ length: 15 }, (_, i) => ({
      id: `c${i}`,
      name: `Coffee ${i}`,
      shopName: 'Beans',
    }))
    seedClients(ctx.db, more)
    const rows = await searchClients(ctx.db, 'coffee')
    expect(rows).toHaveLength(10)
  })

  it('uses %pattern% (partial match, not exact)', async () => {
    const rows = await searchClients(ctx.db, 'man')
    // matches "Khao Man Gai"
    expect(rows.map((r) => r.id)).toEqual(['1'])
  })
})
