import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, seedClients } from '../helpers/db'
import { clients, settings, suggestions } from '../../functions/lib/schema'
import { eq, sql } from 'drizzle-orm'

// Mirror helpers in functions/api/clients/trash.ts
const TRASH_KEY_PREFIX = 'trash:v1:'
const TRASH_TTL_DAYS = 30
const TRASH_TTL_MS = TRASH_TTL_DAYS * 86_400_000
const trashKey = (id: string) => `${TRASH_KEY_PREFIX}${id}`
const suggestionsTrashKey = (id: string) => `${TRASH_KEY_PREFIX}${id}:suggestions`

async function listTrash(db: ReturnType<typeof createTestDb>['db']) {
  const rows = await db
    .select()
    .from(settings)
    .where(sql`${settings.key} LIKE ${TRASH_KEY_PREFIX + '%'} AND ${settings.key} NOT LIKE ${TRASH_KEY_PREFIX + '%:suggestions'}`)
  const parsed: Record<string, unknown>[] = []
  for (const r of rows) {
    try { parsed.push({ ...JSON.parse(r.value), _trashKey: r.key }) } catch { /* skip */ }
  }
  return parsed.sort((a, b) => (b as { deletedAt?: number }).deletedAt! - (a as { deletedAt?: number }).deletedAt!)
}

async function purgeExpiredTrash(db: ReturnType<typeof createTestDb>['db'], now = Date.now()) {
  const cutoff = now - TRASH_TTL_MS
  const rows = await db.select().from(settings).where(sql`${settings.key} LIKE ${TRASH_KEY_PREFIX + '%'}`)
  let purged = 0
  for (const row of rows) {
    try {
      const data = JSON.parse(row.value) as { deletedAt?: number }
      if (data.deletedAt && data.deletedAt < cutoff) {
        await db.delete(settings).where(eq(settings.key, row.key))
        purged++
      }
    } catch { /* leave bad JSON */ }
  }
  return purged
}

async function restoreClient(db: ReturnType<typeof createTestDb>['db'], id: string) {
  const [row] = await db.select().from(settings).where(eq(settings.key, trashKey(id)))
  if (!row) return null
  const data = JSON.parse(row.value) as Record<string, unknown> & { deletedAt?: number }
  const { deletedAt: _d, ...clientRow } = data
  void _d
  await db.insert(clients).values(clientRow as typeof clients.$inferInsert)

  const suggKey = suggestionsTrashKey(id)
  const [suggRow] = await db.select().from(settings).where(eq(settings.key, suggKey))
  if (suggRow) {
    try {
      const saved = JSON.parse(suggRow.value) as Array<Record<string, unknown>>
      if (Array.isArray(saved) && saved.length > 0) {
        await db.insert(suggestions).values(saved as typeof suggestions.$inferInsert[])
      }
      await db.delete(settings).where(eq(settings.key, suggKey))
    } catch {
      await db.delete(settings).where(eq(settings.key, suggKey))
    }
  }
  await db.delete(settings).where(eq(settings.key, trashKey(id)))
  return clientRow
}

describe('trash list + purge', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
  })

  it('returns only client snapshots, not the parallel :suggestions rows', async () => {
    seedClients(ctx.db, [{ id: '1', name: 'A' }])
    await ctx.db.insert(settings).values({
      key: 'trash:v1:1',
      value: JSON.stringify({ id: '1', name: 'A', deletedAt: Date.now() }),
    })
    await ctx.db.insert(settings).values({
      key: 'trash:v1:1:suggestions',
      value: JSON.stringify([]),
    })
    const list = await listTrash(ctx.db)
    expect(list).toHaveLength(1)
    expect(list[0]._trashKey).toBe('trash:v1:1')
  })

  it('sorts by deletedAt desc (newest first)', async () => {
    const t = Date.now()
    await ctx.db.insert(settings).values([
      { key: 'trash:v1:a', value: JSON.stringify({ id: 'a', deletedAt: t - 1000 }) },
      { key: 'trash:v1:b', value: JSON.stringify({ id: 'b', deletedAt: t }) },
      { key: 'trash:v1:c', value: JSON.stringify({ id: 'c', deletedAt: t - 500 }) },
    ])
    const list = await listTrash(ctx.db)
    expect(list.map((r) => (r as { id: string }).id)).toEqual(['b', 'c', 'a'])
  })

  it('purges entries older than 30 days', async () => {
    const now = Date.now()
    const stale = now - (TRASH_TTL_DAYS + 1) * 86_400_000
    const fresh = now - 1_000
    await ctx.db.insert(settings).values([
      { key: 'trash:v1:old', value: JSON.stringify({ id: 'old', deletedAt: stale }) },
      { key: 'trash:v1:new', value: JSON.stringify({ id: 'new', deletedAt: fresh }) },
    ])
    const purged = await purgeExpiredTrash(ctx.db, now)
    expect(purged).toBe(1)
    const remaining = await ctx.db.select().from(settings)
    expect(remaining.map((r) => r.key).sort()).toEqual(['trash:v1:new'])
  })

  it('leaves bad-JSON rows untouched (no crash, no purge)', async () => {
    await ctx.db.insert(settings).values({ key: 'trash:v1:bad', value: 'not-json{]' })
    const purged = await purgeExpiredTrash(ctx.db)
    expect(purged).toBe(0)
    const [row] = await ctx.db.select().from(settings).where(eq(settings.key, 'trash:v1:bad'))
    expect(row).toBeDefined()
  })

  it('trash key uses namespaced prefix (M5) — not legacy trash_<id>', async () => {
    // The legacy `trash_<id>` format would not match the LIKE prefix
    await ctx.db.insert(settings).values({ key: 'trash_legacy_1', value: '{}' })
    const list = await listTrash(ctx.db)
    expect(list).toEqual([])
  })
})

describe('trash restore', () => {
  let ctx: ReturnType<typeof createTestDb>
  beforeEach(() => {
    ctx = createTestDb()
  })

  it('re-inserts the client and drops both trash keys', async () => {
    seedClients(ctx.db, [{ id: 'r1', name: 'Restore' }])
    const [row] = await ctx.db.select().from(clients).where(eq(clients.id, 'r1'))
    await ctx.db.insert(settings).values({
      key: trashKey('r1'),
      value: JSON.stringify({ ...row, deletedAt: Date.now() }),
    })
    // Simulate the cascade delete
    await ctx.db.delete(clients).where(eq(clients.id, 'r1'))

    const restored = await restoreClient(ctx.db, 'r1')
    expect(restored).toBeTruthy()
    expect((restored as { name: string }).name).toBe('Restore')

    // Client back in main table
    const [back] = await ctx.db.select().from(clients).where(eq(clients.id, 'r1'))
    expect(back).toBeDefined()
    expect(back.name).toBe('Restore')

    // Both trash keys gone
    const remaining = await ctx.db.select().from(settings)
    expect(remaining).toHaveLength(0)
  })

  it('strips the deletedAt marker before re-inserting', async () => {
    await ctx.db.insert(settings).values({
      key: trashKey('r2'),
      value: JSON.stringify({
        id: 'r2', name: 'X', shopName: '', address: '',
        lat: null, lng: null, images: [], badge: null, notes: null,
        createdAt: 100, updatedAt: 200, deletedAt: 999,
      }),
    })
    await restoreClient(ctx.db, 'r2')
    const [row] = await ctx.db.select().from(clients).where(eq(clients.id, 'r2'))
    expect(row).toBeDefined()
    expect((row as { deletedAt?: number }).deletedAt).toBeUndefined()
  })

  it('restores suggestions from the parallel snapshot (H3 parity)', async () => {
    await ctx.db.insert(settings).values({
      key: trashKey('r3'),
      value: JSON.stringify({
        id: 'r3', name: 'Y', shopName: '', address: '',
        lat: null, lng: null, images: [], badge: null, notes: null,
        createdAt: 100, updatedAt: 200, deletedAt: Date.now(),
      }),
    })
    await ctx.db.insert(settings).values({
      key: suggestionsTrashKey('r3'),
      value: JSON.stringify([{
        id: 's1', clientId: 'r3', status: 'pending',
        suggested: { name: 'New', shopName: '', address: '', lat: null, lng: null },
        createdAt: 100, updatedAt: 200,
      }]),
    })

    await restoreClient(ctx.db, 'r3')

    const suggs = await ctx.db.select().from(suggestions).where(eq(suggestions.clientId, 'r3'))
    expect(suggs).toHaveLength(1)
    expect(suggs[0].id).toBe('s1')

    // The :suggestions key is consumed
    const stillThere = await ctx.db.select().from(settings).where(eq(settings.key, suggestionsTrashKey('r3')))
    expect(stillThere).toHaveLength(0)
  })

  it('restore is a no-op when the trash key does not exist', async () => {
    const restored = await restoreClient(ctx.db, 'nope')
    expect(restored).toBeNull()
  })

  it('restore still works when the parallel :suggestions snapshot is missing (legacy)', async () => {
    // No :suggestions key — client restore should still succeed
    await ctx.db.insert(settings).values({
      key: trashKey('legacy'),
      value: JSON.stringify({
        id: 'legacy', name: 'Z', shopName: '', address: '',
        lat: null, lng: null, images: [], badge: null, notes: null,
        createdAt: 100, updatedAt: 200, deletedAt: Date.now(),
      }),
    })
    await restoreClient(ctx.db, 'legacy')
    const [row] = await ctx.db.select().from(clients).where(eq(clients.id, 'legacy'))
    expect(row).toBeDefined()
  })
})
