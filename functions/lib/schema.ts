import { pgTable, text, real, bigint, jsonb, index } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shopName: text('shop_name').notNull(),
  address: text('address').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  badge: text('badge'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
}, (table) => ({
  updatedAtIdx: index('clients_updated_at_idx').on(table.updatedAt),
}))

export const suggestions = pgTable('suggestions', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  suggested: jsonb('suggested')
    .$type<{
      name: string
      shopName: string
      address: string
      lat: number | null
      lng: number | null
    }>()
    .notNull(),
  original: jsonb('original')
    .$type<{
      name: string
      shopName: string
      address: string
      lat: number | null
      lng: number | null
    }>()
    .notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
