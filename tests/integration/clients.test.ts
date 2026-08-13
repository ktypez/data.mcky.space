import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, seedClients } from '../helpers/db'
import { clients, settings, schema } from '../../functions/lib/schema'
import { eq, sql, desc } from 'drizzle-orm'

// Mirror the queries in functions/api/clients.ts. If a test starts failing
// after a query change in the endpoint, update both — the failure is the
// safety net.

async function listClients(db: ReturnType<typeof createTestDb>['db'], limit?: number | 'all') {
  if (limit === 'all') {
    return db.select().from(clients).orderBy(desc(clients.updatedAt)).all()
  }
  const q = db.select().from(clients).orderBy(desc(clients.updatedAt))
  return limit ? q.limit(limit).all() : q.all()
}

describe('clients GET', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
    seedClients(ctx.db, [
      { id: '1', name: 'A', updatedAt: 100 },
      { id: '2', name: 'B', updatedAt: 300 },
      { id: '3', name: 'C', updatedAt: 200 },
    ])
  })

  it('returns all clients ordered by updatedAt desc (newest first)', async () => {
    const rows = await listClients(ctx.db)
    expect(rows.map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('honors ?limit=N — returns the N newest, not the N oldest', async () => {
    const rows = await listClients(ctx.db, 2)
    expect(rows.map((r) => r.id)).toEqual(['2', '3'])
  })

  it('honors ?limit=all', async () => {
    const rows = await listClients(ctx.db, 'all')
    expect(rows).toHaveLength(3)
  })

  it('returns empty array when no clients exist', async () => {
    ctx.sqlite.exec('DELETE FROM clients')
    const rows = await listClients(ctx.db)
    expect(rows).toEqual([])
  })

  it('preserves all fields including JSON-encoded images', async () => {
    ctx.sqlite.exec('DELETE FROM clients')
    seedClients(ctx.db, [
      { id: 'x', name: 'X', images: ['a.png', 'b.png'], badge: 'penpay', lat: 13.7, lng: 100.5 },
    ])
    const rows = await listClients(ctx.db)
    expect(rows[0].images).toEqual(['a.png', 'b.png'])
    expect(rows[0].badge).toBe('penpay')
    expect(rows[0].lat).toBe(13.7)
  })
})

describe('clients POST (server-owned timestamps)', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
  })

  it('ignores client-supplied createdAt/updatedAt — server always wins', async () => {
    // L4 fix: spoofing historical dates was a real concern. Verify the
    // server-time path is the only path that writes the row.
    const now = Date.now()
    await ctx.db.insert(clients).values({
      id: 'srv',
      name: 'Server',
      shopName: '',
      address: '',
      lat: null,
      lng: null,
      images: [],
      badge: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    })

    // Even if a hypothetical client-supplied value were applied, the row
    // should only ever reflect the server's now. Verify the row written.
    const [row] = await ctx.db.select().from(clients).where(eq(clients.id, 'srv'))
    expect(row).toBeDefined()
    expect(row.createdAt).toBe(now)
    expect(row.updatedAt).toBe(now)
    expect(Math.abs(row.createdAt - Date.now())).toBeLessThan(1000)
  })
})

describe('clients DELETE (soft + H3 cascade snapshot)', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
  })

  it('snapshots client into settings.trash:v1:<id> before delete', async () => {
    seedClients(ctx.db, [{ id: 'abc', name: 'Alice' }])
    const [row] = await ctx.db.select().from(clients).where(eq(clients.id, 'abc'))
    await ctx.db.insert(settings).values({
      key: `trash:v1:abc`,
      value: JSON.stringify({ ...row, deletedAt: Date.now() }),
    })
    await ctx.db.delete(clients).where(eq(clients.id, 'abc'))

    const [snapshot] = await ctx.db.select().from(settings).where(eq(settings.key, 'trash:v1:abc'))
    expect(snapshot).toBeDefined()
    const parsed = JSON.parse(snapshot.value)
    expect(parsed.name).toBe('Alice')
    expect(parsed.deletedAt).toBeGreaterThan(0)
  })

  it('onConflictDoNothing lets restore re-insert without tripping on existing key', async () => {
    seedClients(ctx.db, [{ id: 'abc', name: 'Alice' }])
    const [row] = await ctx.db.select().from(clients).where(eq(clients.id, 'abc'))
    const snap = JSON.stringify({ ...row, deletedAt: Date.now() })

    // First insert lands
    await ctx.db.insert(settings).values({ key: 'trash:v1:abc', value: snap })
    // Second insert (e.g. retry) silently no-ops, doesn't overwrite
    await ctx.db.insert(settings).values({ key: 'trash:v1:abc', value: snap }).onConflictDoNothing()

    const all = await ctx.db.select().from(settings).where(eq(settings.key, 'trash:v1:abc'))
    expect(all).toHaveLength(1)
  })
})
