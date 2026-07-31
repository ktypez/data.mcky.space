// H5 fix: lightweight in-memory rate limiter for /api/auth.
//
// The password hashing is PBKDF2-SHA256 with 100k iterations — slow
// enough to make a brute-force meaningful only if many requests get
// through. We cap to 10 attempts per IP per 5 minutes.
//
// Note: Pages Functions can run on multiple instances. In-memory state
// is per-instance, so the effective limit is N×configured. For a
// single-admin tool, this is acceptable. For production-grade
// cross-instance limiting, swap the Map for a Cloudflare KV counter.
//
// IMPORTANT: Cloudflare Workers forbids setInterval/setTimeout at global
// scope. Cleanup is therefore opportunistic — runs on every Nth call.

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Cleanup every Nth call to keep the map small without a timer.
let callsSinceCleanup = 0
const CLEANUP_EVERY_N = 200

function maybeCleanup() {
  callsSinceCleanup++
  if (callsSinceCleanup < CLEANUP_EVERY_N) return
  callsSinceCleanup = 0
  const now = Date.now()
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k)
  }
}

function check(key: string, cfg: RateLimitConfig): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + cfg.windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  bucket.count++
  if (bucket.count > cfg.maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfter: 0 }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export function rateLimitAuth(request: Request): Response | null {
  maybeCleanup()
  const cfg: RateLimitConfig = { windowMs: 5 * 60 * 1000, maxRequests: 10 }
  const ip = getClientIp(request)
  const result = check(`auth:${ip}`, cfg)
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests', retryAfter: result.retryAfter }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
        },
      },
    )
  }
  return null
}
