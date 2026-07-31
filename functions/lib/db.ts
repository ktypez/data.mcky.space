import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

/**
 * Create a Drizzle client bound to a D1 binding.
 *
 * Each Pages Function invocation gets a fresh D1 connection, so
 * `PRAGMA foreign_keys = ON` must be set per-call. Without it, SQLite
 * parses FK constraints but does not enforce them.
 */
export function createDb(d1: D1Database) {
  // PRAGMA must run before any other statements on the connection.
  // D1's batched statement API runs them in a transaction, but each
  // call here is single-connection so PRAGMA applies for the lifetime
  // of the request handler.
  d1.prepare('PRAGMA foreign_keys = ON').run()
  return drizzle(d1, { schema })
}
