// M3 fix: read the token signing secret from D1, falling back to the
// wrangler-injected env var for first-time boot. The D1-stored secret
// lets us rotate it on password change, which invalidates all
// previously-issued tokens immediately.
//
// IMPORTANT: every endpoint that verifies a token MUST use this helper
// (or `verifyTokenFromRequest` from `./auth`) — verifying with the raw
// `env.TOKEN_SECRET` after a rotation will reject all post-rotation
// tokens, locking the admin out of write actions.

import { eq } from 'drizzle-orm'
import { settings } from './schema'

const TOKEN_SECRET_KEY = 'token_secret'

export async function getTokenSecret(
  db: { select: any; insert: any; update: any; delete: any },
  fallback: string,
): Promise<string> {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, TOKEN_SECRET_KEY))
  return rows[0]?.value || fallback
}

/**
 * Rotate the token secret. Returns the new hex secret so the caller
 * can use it immediately (e.g. to sign a fresh token after a password
 * change).
 */
export async function rotateTokenSecret(
  db: { select: any; insert: any; update: any; delete: any },
  current: string,
): Promise<string> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  await db
    .insert(settings)
    .values({ key: TOKEN_SECRET_KEY, value: hex })
    .onConflictDoUpdate({ target: settings.key, set: { value: hex } })
  return hex
}
