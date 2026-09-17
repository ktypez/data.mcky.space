import { Elysia, t, status } from 'elysia'
import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { desc, eq, sql, like, and, or, lt } from 'drizzle-orm'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { clientDataResponse, clientCorsHeaders } from './data-cache'

// ----------------------------------------------------------------------------
// CORS — frontend runs on data.mcky.space, API on data-api.fall3n.workers.dev
// ----------------------------------------------------------------------------

const ALLOWED_ORIGIN = 'https://data.mcky.space'

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

// Edge-cache a public JSON response for 60s via caches.default, returning
// plain data (instead of a Response) so Eden Treaty can infer the body
// type. Cache-Control is set via Elysia's `set.headers`.
async function cachedData<T>(
  request: Request,
  set: { headers: Record<string, string | number> },
  build: () => Promise<T>,
): Promise<T> {
  const cache = (caches as unknown as { default: Cache }).default
  const key = new Request(request.url, { method: 'GET' })
  const hit = await cache.match(key)
  if (hit) return (await hit.json()) as T
  const data = await build()
  set.headers['Cache-Control'] = 'public, max-age=60'
  try {
    await cache.put(key, new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    }))
  } catch { /* cache full / unsupported — serve anyway */ }
  return data
}

// ----------------------------------------------------------------------------
// P3: per-isolate rate limit (best-effort — each Worker isolate keeps its
// own buckets; Cloudflare edge absorbs the rest)
// ----------------------------------------------------------------------------

const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60_000
const rateBuckets = new Map<string, { n: number; reset: number }>()

function hitRateLimit(ip: string): boolean {
  const now = Date.now()
  const b = rateBuckets.get(ip)
  if (!b || b.reset <= now) {
    rateBuckets.set(ip, { n: 1, reset: now + RATE_WINDOW_MS })
    if (rateBuckets.size > 2000) rateBuckets.delete(rateBuckets.keys().next().value!)
    return false
  }
  b.n += 1
  return b.n > RATE_LIMIT
}

// ----------------------------------------------------------------------------
// Shared Treaty models (single source for validation + client inference)
// ----------------------------------------------------------------------------

// Full client row after normalizeClient: name/shopName coerced to string[],
// lat/lng rounded. Mirrors the drizzle table exactly.
const ClientShape = t.Object({
  id: t.String(),
  name: t.Array(t.String()),
  shopName: t.Array(t.String()),
  address: t.String(),
  lat: t.Union([t.Number(), t.Null()]),
  lng: t.Union([t.Number(), t.Null()]),
  images: t.Array(t.String()),
  badge: t.Union([t.String(), t.Null()]),
  notes: t.Union([t.String(), t.Null()]),
  createdAt: t.Number(),
  updatedAt: t.Number(),
})

// Lightweight catalog item — name/shopName are RAW db strings here.
const ClientListItemShape = t.Object({
  id: t.String(),
  name: t.String(),
  shopName: t.String(),
  image: t.Union([t.String(), t.Null()]),
  thumb: t.Union([t.String(), t.Null()]),
  badge: t.Union([t.String(), t.Null()]),
  updatedAt: t.Number(),
  createdAt: t.Number(),
})

// Raw DB row (name/shopName still JSON-encoded strings) — used by endpoints
// that historically skip normalizeClient (e.g. /search). Shape unchanged.
const RawClientShape = t.Object({
  id: t.String(),
  name: t.String(),
  shopName: t.String(),
  address: t.String(),
  lat: t.Union([t.Number(), t.Null()]),
  lng: t.Union([t.Number(), t.Null()]),
  images: t.Array(t.String()),
  badge: t.Union([t.String(), t.Null()]),
  notes: t.Union([t.String(), t.Null()]),
  createdAt: t.Number(),
  updatedAt: t.Number(),
})

// Tolerant create/update payload — parsing stays manual-compatible so legacy
// callers (string or string[] names, missing fields) keep working.
const ClientInputShape = t.Object({
  id: t.Optional(t.String()),
  name: t.Optional(t.Any()),
  shopName: t.Optional(t.Any()),
  address: t.Optional(t.Any()),
  lat: t.Optional(t.Any()),
  lng: t.Optional(t.Any()),
  images: t.Optional(t.Array(t.Any())),
  badge: t.Optional(t.Any()),
  notes: t.Optional(t.Any()),
})

// ----------------------------------------------------------------------------
// Daily maintenance (P1: was running on every GET /trash)
// ----------------------------------------------------------------------------

const MAINTENANCE_KEY = 'maintenance:last'
const MAINTENANCE_INTERVAL = 24 * 3600_000

async function maybeDailyMaintenance(db: ReturnType<typeof createDb>): Promise<void> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, MAINTENANCE_KEY))
    const last = row ? Number(row.value) || 0 : 0
    if (Date.now() - last < MAINTENANCE_INTERVAL) return
    await purgeExpiredTrash(db)
    await purgeOldAuditLog()
    const now = String(Date.now())
    await db.insert(settingsTable).values({ key: MAINTENANCE_KEY, value: now })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: now } })
  } catch { /* maintenance is best-effort — never break user requests */ }
}

// ----------------------------------------------------------------------------
// Elysia app
// ----------------------------------------------------------------------------

const app = new Elysia({ adapter: CloudflareAdapter })
  .use(cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ...clientCorsHeaders,
    maxAge: 86400,
  }))
  // Runs after the typed handlers; their Eden response schemas stay intact.
  // NOTE: the callback must stay `async`. A sync wrapper returning the
  // helper's Promise makes Elysia resolve early macro returns (e.g. the
  // 401 from `admin`) to `undefined` instead of a Response, and workerd
  // throws `Promise did not resolve to 'Response'` (see
  // tests/admin-gate-map-response.test.ts).
  .mapResponse(async ({ request, response, set }) => clientDataResponse(request, response, set.status))
  // P3: machine-readable spec for agents/tools at /docs (+ Scalar UI).
  // Schemas come free from the Treaty t.* models above.
  .use(openapi({ path: '/docs' }))
  // P2: single admin gate — rate limit runs first, then Clerk auth.
  // Admin routes opt in with `{ admin: true }`.
  .macro('admin', {
    async beforeHandle({ request }) {
      if (hitRateLimit(getClientIp(request))) {
        return status(429, { error: 'Too many requests' })
      }
      if (!(await isAdminReq(request))) {
        return status(401, { error: 'Unauthorized' })
      }
    },
  })

  // --- ping ---
  .get('/api/ping', () => ({ ok: true }), {
    response: t.Object({ ok: t.Boolean() }),
  })

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

  // --- full clients: read D1 for every revalidation (no obsolete edge cache) ---
  .get('/api/clients', async ({ query }) => {
      const db = createDb()
      const limit = query.limit
      if (limit === 'all') {
        const rows = await db.select().from(clientsTable).orderBy(desc(clientsTable.updatedAt), clientsTable.id)
        return roundLatLngList(normalizeClientList(rows))
      }
      const numLimit = limit ? parseInt(limit, 10) : undefined
      const q = db.select().from(clientsTable).orderBy(desc(clientsTable.updatedAt), clientsTable.id)
      const rows = numLimit ? await q.limit(numLimit) : await q
      return roundLatLngList(normalizeClientList(rows))
  }, {
    query: t.Object({ limit: t.Optional(t.String()) }),
    response: t.Array(ClientShape),
  })

  // --- clients list (lightweight, for catalog) ---
  .get('/api/clients/list', async () => {
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
        .orderBy(desc(clientsTable.updatedAt), clientsTable.id)

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
  }, {
    response: t.Array(ClientListItemShape),
  })

  // --- clients create ---
  .post('/api/clients', async ({ request, body, set }) => {
    const db = createDb()
    const data = body as Record<string, unknown>
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

    void logAudit(request, { action: 'client.create', target: id, payload: { name: String(data.name ?? '') } })
    set.status = 201
    return { ok: true, id }
  }, {
    admin: true,
    body: ClientInputShape,
  })

  // --- clients count (edge-cached 60s — count rarely changes) ---
  .get('/api/clients/count', async ({ request, set }) => {
    return cachedData(request, set, async () => {
      const db = createDb()
      const result = await db.select({ count: sql<number>`count(*)` }).from(clientsTable)
      return { count: result[0]?.count ?? 0 }
    })
  }, {
    response: t.Object({ count: t.Number() }),
  })

  // --- clients search (edge-cached 60s per query) ---
  .get('/api/clients/search', async ({ request, set, query }) => {
    const q = query.q
    if (!q || !q.trim()) return []

    return cachedData(request, set, async () => {
      // P3: cap keywords — each adds 2 LIKE scans (`%kw%` can't use an index).
      const keywords = q.trim().split(/\s+/).filter(Boolean).slice(0, 5)
      const conditions = keywords.map((kw) => {
        const pattern = `%${kw}%`
        return or(like(clientsTable.name, pattern), like(clientsTable.shopName, pattern))
      })

      const db = createDb()
      const rows = await db.select().from(clientsTable).where(and(...conditions)).limit(10)
      return roundLatLngList(rows)
    })
  }, {
    query: t.Object({ q: t.Optional(t.String({ maxLength: 200 })) }),
    response: t.Array(RawClientShape),
  })

  // --- trash list (purges run at most once/day via maybeDailyMaintenance) ---
  .get('/api/clients/trash', async () => {
    const db = createDb()
    await maybeDailyMaintenance(db)

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

    return parsed.sort((a, b) => (b as any).deletedAt - (a as any).deletedAt)
  }, {
    admin: true,
  })

  // --- trash action ---
  .post('/api/clients/trash', async ({ request, query, body }) => {
    const db = createDb()
    const action = query.action

    const id = body.id
    if (!id) return status(400, { error: 'Missing id' })

    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, `trash:v1:${id}`))
    if (!row) return status(404, { error: 'Not found' })

    if (action === 'restore') {
      let data: Record<string, unknown>
      try { data = JSON.parse(row.value) } catch { return status(422, { error: 'Corrupted trash data' }) }
      const { deletedAt, ...clientRow } = data as Record<string, unknown> & { deletedAt?: number }
      void deletedAt
      await db.insert(clientsTable).values(clientRow as any)
      await db.delete(settingsTable).where(eq(settingsTable.key, `trash:v1:${id}`))
      void logAudit(request, { action: 'client.restore', target: id })
      return { ok: true }
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
      await db.delete(settingsTable).where(eq(settingsTable.key, `trash:v1:${id}`))
      void logAudit(request, { action: 'client.force_delete', target: id })
      return { ok: true }
    }

    return status(400, { error: 'Invalid action' })
  }, {
    admin: true,
    query: t.Object({ action: t.Optional(t.String()) }),
    body: t.Object({ id: t.Optional(t.String()) }),
  })

  // --- client by id ---
  .get('/api/clients/:id', async ({ params, query }) => {
    const db = createDb()

    const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.id))
    if (!row) return status(404, { error: 'Not found' })

    if (query.raw === 'true') return row
    return roundLatLng(normalizeClient(row))
  }, {
    params: t.Object({ id: t.String() }),
    query: t.Object({ raw: t.Optional(t.String()) }),
    response: {
      200: t.Union([RawClientShape, ClientShape]),
      404: t.Object({ error: t.String() }),
    },
  })
  .put('/api/clients/:id', async ({ request, params, body }) => {
    const db = createDb()
    const data = body as Record<string, unknown>

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

    void logAudit(request, { action: 'client.update', target: params.id })
    return { ok: true }
  }, {
    admin: true,
    params: t.Object({ id: t.String() }),
    body: ClientInputShape,
  })
  .delete('/api/clients/:id', async ({ request, params }) => {
    const db = createDb()
    const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.id))
    if (!row) return status(404, { error: 'Not found' })

    const clientData = JSON.stringify({ ...row, deletedAt: Date.now() })

    await db.insert(settingsTable).values({ key: `trash:v1:${params.id}`, value: clientData }).onConflictDoNothing()
    await db.delete(clientsTable).where(eq(clientsTable.id, params.id))

    void logAudit(request, { action: 'client.delete', target: params.id })
    return { ok: true }
  }, {
    admin: true,
    params: t.Object({ id: t.String() }),
  })

  // --- profile theme ---
  .get('/api/profile/theme', async () => {
    const db = createDb()
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, 'theme'))
    const theme = rows[0]?.value ?? 'portal'
    return { theme }
  }, {
    admin: true,
    response: {
      200: t.Object({ theme: t.String() }),
      401: t.Object({ error: t.String() }),
      429: t.Object({ error: t.String() }),
    },
  })
  .put('/api/profile/theme', async ({ request, body }) => {
    const db = createDb()
    const { theme } = body

    if (typeof theme !== 'string' || !isThemeId(theme)) {
      return status(400, { error: 'Unknown theme' })
    }

    await db
      .insert(settingsTable)
      .values({ key: 'theme', value: theme })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: theme } })

    void logAudit(request, { action: 'profile.theme.update', payload: { theme } })
    return { ok: true, theme }
  }, {
    admin: true,
    body: t.Object({ theme: t.String() }),
  })

  // --- photo request ---
  // Manual body parse (not a body schema): auth must run BEFORE Elysia
  // parses a potentially 10MB JSON payload, and invalid JSON keeps its 400.
  .post('/api/photo-request', async ({ request }) => {
    const db = createDb()
    let raw: unknown
    try { raw = await request.json() } catch {
      return status(400, { error: 'Invalid request' })
    }

    const { clientId, images, deletedImages, thumbs } = raw as Record<string, unknown>

    if (typeof clientId !== 'string' || !Array.isArray(images)) {
      return status(400, { error: 'Invalid request' })
    }

    // `thumbs` is entry-aligned with `images` (null for non-base64 entries).
    if (thumbs !== undefined && (!Array.isArray(thumbs) || thumbs.length !== images.length)) {
      return status(400, { error: 'Invalid request' })
    }

    const MAX_BASE64 = Math.ceil((10 * 1024 * 1024 * 4) / 3) + 128
    for (const img of images) {
      if (typeof img !== 'string') {
        return status(400, { error: 'Invalid request' })
      }
      if (img.startsWith('data:image') && img.length > MAX_BASE64) {
        return status(413, { error: 'Image too large', maxBytes: MAX_BASE64 })
      }
    }

    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId))
    if (!client) {
      return status(404, { error: 'Client not found' })
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

    // Photo objects use a unique key per upload (P0 fix: Date.now() alone
    // collides when several images upload within the same millisecond),
    // so immutable year-long caching is safe and makes repeat list views free.
    const IMMUTABLE = 'public, max-age=31536000, immutable'
    let newUrls: string[]
    try {
      newUrls = await Promise.all(
        images.map(async (img, i): Promise<string> => {
          if (!img.startsWith('data:image')) return img
          const match = img.match(/^data:(image\/\w+);base64,(.+)$/)
          if (!match) throw new Error('Invalid base64 format')
          const ext = match[1].split('/')[1] === 'jpeg' ? 'jpg' : match[1].split('/')[1]
          const binary = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
          const base = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`
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
      return status(502, {
        error: 'Photo upload failed', detail: e instanceof Error ? e.message : String(e),
      })
    }

    const existing = Array.isArray(client.images) ? (client.images as string[]) : []
    const kept = Array.isArray(deletedImages)
      ? existing.filter((url) => !deletedImages.includes(url))
      : existing
    const merged = [...kept, ...newUrls]

    await db.update(clientsTable).set({ images: merged, updatedAt: Date.now() }).where(eq(clientsTable.id, clientId))
    return { images: merged }
  }, {
    // No body schema on purpose (see handler comment): manual parse keeps
    // auth-before-parse and the 400 shape for invalid JSON.
    admin: true,
    response: {
      200: t.Object({ images: t.Array(t.String()) }),
      400: t.Object({ error: t.String() }),
      401: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() }),
      413: t.Object({ error: t.String(), maxBytes: t.Number() }),
      429: t.Object({ error: t.String() }),
      502: t.Object({ error: t.String(), detail: t.String() }),
    },
  })

  .compile()

export type App = typeof app
export default app

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
