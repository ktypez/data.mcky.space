import { isClerkAdminToken } from '../lib/auth'

const CLERK_API_BASE = 'https://api.clerk.com/v1'

// Lightweight helpers (kept local to this file to avoid relative-import churn).
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
function unauthorized() {
  return json({ error: 'Unauthorized' }, 401)
}

/**
 * Reconciliation endpoint for the Clerk migration.
 *
 * GET  ?x-clerk-check=1 → returns whether the Clerk JWT (if auth'd) resolves
 *                         to an admin. Lets the frontend decide whether to
 *                         offer admin UI without trusting client-side only.
 *
 * POST   → 410 Gone (old password sign-in flow is gone).
 * DELETE → 410 Gone (old password sign-out flow is gone).
 */
export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { request } = context
  const { env } = context

  if (request.headers.get('x-clerk-check') === 'true') {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return json({ configured: true })

    try {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      const admin = await isClerkAdminToken(token, env as any)
      return json({ ok: true, configured: true, admin })
    } catch (err: any) {
      return json({ ok: false, error: err?.message ?? 'Invalid token' }, 401)
    }
  }

  return json({ ok: true })
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  return json({ error: 'Deprecated — use Clerk sign-in' }, 410)
}

export async function onRequestDelete(context: EventContext<Env, any, any>) {
  return json({ error: 'Deprecated — use Clerk sign-out' }, 410)
}