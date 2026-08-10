import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'

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
