import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { desc, eq, sql, like, and, or, lt } from 'drizzle-orm'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// ----------------------------------------------------------------------------
// CORS — frontend runs on data.mcky.space, API on data-api.fall3n.workers.dev
// ----------------------------------------------------------------------------

const ALLOWED_ORIGIN = 'https://data.mcky.space'

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-clerk-check, x-admin-token')
  headers.set('Access-Control-Max-Age', '86400')
  return new Response(response.body, { status: response.status, headers })
}

// ----------------------------------------------------------------------------
// Schema (identical to functions/lib/schema.ts)
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// DB helper
// ----------------------------------------------------------------------------

// DB handle is cached per isolate — drizzle() construction + a stray
// PRAGMA round-trip on every request was pure overhead (D1 needs neither).
let _db: ReturnType<typeof createDbFresh> | null = null
function createDbFresh() {
  const d1 = (env as any).DB as D1Database
  return drizzle(d1, { schema: { clients: clientsTable, settings: settingsTable, auditLog: auditLogTable } })
}
function createDb() {
  if (!_db) _db = createDbFresh()
  return _db
}

// ----------------------------------------------------------------------------
// Auth (Clerk only — any valid session is admin, no email allowlist)
// ----------------------------------------------------------------------------

const CLERK_ISSUER = 'https://clerk.mcky.space'

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function jwks() {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`))
  return _jwks
}

async function isAdminReq(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/i)
  if (!m) return false
  const token = m[1]
  // Positive verifications are cached 60s per isolate so rapid write bursts
  // (save → upload photos → update) don't re-fetch the JWKS each time.
  const now = Date.now()
  const hit = verifiedTokens.get(token)
  if (hit && hit > now) return true
  try {
    const { payload } = await jwtVerify(token, jwks(), { issuer: CLERK_ISSUER })
    if (typeof payload.sub !== 'string' || payload.sub === '') return false
    verifiedTokens.set(token, now + 60_000)
    if (verifiedTokens.size > 1000) verifiedTokens.delete(verifiedTokens.keys().next().value!)
    return true
  } catch { return false }
}
const verifiedTokens = new Map<string, number>()

// ----------------------------------------------------------------------------
// Geo helpers (L2 fix: round to ~11m)
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Name helpers
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Audit log
// ----------------------------------------------------------------------------

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

// Best-effort and never awaited on the hot path — call sites use
// `void logAudit(...)` so mutations don't wait for the audit insert.
async function logAudit(request: Request | null, entry: { action: string; target?: string | null; payload?: Record<string, unknown> }) {
  try {
    const db = createDb()
    await db.insert(auditLogTable).values({
      id: crypto.randomUUID(),
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

// ----------------------------------------------------------------------------
// Theme ids
// ----------------------------------------------------------------------------

const THEME_IDS = new Set(['bubblegum', 'slate', 'glitchpage', 'crt', 'claude', 'rack', 'noc', 'min', 'brut', 'mcky', 'blueprint', 'noir', 'portal'])
function isThemeId(value: string): boolean {
  return THEME_IDS.has(value)
}

// ----------------------------------------------------------------------------
// Thumbs + edge cache helpers
// ----------------------------------------------------------------------------

// R2 thumbnails live at clients/{id}/t/{base}.jpg next to the full image at
// clients/{id}/{base}.{ext}. Pure naming convention — no D1 migration, and
// old photos without a thumb just derive a URL that 404s (UI falls back).
function thumbUrl(full: string | null | undefined): string | null {
  if (!full || !full.startsWith('http')) return null
  const m = full.match(/^(https?:\/\/[^/]+\/clients\/[^/]+\/)([^/?#]+)\.\w+([?#].*)?$/)
  if (!m) return null
  return `${m[1]}t/${m[2]}.jpg${m[3] ?? ''}`
}

// Edge-cache a public JSON response for 60s via caches.default. The
// previous `Cache-Control: max-age` header alone cached nothing — Workers
// don't cache without the Cache API. Mutations don't invalidate (TTL is
// short); explicit refresh uses the uncached /api/clients endpoint.
async function cachedJson(request: Request, build: () => Promise<unknown>): Promise<Response> {
  const cache = caches.default
  const key = new Request(request.url, { method: 'GET' })
  const hit = await cache.match(key)
  if (hit) return hit
  const res = new Response(JSON.stringify(await build()), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  })
  try { await cache.put(key, res.clone()) } catch { /* cache full / unsupported — serve anyway */ }
  return res
}

// ----------------------------------------------------------------------------
// Elysia app
// ----------------------------------------------------------------------------

export default new Elysia({ adapter: CloudflareAdapter })
  // Handle ALL requests — CORS preflight + add CORS to responses
  .onRequest((ctx) => {
    if (ctx.request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-clerk-check, x-admin-token',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
  })
  // Add CORS headers to every response
  .onAfterHandle((ctx) => {
    const response = ctx.response as Response | undefined
    if (response && response instanceof Response) {
      const headers = new Headers(response.headers)
      headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
      return new Response(response.body, { status: response.status, headers })
    }
  })

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

  // --- clients list (full data) ---
  .get('/api/clients', async (ctx) => {
    const db = createDb()
    const url = new URL(ctx.request.url)
    const limit = url.searchParams.get('limit')

    if (limit === 'all') {
      const rows = await db.select().from(clientsTable).orderBy(desc(clientsTable.updatedAt))
      return new Response(JSON.stringify(roundLatLngList(normalizeClientList(rows))), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      })
    }

    const numLimit = limit ? parseInt(limit, 10) : undefined
    const query = db.select().from(clientsTable).orderBy(desc(clientsTable.updatedAt))
    const rows = numLimit ? await query.limit(numLimit) : await query
    return new Response(JSON.stringify(roundLatLngList(normalizeClientList(rows))), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    })
  })

  // --- clients list (lightweight, for catalog) ---
  .get('/api/clients/list', async (ctx) => {
    return cachedJson(ctx.request, async () => {
      const db = createDb()
      const rows = await db
        .select({
          id: clientsTable.id,
          name: clientsTable.name,
          shopName: clientsTable.shopName,
          images: clientsTable.images,
          badge: clientsTable.badge,
          updatedAt: clientsTable.updatedAt,
          createdAt: clientsTable.createdAt,
        })
        .from(clientsTable)
        .orderBy(desc(clientsTable.updatedAt))

      return rows.map((r) => {
        const image = Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : null
        return {
          id: r.id,
          name: r.name,
          shopName: r.shopName,
          image,
          thumb: thumbUrl(image),
          badge: r.badge,
          updatedAt: r.updatedAt,
          createdAt: r.createdAt,
        }
      })
    })
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

    void logAudit(ctx.request, { action: 'client.create', target: id, payload: { name: String(data.name ?? '') } })
    return Response.json({ ok: true, id }, { status: 201 })
  })

  // --- clients count (edge-cached 60s — count rarely changes) ---
  .get('/api/clients/count', async (ctx) => {
    return cachedJson(ctx.request, async () => {
      const db = createDb()
      const result = await db.select({ count: sql<number>`count(*)` }).from(clientsTable)
      return { count: result[0]?.count ?? 0 }
    })
  })

  // --- clients search (edge-cached 60s per query) ---
  .get('/api/clients/search', async (ctx) => {
    const url = new URL(ctx.request.url)
    const q = url.searchParams.get('q')
    if (!q || !q.trim()) return Response.json([])

    return cachedJson(ctx.request, async () => {
      const keywords = q.trim().split(/\s+/).filter(Boolean)
      const conditions = keywords.map((kw) => {
        const pattern = `%${kw}%`
        return or(like(clientsTable.name, pattern), like(clientsTable.shopName, pattern))
      })

      const db = createDb()
      const rows = await db.select().from(clientsTable).where(and(...conditions)).limit(10)
      return roundLatLngList(rows)
    })
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
      void logAudit(ctx.request, { action: 'client.restore', target: body.id })
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
      void logAudit(ctx.request, { action: 'client.force_delete', target: body.id })
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

    void logAudit(ctx.request, { action: 'client.update', target: params.id })
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

    void logAudit(ctx.request, { action: 'client.delete', target: params.id })
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

    void logAudit(ctx.request, { action: 'profile.theme.update', payload: { theme } })
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

    const { clientId, images, deletedImages, thumbs } = body as Record<string, unknown>

    if (typeof clientId !== 'string' || !Array.isArray(images)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }
    // `thumbs` is entry-aligned with `images` (null for non-base64 entries).
    if (thumbs !== undefined && (!Array.isArray(thumbs) || thumbs.length !== (images as unknown[]).length)) {
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

    // Strip a full R2 URL down to its object key, and map it to the
    // derived thumb key (clients/{id}/t/{base}.jpg). Returns null for
    // non-R2 URLs.
    const r2Prefix = `${(env as any).R2_PUBLIC_URL}/` as string
    function thumbKeyFor(fullUrl: string): string | null {
      if (!fullUrl.startsWith(r2Prefix)) return null
      const m = fullUrl.slice(r2Prefix.length).match(/^(clients\/[^/]+\/)([^/]+)\.\w+$/)
      if (!m) return null
      return `${m[1]}t/${m[2]}.jpg`
    }

    if (Array.isArray(deletedImages) && deletedImages.length > 0) {
      await Promise.all(
        (deletedImages as string[])
          .filter((u) => u.startsWith('http') && !u.startsWith('data:'))
          .flatMap((u) => {
            const ops: Promise<unknown>[] = [
              (env as any).BUCKET.delete(u.replace(r2Prefix, '')),
            ]
            const tk = thumbKeyFor(u)
            if (tk) ops.push((env as any).BUCKET.delete(tk).catch(() => {}))
            return ops
          })
      )
    }

    // Photo objects are content-addressed by timestamp (unique per upload),
    // so immutable year-long caching is safe and makes repeat list views free.
    const IMMUTABLE = 'public, max-age=31536000, immutable'
    let newUrls: string[]
    try {
      newUrls = await Promise.all(
        (images as string[]).map(async (img, i): Promise<string> => {
          if (!img.startsWith('data:image')) return img
          const match = img.match(/^data:(image\/\w+);base64,(.+)$/)
          if (!match) throw new Error('Invalid base64 format')
          const ext = match[1].split('/')[1] === 'jpeg' ? 'jpg' : match[1].split('/')[1]
          const binary = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
          const base = Date.now()
          const key = `clients/${clientId}/${base}.${ext}`
          await (env as any).BUCKET.put(key, binary, { httpMetadata: { contentType: match[1], cacheControl: IMMUTABLE } })
          // Thumbnail (optional, best-effort): tiny JPEG next to the full.
          const thumb = Array.isArray(thumbs) ? (thumbs as unknown[])[i] : null
          if (typeof thumb === 'string' && thumb.startsWith('data:image') && thumb.length <= 100_000) {
            const tm = thumb.match(/^data:(image\/\w+);base64,(.+)$/)
            if (tm) {
              try {
                const tbin = Uint8Array.from(atob(tm[2]), (c) => c.charCodeAt(0))
                await (env as any).BUCKET.put(`clients/${clientId}/t/${base}.jpg`, tbin, {
                  httpMetadata: { contentType: 'image/jpeg', cacheControl: IMMUTABLE },
                })
              } catch { /* thumb is enhancement-only */ }
            }
          }
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
  const expired: string[] = []
  for (const row of rows) {
    try {
      const data = JSON.parse(row.value) as { deletedAt?: number }
      if (data.deletedAt && data.deletedAt < cutoff) expired.push(row.key)
    } catch {
      // Corrupted trash payloads are unreadable — purge them too rather than
      // letting them pile up forever.
      expired.push(row.key)
    }
  }
  if (expired.length === 0) return 0
  await db.delete(settingsTable).where(sql`${settingsTable.key} IN (${expired})`)
  return expired.length
}
