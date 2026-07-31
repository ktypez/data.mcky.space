// L1 fix: audit log helper. Append-only entries for write actions,
// auth events, and key admin operations.
//
// Retention: 90 days. Old entries are purged by `purgeOldAuditLog()`,
// which is wired into the M1 lazy-cleanup hook (trash list GET).
// The audit_log_created_at_idx makes the DELETE efficient.
//
// Usage:
//   import { logAudit, purgeOldAuditLog } from '../lib/audit'
//   await logAudit(env, request, { action: 'client.delete', target: id })
//   await purgeOldAuditLog(env)
//
// Best-effort: failures to log are swallowed so a logging error can
// never break the main request path.

import { createDb } from './db'
import { auditLog } from './schema'
import { getClientIp } from './rate-limit'
import { lt } from 'drizzle-orm'

export const AUDIT_LOG_RETENTION_DAYS = 90
const AUDIT_LOG_RETENTION_MS = AUDIT_LOG_RETENTION_DAYS * 86_400_000

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

/**
 * Delete audit_log entries older than AUDIT_LOG_RETENTION_DAYS.
 * Returns the number of rows deleted (0 if none expired).
 *
 * Best-effort: errors are swallowed so cleanup never breaks the
 * triggering request. The audit_log_created_at_idx keeps the
 * underlying DELETE efficient.
 */
export async function purgeOldAuditLog(env: { DB: D1Database }): Promise<number> {
  try {
    const db = createDb(env.DB)
    const cutoff = Date.now() - AUDIT_LOG_RETENTION_MS
    const deleted = await db
      .delete(auditLog)
      .where(lt(auditLog.createdAt, cutoff))
      .returning({ id: auditLog.id })
    return deleted.length
  } catch (e) {
    console.warn('audit log purge failed:', e instanceof Error ? e.message : String(e))
    return 0
  }
}
