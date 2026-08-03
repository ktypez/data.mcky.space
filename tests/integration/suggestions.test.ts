import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, seedClients } from '../helpers/db'
import { clients, settings, suggestions } from '../../functions/lib/schema'
import { and, eq } from 'drizzle-orm'

// Mirror queries in functions/api/suggestions.ts.

async function listPendingClientIds(db: ReturnType<typeof createTestDb>['db']) {
  const rows = await db
    .select({ clientId: suggestions.clientId })
    .from(suggestions)
    .where(eq(suggestions.status, 'pending'))
  return rows.map((r) => r.clientId)
}

async function listSuggestions(
  db: ReturnType<typeof createTestDb>['db'],
  opts: { status?: string; clientId?: string } = {},
) {
  const filters = []
  if (opts.status && opts.status !== 'all') filters.push(eq(suggestions.status, opts.status))
  if (opts.clientId) filters.push(eq(suggestions.clientId, opts.clientId))

  let query = db.select().from(suggestions)
  if (filters.length > 0) {
    query = query.where(and(...filters))
  }
  return (await query.orderBy(suggestions.createdAt)).reverse()
}

function mkSuggestion(over: Partial<typeof suggestions.$inferInsert> & { id: string; clientId: string }) {
  return {
    suggested: { name: 'New', shopName: '', address: '', lat: null, lng: null },
    status: 'pending',
    suggestedPhoto: null,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...over,
  }
}

describe('suggestions GET (pending-client-ids mode)', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
    seedClients(ctx.db, [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ])
  })

  it('returns clientIds that have at least one pending suggestion', async () => {
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1' }),
      mkSuggestion({ id: 's2', clientId: '2' }),
      mkSuggestion({ id: 's3', clientId: '2', status: 'approved' }),
    ])
    const ids = await listPendingClientIds(ctx.db)
    expect(ids.sort()).toEqual(['1', '2']) // 2 only has 'pending' (s1), s3 is 'approved'
  })

  it('returns [] when no suggestions exist', async () => {
    expect(await listPendingClientIds(ctx.db)).toEqual([])
  })

  it('returns [] when all suggestions are approved or rejected', async () => {
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1', status: 'approved' }),
      mkSuggestion({ id: 's2', clientId: '1', status: 'rejected' }),
    ])
    expect(await listPendingClientIds(ctx.db)).toEqual([])
  })

  it('returns one row per suggestion (dedup happens client-side via Set)', async () => {
    // The endpoint returns the raw clientId per matching row; the
    // client (suggestion-store) wraps it in `new Set(data)`. This
    // documents the contract — query returns 3 rows, Set dedupes to 1.
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1' }),
      mkSuggestion({ id: 's2', clientId: '1' }),
      mkSuggestion({ id: 's3', clientId: '1' }),
    ])
    const ids = await listPendingClientIds(ctx.db)
    expect(ids).toEqual(['1', '1', '1'])
    expect(new Set(ids)).toEqual(new Set(['1']))
  })
})

describe('suggestions GET (status + clientId filters)', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
    seedClients(ctx.db, [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ])
  })

  it('filters by status', async () => {
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1', status: 'pending' }),
      mkSuggestion({ id: 's2', clientId: '1', status: 'approved' }),
      mkSuggestion({ id: 's3', clientId: '2', status: 'pending' }),
    ])
    const pending = await listSuggestions(ctx.db, { status: 'pending' })
    expect(pending.map((s) => s.id).sort()).toEqual(['s1', 's3'])
  })

  it('filters by clientId', async () => {
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1' }),
      mkSuggestion({ id: 's2', clientId: '2' }),
    ])
    const for1 = await listSuggestions(ctx.db, { clientId: '1' })
    expect(for1.map((s) => s.id)).toEqual(['s1'])
  })

  it('combines status + clientId', async () => {
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1', status: 'pending' }),
      mkSuggestion({ id: 's2', clientId: '1', status: 'approved' }),
      mkSuggestion({ id: 's3', clientId: '2', status: 'pending' }),
    ])
    const out = await listSuggestions(ctx.db, { status: 'pending', clientId: '1' })
    expect(out.map((s) => s.id)).toEqual(['s1'])
  })

  it('status=all returns everything (no status filter applied)', async () => {
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1', status: 'pending' }),
      mkSuggestion({ id: 's2', clientId: '1', status: 'approved' }),
    ])
    const out = await listSuggestions(ctx.db, { status: 'all' })
    expect(out).toHaveLength(2)
  })

  it('no filters returns all suggestions, newest first', async () => {
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1', createdAt: 1000 }),
      mkSuggestion({ id: 's2', clientId: '1', createdAt: 3000 }),
      mkSuggestion({ id: 's3', clientId: '1', createdAt: 2000 }),
    ])
    const out = await listSuggestions(ctx.db)
    // Endpoint orders ASC then reverses for newest-first UI
    expect(out.map((s) => s.id)).toEqual(['s2', 's3', 's1'])
  })
})

describe('suggestions FK behavior', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
  })

  it('inserting a suggestion with a non-existent clientId fails (FK enforced)', async () => {
    // Without a matching clients row, the FK constraint should reject the insert
    expect(() => {
      ctx.db.insert(suggestions).values(mkSuggestion({ id: 's1', clientId: 'ghost' })).run()
    }).toThrow(/FOREIGN KEY/i)
  })

  it('FK CASCADE drops suggestions when the parent client is deleted', async () => {
    seedClients(ctx.db, [{ id: '1', name: 'A' }])
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1' }),
      mkSuggestion({ id: 's2', clientId: '1' }),
    ])

    await ctx.db.delete(clients).where(eq(clients.id, '1'))

    const remaining = await ctx.db.select().from(suggestions)
    expect(remaining).toHaveLength(0)
  })

  it('snapshots suggestions into settings BEFORE the client delete (H3 parity)', async () => {
    seedClients(ctx.db, [{ id: '1', name: 'A' }])
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1' }),
      mkSuggestion({ id: 's2', clientId: '1' }),
    ])

    // Simulate DELETE handler order: snapshot → delete
    const suggs = await ctx.db.select().from(suggestions).where(eq(suggestions.clientId, '1'))
    await ctx.db.insert(settings).values({
      key: 'trash:v1:1:suggestions',
      value: JSON.stringify(suggs),
    })
    await ctx.db.delete(clients).where(eq(clients.id, '1'))

    // FK dropped them from suggestions, but the snapshot survives
    const live = await ctx.db.select().from(suggestions)
    expect(live).toHaveLength(0)

    const [snap] = await ctx.db.select().from(settings).where(eq(settings.key, 'trash:v1:1:suggestions'))
    expect(snap).toBeDefined()
    const parsed = JSON.parse(snap.value)
    expect(parsed).toHaveLength(2)
    expect(parsed.map((s: { id: string }) => s.id).sort()).toEqual(['s1', 's2'])
  })

  it('restoring from snapshot re-inserts suggestions that the FK dropped', async () => {
    // This is the end-to-end H3 fix verification
    seedClients(ctx.db, [{ id: '1', name: 'A' }])
    await ctx.db.insert(suggestions).values([
      mkSuggestion({ id: 's1', clientId: '1', suggested: { name: 'Fix-name', shopName: '', address: '', lat: null, lng: null } }),
    ])

    // 1) Snapshot the suggestion
    const suggs = await ctx.db.select().from(suggestions).where(eq(suggestions.clientId, '1'))
    await ctx.db.insert(settings).values({
      key: 'trash:v1:1:suggestions',
      value: JSON.stringify(suggs),
    })

    // 2) Delete the client (FK CASCADE drops suggestions)
    await ctx.db.delete(clients).where(eq(clients.id, '1'))
    expect(await ctx.db.select().from(suggestions)).toHaveLength(0)

    // 3) Restore: re-insert client, then re-insert suggestions from snapshot
    await ctx.db.insert(clients).values({
      id: '1', name: 'A', shopName: '', address: '',
      lat: null, lng: null, images: [], badge: null, notes: null,
      createdAt: 100, updatedAt: 200,
    })
    const [snap] = await ctx.db.select().from(settings).where(eq(settings.key, 'trash:v1:1:suggestions'))
    const restored = JSON.parse(snap.value)
    await ctx.db.insert(suggestions).values(restored)

    // 4) Verify — suggestions back, with their original data
    const live = await ctx.db.select().from(suggestions).where(eq(suggestions.clientId, '1'))
    expect(live).toHaveLength(1)
    expect(live[0].id).toBe('s1')
    const data = live[0].suggested as { name: string }
    expect(data.name).toBe('Fix-name')
  })
})
