import { createDb } from '../lib/db'
import { settings } from '../lib/schema'
import { eq } from 'drizzle-orm'
import { json } from '../lib/response'

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const db = createDb(context.env.DATABASE_URL)
  await db.delete(settings).where(eq(settings.key, 'admin_pw_hash'))
  return json({ ok: true })
}
