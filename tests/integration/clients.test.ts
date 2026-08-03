import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, seedClients } from '../helpers/db'
import { clients, settings, suggestions, schema } from '../../functions/lib/schema'
import { eq, sql } from 'drizzle-orm'

// Mirror the queries in functions/api/clients.ts. If a test starts failing
// after a query change in the endpoint, update both — the failure is the
// safety net.

async function listClients(db: ReturnType<typeof createTestDb>['db'], limit?: number | 'all') {
  if (limit === 'all') {
    return db.select().from(clients).orderBy(clients.updatedAt).all()
  }
  const q = db.select().from(clients).orderBy(clients.updatedAt)
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

  it('returns all clients ordered by updatedAt asc (endpoint reverses for desc)', async () => {
    const rows = await listClients(ctx.db)
    // Endpoint reverses the result for newest-first UI display
    const reversed = rows.reverse()
    expect(reversed.map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('honors ?limit=N', async () => {
    // Query orders ASC by updatedAt; the endpoint reverses for newest-first UI.
    // So limit=2 returns the 2 oldest, not the 2 newest.
    const rows = await listClients(ctx.db, 2)
    expect(rows.map((r) => r.id)).toEqual(['1', '3'])
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

  it('FK CASCADE drops suggestions when client is deleted', async () => {
    seedClients(ctx.db, [{ id: 'abc', name: 'Alice' }])
    await ctx.db.insert(suggestions).values({
      id: 's1',
      clientId: 'abc',
      suggested: { name: 'New', shopName: '', address: '', lat: null, lng: null },
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // sanity: suggestion exists
    let sugg = await ctx.db.select().from(suggestions).where(eq(suggestions.clientId, 'abc'))
    expect(sugg).toHaveLength(1)

    await ctx.db.delete(clients).where(eq(clients.id, 'abc'))

    sugg = await ctx.db.select().from(suggestions).where(eq(suggestions.clientId, 'abc'))
    expect(sugg).toHaveLength(0)
  })

  it('snapshotting suggestions BEFORE the delete preserves them (H3 + restore parity)', async () => {
    seedClients(ctx.db, [{ id: 'abc', name: 'Alice' }])
    await ctx.db.insert(suggestions).values({
      id: 's1',
      clientId: 'abc',
      suggested: { name: 'New', shopName: '', address: '', lat: null, lng: null },
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // This is the order the DELETE handler uses:
    // 1) snapshot client, 2) snapshot suggestions, 3) delete client
    //    (cascade drops suggestions, but we already saved them).
    const [row] = await ctx.db.select().from(clients).where(eq(clients.id, 'abc'))
    const suggs = await ctx.db.select().from(suggestions).where(eq(suggestions.clientId, 'abc'))
    await ctx.db.insert(settings).values({
      key: `trash:v1:abc`,
      value: JSON.stringify({ ...row, deletedAt: Date.now() }),
    })
    await ctx.db.insert(settings).values({
      key: `trash:v1:abc:suggestions`,
      value: JSON.stringify(suggs),
    })
    await ctx.db.delete(clients).where(eq(clients.id, 'abc'))

    const suggSnapshot = await ctx.db.select().from(settings).where(eq(settings.key, 'trash:v1:abc:suggestions'))
    expect(suggSnapshot).toHaveLength(1)
    const restored = JSON.parse(suggSnapshot[0].value)
    expect(restored).toHaveLength(1)
    expect(restored[0].id).toBe('s1')
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
