-- Create D1 tables (run with: npx wrangler d1 execute ezzylist-db --file=./scripts/create-tables.sql --yes)

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  images TEXT NOT NULL DEFAULT '[]',
  badge TEXT,
  note TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS clients_updated_at_idx ON clients(updated_at);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL,
  suggested TEXT NOT NULL,
  original TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
