import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../functions/lib/schema'
import { serializeNames } from '../../functions/lib/names'

/**
 * Create a Drizzle instance backed by an in-memory SQLite database
 * with the same schema as production D1.
 *
 * Each call returns a fresh database (`:memory:`), so tests are
 * fully isolated. Foreign keys are enforced (matches D1 default
 * `PRAGMA foreign_keys = ON` set in `functions/lib/db.ts`).
 *
 * Why not D1? D1 only runs inside Cloudflare's workerd runtime —
 * we can't instantiate it in a Node test process. better-sqlite3
 * uses the same SQL dialect (D1 is SQLite under the hood) and the
 * same Drizzle query builder, so Drizzle queries are identical
 * against either backend. We trade off D1-specific features (none
 * of our queries use them) for fast, hermetic tests.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(`
    CREATE TABLE clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL,
      lng REAL,
      images TEXT NOT NULL DEFAULT '[]',
      badge TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX clients_updated_at_idx ON clients(updated_at);

    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE audit_log (
      id TEXT PRIMARY KEY,
      actor TEXT,
      action TEXT NOT NULL,
      target TEXT,
      payload TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX audit_log_created_at_idx ON audit_log(created_at);
    CREATE INDEX audit_log_action_idx ON audit_log(action);
    CREATE INDEX audit_log_target_idx ON audit_log(target);
  `)

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
  }
}

/** Type alias matching the shape of the D1 `env.DB` binding. */
export type TestDb = ReturnType<typeof createTestDb>['db']

/**
 * Storage helper mirroring production: legacy rows keep plain-string
 * name/shopName, new (multi-name) rows store JSON arrays. `serializeNames`
 * wraps single strings too, so pass arrays explicitly for the new format
 * and strings for the legacy format.
 */
function toStoredName(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return serializeNames(v)
  return v ?? ''
}

/** Seed a handful of clients for tests. */
export function seedClients(
  db: TestDb,
  rows: Array<{
    id: string
    name: string | string[]
    shopName?: string | string[]
    address?: string
    lat?: number | null
    lng?: number | null
    images?: string[]
    badge?: string | null
    notes?: string | null
    createdAt?: number
    updatedAt?: number
  }>,
) {
  for (const r of rows) {
    db.insert(schema.clients).values({
      id: r.id,
      name: toStoredName(r.name),
      shopName: toStoredName(r.shopName),
      address: r.address ?? '',
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      images: r.images ?? [],
      badge: r.badge ?? null,
      notes: r.notes ?? null,
      createdAt: r.createdAt ?? 1_700_000_000_000,
      updatedAt: r.updatedAt ?? 1_700_000_000_000,
    }).run()
  }
}
