import { createDb } from '../lib/db'
import { settings } from '../lib/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, checkPassword, createToken, verifyToken, getTokenFromRequest } from '../lib/auth'
import { json, error, unauthorized } from '../lib/response'
import { rateLimitAuth } from '../lib/rate-limit'
import { logAudit } from '../lib/audit'

const PASSWORD_KEY = 'admin_pw_hash'
const TOKEN_SECRET_KEY = 'token_secret'

/**
 * M3 fix: read the token signing secret from D1, falling back to the
 * wrangler-injected env var for first-time boot. The D1-stored secret
 * lets us rotate it on password change, which invalidates all
 * previously-issued tokens immediately.
 */
async function getTokenSecret(db: ReturnType<typeof createDb>, fallback: string): Promise<string> {
  const rows = await db.select().from(settings).where(eq(settings.key, TOKEN_SECRET_KEY))
  return rows[0]?.value || fallback
}

async function rotateTokenSecret(db: ReturnType<typeof createDb>, current: string): Promise<string> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  // onConflictDoUpdate replaces the existing row if any
  await db
    .insert(settings)
    .values({ key: TOKEN_SECRET_KEY, value: hex })
    .onConflictDoUpdate({ target: settings.key, set: { value: hex } })
  return hex
}

function cookieResponse(token: string) {
  const res = json({ ok: true, token })
  res.headers.set(
    'Set-Cookie',
    `ezzylist_token=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
  )
  return res
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const url = new URL(request.url)

  if (url.searchParams.get('check') === 'setup') {
    const db = createDb(env.DB)
    const stored = await db.select().from(settings).where(eq(settings.key, PASSWORD_KEY))
    return json({ configured: stored.length > 0 && stored[0].value !== '' })
  }

  const db = createDb(env.DB)
  const secret = await getTokenSecret(db, env.TOKEN_SECRET)
  const token = getTokenFromRequest(request)
  if (token && await verifyToken(token, secret)) {
    return json({ ok: true })
  }
  return unauthorized()
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  // H5 fix: rate-limit login attempts per IP
  const limited = rateLimitAuth(request)
  if (limited) return limited

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }

  const { password, newPassword } = body as Record<string, unknown>
  if (typeof password !== 'string' || !password) return error('Invalid request')

  const db = createDb(env.DB)

  // Fetch stored password hash from D1
  const stored = await db.select().from(settings).where(eq(settings.key, PASSWORD_KEY))
  const currentHash = stored[0]?.value ?? ''

  if (!currentHash) {
    // First-time setup — no password exists yet
    if (password.length < 8) return error('Password must be at least 8 characters')
    const hash = await hashPassword(password)
    await db.insert(settings).values({ key: PASSWORD_KEY, value: hash })
    const secret = await getTokenSecret(db, env.TOKEN_SECRET)
    const token = await createToken(secret)
    await logAudit(env, request, { action: 'auth.setup' })
    return cookieResponse(token)
  }

  // Existing password login
  if (await checkPassword(password, currentHash)) {
    // Optionally change password
    if (typeof newPassword === 'string' && newPassword) {
      if (newPassword.length < 8) return error('Password must be at least 8 characters')
      const newHash = await hashPassword(newPassword)
      await db.update(settings).set({ value: newHash }).where(eq(settings.key, PASSWORD_KEY))
      // M3 fix: rotate the token secret so all old tokens become invalid
      await rotateTokenSecret(db, env.TOKEN_SECRET)
      await logAudit(env, request, { action: 'auth.password_change' })
    } else {
      await logAudit(env, request, { action: 'auth.login' })
    }
    const secret = await getTokenSecret(db, env.TOKEN_SECRET)
    const token = await createToken(secret)
    return cookieResponse(token)
  }

  await logAudit(env, request, { action: 'auth.login_failed' })
  return error('Invalid password', 401)
}

export async function onRequestPut(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const db = createDb(env.DB)
  const secret = await getTokenSecret(db, env.TOKEN_SECRET)
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, secret))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }

  const { currentPassword, newPassword } = body as Record<string, unknown>
  if (
    typeof currentPassword !== 'string' || !currentPassword ||
    typeof newPassword !== 'string' || !newPassword
  ) return error('Invalid request')

  const stored = await db.select().from(settings).where(eq(settings.key, PASSWORD_KEY))
  const currentHash = stored[0]?.value ?? ''

  if (!(await checkPassword(currentPassword, currentHash))) {
    return error('Current password is incorrect', 403)
  }

  if (newPassword.length < 8) return error('Password must be at least 8 characters')
  const newHash = await hashPassword(newPassword)
  await db.update(settings).set({ value: newHash }).where(eq(settings.key, PASSWORD_KEY))
  // M3 fix: rotate the token secret on password change (PUT endpoint
  // is "change password while logged in")
  await rotateTokenSecret(db, env.TOKEN_SECRET)
  await logAudit(env, request, { action: 'auth.password_change' })
  return json({ ok: true, rotated: true })
}

export async function onRequestDelete() {
  const res = json({ ok: true })
  res.headers.set(
    'Set-Cookie',
    'ezzylist_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
  )
  return res
}
