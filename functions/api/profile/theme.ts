import { createDb } from '../../lib/db'
import { settings } from '../../lib/schema'
import { eq } from 'drizzle-orm'
import { verifyTokenFromRequest } from '../../lib/auth'
import { json, error, unauthorized } from '../../lib/response'
import { logAudit } from '../../lib/audit'
import { isThemeId } from '../../lib/theme-ids'

const THEME_KEY = 'theme'
const DEFAULT_THEME = 'shadcn'

/**
 * Per-admin profile preference (single admin today → settings table).
 * GET returns the saved theme (defaults to 'shadcn'), PUT upserts it.
 */
export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const db = createDb(env.DB)
  if (!(await verifyTokenFromRequest(request, env, db))) return unauthorized()

  const rows = await db.select().from(settings).where(eq(settings.key, THEME_KEY))
  const theme = rows[0]?.value ?? DEFAULT_THEME
  return json({ theme })
}

export async function onRequestPut(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const db = createDb(env.DB)
  if (!(await verifyTokenFromRequest(request, env, db))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }

  const { theme } = (body ?? {}) as Record<string, unknown>
  if (typeof theme !== 'string' || !isThemeId(theme)) {
    return error('Unknown theme')
  }

  await db
    .insert(settings)
    .values({ key: THEME_KEY, value: theme })
    .onConflictDoUpdate({ target: settings.key, set: { value: theme } })

  await logAudit(env, request, {
    action: 'profile.theme.update',
    payload: { theme },
  })

  return json({ ok: true, theme })
}
