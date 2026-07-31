import { sqliteTable, text, integer, real, index, foreignKey } from 'drizzle-orm/sqlite-core'

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shopName: text('shop_name').notNull(),
  address: text('address').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  images: text('images', { mode: 'json' }).$type<string[]>().notNull().default([]),
  badge: text('badge'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
}, (table) => ({
  updatedAtIdx: index('clients_updated_at_idx').on(table.updatedAt),
}))

export const suggestions = sqliteTable('suggestions', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  suggested: text('suggested', { mode: 'json' })
    .$type<{
      name: string
      shopName: string
      address: string
      lat: number | null
      lng: number | null
    }>()
    .notNull(),
  original: text('original', { mode: 'json' })
    .$type<{
      name: string
      shopName: string
      address: string
      lat: number | null
      lng: number | null
    }>(),
  status: text('status').notNull().default('pending'),
  suggestedPhoto: text('suggested_photo'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
}, (table) => ({
  // H2 fix: pending-client-ids and per-client listing scan without these
  clientIdIdx: index('suggestions_client_id_idx').on(table.clientId),
  statusIdx: index('suggestions_status_idx').on(table.status),
  // Composite index for the common "pending for client X" filter
  clientStatusIdx: index('suggestions_client_status_idx').on(table.clientId, table.status),
  // H3 fix: enforce referential integrity. Drizzle defines it; D1 enforces
  // it when foreign_keys PRAGMA is on (handled per-connection in db.ts).
  clientFk: foreignKey({
    columns: [table.clientId],
    foreignColumns: [clients.id],
    name: 'suggestions_client_id_fk',
  }).onDelete('cascade'),
}))

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

// L1 fix: simple append-only audit log. New entries only — never updated
// or deleted. Stores action + target + actor (token id) + payload snapshot
// for forensic reconstruction.
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  actor: text('actor'),                       // token id, or 'cron', or 'system'
  action: text('action').notNull(),           // e.g. 'client.create', 'client.delete'
  target: text('target'),                     // e.g. client id, or null
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  ip: text('ip'),                             // request IP if available
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
}, (table) => ({
  createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
  actionIdx: index('audit_log_action_idx').on(table.action),
  targetIdx: index('audit_log_target_idx').on(table.target),
}))
