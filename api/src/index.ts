import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { desc, eq, sql, like, and, or, lt } from 'drizzle-orm'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// ---------------------------------------------------------------------------
// Schema (identical to functions/lib/schema.ts)
// ---------------------------------------------------------------------------

const clientsTable = sqliteTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shopName: text('shop_name').notNull(),
  address: text('address').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  images: text('images', { mode: 'json' }).$type<string[]>().notNull().default([]),
  badge: text('badge'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
}, (table) => ({
  updatedAtIdx: index('clients_updated_at_idx').on(table.updatedAt),
}))

const settingsTable = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

const auditLogTable = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  actor: text('actor'),
  action: text('action').notNull(),
  target: text('target'),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  ip: text('ip'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
}, (table) => ({
  createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
}))

// ---------------------------------------------------------------------------
// DB helper
// ---------------------------------------------------------------------------

function createDb() {
  const d1 = (env as any).DB as D1Database
  d1.prepare('PRAGMA foreign_keys = ON').run()
  return drizzle(d1, { schema: { clients: clientsTable, settings: settingsTable, auditLog: auditLogTable } })
}

// ---------------------------------------------------------------------------
// Auth (Clerk only — legacy HMAC removed)
// ---------------------------------------------------------------------------

const CLERK_ISSUER = 'https://clerk.mcky.space'
const CLERK_API_BASE = 'https://api.clerk.com/v1'
const ADMIN_EMAILS = new Set([
  'bankkh@gmail.com',
  'daily@mcky.space',
  'mcky@ezzy.com',
  'mcky@mcky.space',
  'papapun2707@gmail.com',
  'pitchy@ezzy.com',
])

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function jwks() {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`))
  return _jwks
}

const emailCache = new Map<string, { email: string; at: number }>()
const EMAIL_CACHE_TTL = 10 * 60 * 1000

async function resolveUserEmail(sub: string): Promise<string | null> {
  const hit = emailCache.get(sub)
  if (hit && Date.now() - hit.at < EMAIL_CACHE_TTL) return hit.email
  const secret = (env as any).CLERK_SECRET_KEY
  if (!secret) return null
  try {
    const res = await fetch(`${CLERK_API_BASE}/users/${encodeURIComponent(sub)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    })
    if (!res.ok) return null
    const user = (await res.json()) as any
    const emails = user.email_addresses ?? []
    const primary = emails.find((e: any) => e.id === user.primary_email_address_id) ?? emails[0]
    const email = primary?.email_address?.trim().toLowerCase() ?? null
    if (email) emailCache.set(sub, { email, at: Date.now() })
    return email
  } catch { return null }
}

async function isAdminReq(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/i)
  if (!m) return false
  try {
    const { payload } = await jwtVerify(m[1], jwks(), { issuer: CLERK_ISSUER })
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    if (!sub) return false
    const secret = (env as any).CLERK_SECRET_KEY
    if (secret) {
      const email = await resolveUserEmail(sub)
      return !!email && ADMIN_EMAILS.has(email)
    }
    return false
  } catch { return false }
}

// ---------------------------------------------------------------------------
// Geo helpers (L2 fix: round to ~11m)
// ---------------------------------------------------------------------------

function roundCoord(n: number | null | undefined): number | null {
  if (n == null || typeof n !== 'number' || !Number.isFinite(n)) return null
  return Math.round(n * 1e5) / 1e5
}

function roundLatLng<T extends { lat?: number | null; lng?: number | null }>(row: T): T {
  return { ...row, lat: roundCoord(row.lat), lng: roundCoord(row.lng) }
}

function roundLatLngList<T extends { lat?: number | null; lng?: number | null }>(rows: T[]): T[] {
  return rows.map(roundLatLng)
}

// ---------------------------------------------------------------------------
// Name helpers
// ---------------------------------------------------------------------------

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        }
      } catch {}
    }
    return [value]
  }
  return []
}

function serializeNames(value: unknown): string {
  return JSON.stringify(coerceStringArray(value))
}

function normalizeClient<T extends Record<string, unknown>>(row: T): T & { name: string[]; shopName: string[] } {
  return { ...row, name: coerceStringArray(row.name), shopName: coerceStringArray(row.shopName) }
}

function normalizeClientList<T extends Record<string, unknown>>(rows: T[]): Array<T & { name: string[]; shopName: string[] }> {
  return rows.map(normalizeClient)
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

async function logAudit(request: Request | null, entry: { action: string; target?: string | null; payload?: Record<string, unknown> }) {
  try {
    const db = createDb()
    await db.insert(auditLogTable).values({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      action: entry.action,
      target: entry.target ?? null,
      payload: entry.payload ?? null,
      ip: request ? getClientIp(request) : null,
      createdAt: Date.now(),
    })
  } catch (e) {
    console.warn('audit log failed:', e instanceof Error ? e.message : String(e))
  }
}

async function purgeOldAuditLog(): Promise<number> {
  try {
    const db = createDb()
    const cutoff = Date.now() - 90 * 86_400_000
    const deleted = await db
      .delete(auditLogTable)
      .where(lt(auditLogTable.createdAt, cutoff))
      .returning({ id: auditLogTable.id })
    return deleted.length
  } catch { return 0 }
}

// ---------------------------------------------------------------------------
// Theme ids
// ---------------------------------------------------------------------------

const THEME_IDS = new Set(['bubblegum', 'slate', 'glitchpage', 'crt', 'claude', 'rack', 'noc', 'min', 'brut', 'mcky', 'blueprint', 'noir', 'portal'])
function isThemeId(value: string): boolean {
  return THEME_IDS.has(value)
}

// ---------------------------------------------------------------------------
// Elysia app
// ---------------------------------------------------------------------------

export default new Elysia({ adapter: CloudflareAdapter })
  // --- ping ---
  .get('/api/ping', () => Response.json({ ok: true }))

  // --- auth ---
  .get('/api/auth', async (ctx) => {
    if (ctx.request.headers.get('x-clerk-check') === 'true') {
      const authHeader = ctx.request.headers.get('Authorization')
      if (!authHeader) return Response.json({ configured: true })
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        const admin = await isAdminReq(new Request(ctx.request.url, { headers: { Authorization: `Bearer ${token}` } }))
        return Response.json({ ok: true, configured: true, admin })
      } catch (err: any) {
        return Response.json({ ok: false, error: err?.message ?? 'Invalid token' }, { status: 401 })
      }
    }
    return Response.json({ ok: true })
  })
  .post('/api/auth', async () => Response.json({ error: 'Deprecated — use Clerk sign-in' }, { status: 410 }))
  .delete('/api/auth', async () => Response.json({ error: 'Deprecated — use Clerk sign-out' }, { status: 410 }))

  // --- clients list ---
  .get('/api/clients', async (ctx) => {
    const db = createDb()
    const url = new URL(ctx.request.url)
    const limit = url.searchParams.get('limit')

    if (limit === 'all') {
      const rows = await db.select().from(clientsTable).orderBy(desc(clientsTable.updatedAt))
      return Response.json(roundLatLngList(normalizeClientList(rows)))
    }

    const numLimit = limit ? parseInt(limit, 10) : undefined
    const query = db.select().from(clientsTable).orderBy(desc(clientsTable.updatedAt))
    const rows = numLimit ? await query.limit(numLimit) : await query
    return Response.json(roundLatLngList(normalizeClientList(rows)))
  })

  // --- clients create ---
  .post('/api/clients', async (ctx) => {
    if (!(await isAdminReq(ctx.request))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createDb()
    const data = (await ctx.request.json()) as Record<string, unknown>
    const id = typeof data.id === 'string' ? data.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const now = Date.now()

    await db.insert(clientsTable).values({
      id,
      name: serializeNames(data.name),
      shopName: serializeNames(data.shopName),
      address: String(data.address ?? ''),
      lat: typeof data.lat === 'number' ? data.lat : null,
      lng: typeof data.lng === 'number' ? data.lng : null,
      images: Array.isArray(data.images) ? data.images : [],
      badge: typeof data.badge === 'string' ? data.badge : null,
      notes: typeof data.notes === 'string' ? data.notes : null,
      createdAt: now,
      updatedAt: now,
    })

    await logAudit(ctx.request, { action: 'client.create', target: id, payload: { name: String(data.name ?? '') } })
    return Response.json({ ok: true, id }, { status: 201 })
  })

  // --- clients count ---
  .get('/api/clients/count', async () => {
    const db = createDb()
    const result = await db.select({ count: sql<number>`count(*)` }).from(clientsTable)
    return Response.json({ count: result[0]?.count ?? 0 })
  })

  // --- clients search ---
  .get('/api/clients/search', async (ctx) => {
    const url = new URL(ctx.request.url)
    const q = url.searchParams.get('q')
    if (!q || !q.trim()) return Response.json([])

    const keywords = q.trim().split(/\s+/).filter(Boolean)
    const conditions = keywords.map((kw) => {
      const pattern = `%${kw}%`
      return or(like(clientsTable.name, pattern), like(clientsTable.shopName, pattern))
    })

    const db = createDb()
    const rows = await db.select().from(clientsTable).where(and(...conditions)).limit(10)
    return Response.json(roundLatLngList(rows))
  })

  // --- trash list ---
  .get('/api/clients/trash', async (ctx) => {
    if (!(await isAdminReq(ctx.request))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createDb()
    await purgeExpiredTrash(db)
    await purgeOldAuditLog()

    const rows = await db
      .select()
      .from(settingsTable)
      .where(sql`${settingsTable.key} LIKE ${'trash:v1:' + '%'}`)

    const parsed: Record<string, unknown>[] = []
    for (const r of rows) {
      try {
        parsed.push({ ...normalizeClient(JSON.parse(r.value)), _trashKey: r.key })
      } catch {}
    }

    return Response.json(parsed.sort((a, b) => (b as any).deletedAt - (a as any).deletedAt))
  })

  // --- trash action ---
  .post('/api/clients/trash', async (ctx) => {
    if (!(await isAdminReq(ctx.request))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createDb()
    const url = new URL(ctx.request.url)
    const action = url.searchParams.get('action')
    let body: { id?: string }
    try {
      body = (await ctx.request.json()) as { id?: string }
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.id) return Response.json({ error: 'Missing id' }, { status: 400 })

    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, `trash:v1:${body.id}`))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    if (action === 'restore') {
      let data: Record<string, unknown>
      try { data = JSON.parse(row.value) } catch { return Response.json({ error: 'Corrupted trash data' }, { status: 422 }) }
      const { deletedAt, ...clientRow } = data as Record<string, unknown> & { deletedAt?: number }
      void deletedAt
      await db.insert(clientsTable).values(clientRow as any)
      await db.delete(settingsTable).where(eq(settingsTable.key, `trash:v1:${body.id}`))
      await logAudit(ctx.request, { action: 'client.restore', target: body.id })
      return Response.json({ ok: true })
    }

    if (action === 'force-delete') {
      try {
        const snapshot = JSON.parse(row.value) as { images?: unknown }
        if (Array.isArray(snapshot.images) && snapshot.images.length > 0) {
          await Promise.all(
            (snapshot.images as string[])
              .filter((u) => u.startsWith('http') && !u.startsWith('data:'))
              .map((u) => (env as any).BUCKET.delete(u.replace(`${(env as any).R2_PUBLIC_URL}/`, '')))
          )
        }
      } catch {}
      await db.delete(settingsTable).where(eq(settingsTable.key, `trash:v1:${body.id}`))
      await logAudit(ctx.request, { action: 'client.force_delete', target: body.id })
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  })

  // --- client by id ---
  .get('/api/clients/:id', async (ctx) => {
    const db = createDb()
    const { params, request } = ctx as any

    const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.id))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    const url = new URL(request.url)
    if (url.searchParams.get('raw') === 'true') return Response.json(row)
    return Response.json(roundLatLng(normalizeClient(row)))
  })
  .put('/api/clients/:id', async (ctx) => {
    if (!(await isAdminReq(ctx.request))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createDb()
    const data = (await ctx.request.json()) as Record<string, unknown>
    const { params } = ctx as any

    await db.update(clientsTable).set({
      name: serializeNames(data.name),
      shopName: serializeNames(data.shopName),
      address: String(data.address ?? ''),
      lat: typeof data.lat === 'number' ? data.lat : null,
      lng: typeof data.lng === 'number' ? data.lng : null,
      images: Array.isArray(data.images) ? data.images : [],
      badge: typeof data.badge === 'string' ? data.badge : null,
      notes: typeof data.notes === 'string' ? data.notes : null,
      updatedAt: Date.now(),
    }).where(eq(clientsTable.id, params.id))

    await logAudit(ctx.request, { action: 'client.update', target: params.id })
    return Response.json({ ok: true })
  })
  .delete('/api/clients/:id', async (ctx) => {
    if (!(await isAdminReq(ctx.request))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createDb()
    const { params } = ctx as any
    const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.id))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    const clientData = JSON.stringify({ ...row, deletedAt: Date.now() })

    await db.insert(settingsTable).values({ key: `trash:v1:${params.id}`, value: clientData }).onConflictDoNothing()
    await db.delete(clientsTable).where(eq(clientsTable.id, params.id))

    await logAudit(ctx.request, { action: 'client.delete', target: params.id })
    return Response.json({ ok: true })
  })

  // --- profile theme ---
  .get('/api/profile/theme', async (ctx) => {
    if (!(await isAdminReq(ctx.request))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createDb()
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, 'theme'))
    const theme = rows[0]?.value ?? 'portal'
    return Response.json({ theme })
  })
  .put('/api/profile/theme', async (ctx) => {
    if (!(await isAdminReq(ctx.request))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createDb()
    const data = (await ctx.request.json()) as Record<string, unknown>
    const { theme } = data

    if (typeof theme !== 'string' || !isThemeId(theme)) {
      return Response.json({ error: 'Unknown theme' }, { status: 400 })
    }

    await db
      .insert(settingsTable)
      .values({ key: 'theme', value: theme })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: theme } })

    await logAudit(ctx.request, { action: 'profile.theme.update', payload: { theme } })
    return Response.json({ ok: true, theme })
  })

  // --- photo request ---
  .post('/api/photo-request', async (ctx) => {
    if (!(await isAdminReq(ctx.request))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = createDb()
    let body: unknown
    try { body = await ctx.request.json() } catch { 
      return Response.json({ error: 'Invalid request' }, { status: 400 }) 
    }

    const { clientId, images, deletedImages } = body as Record<string, unknown>

    if (typeof clientId !== 'string' || !Array.isArray(images)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const MAX_BASE64 = Math.ceil((10 * 1024 * 1024 * 4) / 3) + 128
    for (const img of images as string[]) {
      if (img.startsWith('data:image') && img.length > MAX_BASE64) {
        return Response.json({ error: 'Image too large', maxBytes: MAX_BASE64 }, { status: 413 })
      }
    }

    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId))
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 })
    }

    if (Array.isArray(deletedImages) && deletedImages.length > 0) {
      await Promise.all(
        (deletedImages as string[])
          .filter((u) => u.startsWith('http') && !u.startsWith('data:'))
          .map((u) => (env as any).BUCKET.delete(u.replace(`${(env as any).R2_PUBLIC_URL}/`, '')))
      )
    }

    let newUrls: string[]
    try {
      newUrls = await Promise.all(
        (images as string[]).map(async (img): Promise<string> => {
          if (!img.startsWith('data:image')) return img
          const match = img.match(/^data:(image\/\w+);base64,(.+)$/)
          if (!match) throw new Error('Invalid base64 format')
          const ext = match[1].split('/')[1] === 'jpeg' ? 'jpg' : match[1].split('/')[1]
          const binary = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
          const key = `clients/${clientId}/${Date.now()}.${ext}`
          await (env as any).BUCKET.put(key, binary, { httpMetadata: { contentType: match[1] } })
          return `${(env as any).R2_PUBLIC_URL}/${key}`
        })
      )
    } catch (e) {
      return Response.json(
        { error: 'Photo upload failed', detail: e instanceof Error ? e.message : String(e) },
        { status: 502 },
      )
    }

    const existing = Array.isArray(client.images) ? (client.images as string[]) : []
    const kept = Array.isArray(deletedImages)
      ? existing.filter((url) => !(deletedImages as string[]).includes(url))
      : existing
    const merged = [...kept, ...newUrls]

    await db.update(clientsTable).set({ images: merged, updatedAt: Date.now() }).where(eq(clientsTable.id, clientId))
    return Response.json({ images: merged })
  })

  .compile()

// --- Helpers ---

const TRASH_TTL_DAYS = 30
async function purgeExpiredTrash(db: ReturnType<typeof createDb>): Promise<number> {
  const cutoff = Date.now() - TRASH_TTL_DAYS * 86_400_000
  const rows = await db.select().from(settingsTable).where(sql`${settingsTable.key} LIKE ${'trash:v1:' + '%'}`)
  let purged = 0
  for (const row of rows) {
    try {
      const data = JSON.parse(row.value) as { deletedAt?: number }
      if (data.deletedAt && data.deletedAt < cutoff) {
        await db.delete(settingsTable).where(eq(settingsTable.key, row.key))
        purged++
      }
    } catch {}
  }
  return purged
}
