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
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
