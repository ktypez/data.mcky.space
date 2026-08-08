import { createRemoteJWKSet, jwtVerify } from 'jose'

// ---------------------------------------------------------------------------
// Clerk-based admin authentication for the functions runtime (migrated from
// the legacy password + HMAC token flow).
//
// Flow:
//   * Frontend sends Clerk session as `Authorization: Bearer <JWT>`.
//   * We verify the JWT against Clerk's JWKS (FAPI = clerk.mcky.space).
//   * The `sub` claim is the Clerk user ID. Session tokens do NOT carry an
//     email claim by default, so we resolve the email via the Clerk Backend
//     API (https://api.clerk.com/v1/users/{id}) using env.CLERK_SECRET_KEY
//     and check it against the same admin allowlist the frontend uses
//     (src/lib/clerk-config.ts).
//   * Resolved email→user mappings are cached in memory (module scope) to
//     avoid an API round-trip on every request.
//   * Legacy `x-admin-token` / `ezzylist_token` (HMAC) is kept as a
//     transitional fallback so already-open tabs keep working until they
//     refresh into the Clerk flow.
// ---------------------------------------------------------------------------

// Clerk session token issuer — always the frontend API base.
const CLERK_ISSUER = 'https://clerk.mcky.space'
const CLERK_API_BASE = 'https://api.clerk.com/v1'

// Keep in sync with src/lib/clerk-config.ts ADMIN_EMAILS.
const ADMIN_EMAILS = new Set([
  'bankkh@gmail.com',
  'daily@mcky.space',
  'mcky@ezzy.com',
  'mcky@mcky.space',
  'papapun2707@gmail.com',
  'pitchy@ezzy.com',
])

// Remote JWKS, lazy-initialized (module-scoped cache across invocations).
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function jwks() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`))
  }
  return _jwks
}

// per-user email cache: sub -> { email, at }
const emailCache = new Map<string, { email: string; at: number }>()
const EMAIL_CACHE_TTL = 10 * 60 * 1000 // 10 min

/** Resolve a Clerk user's primary email (cached). Null if unknown. */
async function resolveUserEmail(
  sub: string,
  env: { CLERK_SECRET_KEY?: string },
): Promise<string | null> {
  const hit = emailCache.get(sub)
  if (hit && Date.now() - hit.at < EMAIL_CACHE_TTL) return hit.email
  if (!env.CLERK_SECRET_KEY) return null

  try {
    const res = await fetch(`${CLERK_API_BASE}/users/${encodeURIComponent(sub)}`, {
      headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    const user = (await res.json()) as {
      email_addresses?: { email_address: string }[]
      primary_email_address_id?: string | null
    }
    const emails = user.email_addresses ?? []
    const primary =
      emails.find((e) => e.email_address === user.primary_email_address_id) ??
      emails[0]
    const email = primary?.email_address?.trim().toLowerCase() ?? null
    if (email) emailCache.set(sub, { email, at: Date.now() })
    return email
  } catch {
    return null
  }
}

/** Verify a Clerk session JWT and return its payload, or null on failure. */
export async function verifyClerkToken(
  token: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, jwks(), { issuer: CLERK_ISSUER })
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

/** Check whether a token belongs to an admin. Caches per-user email. */
export async function isClerkAdminToken(
  token: string,
  env: { CLERK_SECRET_KEY?: string },
): Promise<boolean> {
  const payload = await verifyClerkToken(token)
  if (!payload) return false
  const sub = typeof payload.sub === 'string' ? payload.sub : ''
  if (!sub) return false
  if (env.CLERK_SECRET_KEY) {
    const email = await resolveUserEmail(sub, env)
    return !!email && ADMIN_EMAILS.has(email)
  }
  // Without a secret key we can't resolve identity — fail closed.
  return false
}

/**
 * Server-side admin check: does this request carry a valid admin identity?
 *
 *  1. `Authorization: Bearer <Clerk JWT>` → verified + email allowlisted.
 *  2. Legacy HMAC token (transitional) → verified against D1 secret.
 */
export async function isAdminRequest(
  request: Request,
  env: { CLERK_SECRET_KEY?: string; TOKEN_SECRET?: string; DB?: D1Database },
): Promise<boolean> {
  // -- Primary: Clerk session JWT ----------------------------------------
  const auth = request.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/i)
  if (m) {
    return isClerkAdminToken(m[1], env)
  }

  // -- Fallback: legacy HMAC token (transitional) ------------------------
  if (env.DB) {
    try {
      const { getTokenFromRequest, verifyToken } = await import('./auth-legacy')
      const token = getTokenFromRequest(request)
      if (!token) return false
      const { getTokenSecret } = await import('./auth-secret')
      const { createDb } = await import('./db')
      const db = createDb(env.DB)
      const secret = await getTokenSecret(db as any, env.TOKEN_SECRET || '')
      return verifyToken(token, secret)
    } catch {
      return false
    }
  }
  return false
}

// Back-compat alias — old callers use verifyTokenFromRequest(request, env, db).
// `db` is ignored now (Clerk path needs no DB; HMAC fallback re-derives it).
export async function verifyTokenFromRequest(
  request: Request,
  env: { CLERK_SECRET_KEY?: string; TOKEN_SECRET?: string; DB?: D1Database },
  _db?: unknown,
): Promise<boolean> {
  return isAdminRequest(request, env as any)
}