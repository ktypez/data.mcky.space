import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../functions/lib/schema'

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

    CREATE TABLE suggestions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      suggested TEXT NOT NULL,
      original TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      suggested_photo TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON UPDATE no action ON DELETE cascade
    );
    CREATE INDEX suggestions_client_id_idx ON suggestions(client_id);
    CREATE INDEX suggestions_status_idx ON suggestions(status);
    CREATE INDEX suggestions_client_status_idx ON suggestions(client_id, status);

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

/** Seed a handful of clients for tests. */
export function seedClients(
  db: TestDb,
  rows: Array<{
    id: string
    name: string
    shopName?: string
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
      name: r.name,
      shopName: r.shopName ?? '',
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
