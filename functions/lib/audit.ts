// L1 fix: audit log helper. Append-only entries for write actions,
// auth events, and key admin operations. Never updated or deleted.
//
// Usage:
//   import { logAudit } from '../lib/audit'
//   await logAudit(env, request, { action: 'client.delete', target: id })
//
// Best-effort: failures to log are swallowed so a logging error can
// never break the main request path.

import { createDb } from './db'
import { auditLog } from './schema'
import { getClientIp } from './rate-limit'

interface AuditEntry {
  action: string
  target?: string | null
  actor?: string | null
  payload?: Record<string, unknown>
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function logAudit(
  env: { DB: D1Database },
  request: Request | null,
  entry: AuditEntry,
): Promise<void> {
  try {
    const db = createDb(env.DB)
    await db.insert(auditLog).values({
      id: genId(),
      action: entry.action,
      target: entry.target ?? null,
      actor: entry.actor ?? null,
      payload: entry.payload ?? null,
      ip: request ? getClientIp(request) : null,
      createdAt: Date.now(),
    })
  } catch (e) {
    // never let audit failures break the main path
    console.warn('audit log failed:', e instanceof Error ? e.message : String(e))
  }
}
