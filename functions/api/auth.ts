import { createDb } from '../lib/db'
import { settings } from '../lib/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, checkPassword, createToken, verifyToken, getTokenFromRequest } from '../lib/auth'
import { json, error, unauthorized } from '../lib/response'

const PASSWORD_KEY = 'admin_pw_hash'
const TOKEN_SECRET_KEY = 'token_secret'

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

  const token = getTokenFromRequest(request)
  if (token && await verifyToken(token, env.TOKEN_SECRET)) {
    return json({ ok: true })
  }
  return unauthorized()
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
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
    const token = await createToken(env.TOKEN_SECRET)
    return cookieResponse(token)
  }

  // Existing password login
  if (await checkPassword(password, currentHash)) {
    // Optionally change password
    if (typeof newPassword === 'string' && newPassword) {
      if (newPassword.length < 8) return error('Password must be at least 8 characters')
      const newHash = await hashPassword(newPassword)
      await db.update(settings).set({ value: newHash }).where(eq(settings.key, PASSWORD_KEY))
    }
    const token = await createToken(env.TOKEN_SECRET)
    return cookieResponse(token)
  }

  return error('Invalid password', 401)
}

export async function onRequestPut(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }

  const { currentPassword, newPassword } = body as Record<string, unknown>
  if (
    typeof currentPassword !== 'string' || !currentPassword ||
    typeof newPassword !== 'string' || !newPassword
  ) return error('Invalid request')

  const db = createDb(env.DB)
  const stored = await db.select().from(settings).where(eq(settings.key, PASSWORD_KEY))
  const currentHash = stored[0]?.value ?? ''

  if (!(await checkPassword(currentPassword, currentHash))) {
    return error('Current password is incorrect', 403)
  }

  if (newPassword.length < 8) return error('Password must be at least 8 characters')
  const newHash = await hashPassword(newPassword)
  await db.update(settings).set({ value: newHash }).where(eq(settings.key, PASSWORD_KEY))
  return json({ ok: true })
}

export async function onRequestDelete() {
  const res = json({ ok: true })
  res.headers.set(
    'Set-Cookie',
    'ezzylist_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
  )
  return res
}
