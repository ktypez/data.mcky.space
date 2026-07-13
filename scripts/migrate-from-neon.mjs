#!/usr/bin/env node

/**
 * Migration script: Neon (Postgres) → Cloudflare D1 (SQLite)
 *
 * Usage:
 *   1. Temporarily upgrade Neon to Launch plan (or wait for reset) so DB is accessible
 *   2. Install deps:  npm install @neondatabase/serverless drizzle-orm dotenv
 *   3. Set env vars:
 *      export NEON_DATABASE_URL="postgres://..."
 *      export D1_DATABASE_ID="your-d1-db-id"
 *      export CLOUDFLARE_API_TOKEN="your-api-token"
 *      export CLOUDFLARE_ACCOUNT_ID="your-account-id"
 *   4. Run:  node scripts/migrate-from-neon.mjs
 *
 *   Or simpler: use wrangler.json to pass D1 info:
 *      npx wrangler d1 execute ezzylist-db --file=./scripts/d1-import.sql --yes
 *
 * This script reads ALL data from Neon and outputs SQL INSERT statements
 * that you can pipe into `wrangler d1 execute`.
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

// ---- Schema (mirrors D1 schema for data extraction) ----
// We only need the table names and column names to export data.
// The actual schema is in functions/lib/schema.ts

async function main() {
  const dbUrl = process.env.NEON_DATABASE_URL
  if (!dbUrl) {
    console.error('❌ Set NEON_DATABASE_URL env var')
    console.error('   export NEON_DATABASE_URL="postgresql://..."')
    process.exit(1)
  }

  console.log('🔌 Connecting to Neon...')
  const sql = neon(dbUrl)
  const db = drizzle(sql)

  // Export clients
  console.log('📦 Exporting clients...')
  const clients = await db.execute('SELECT * FROM clients ORDER BY created_at')
  const clientsJson = JSON.stringify(clients.rows)
  console.log(`   ${clients.rows.length} clients found`)

  // Export suggestions
  console.log('📦 Exporting suggestions...')
  const suggestions = await db.execute('SELECT * FROM suggestions ORDER BY created_at')
  const suggestionsJson = JSON.stringify(suggestions.rows)
  console.log(`   ${suggestions.rows.length} suggestions found`)

  // Export settings
  console.log('📦 Exporting settings...')
  const settings = await db.execute('SELECT * FROM settings')
  const settingsJson = JSON.stringify(settings.rows)
  console.log(`   ${settings.rows.length} settings found`)

  // Write JSON files for import
  const fs = await import('fs')
  const dir = './scripts/migration-data'
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(`${dir}/clients.json`, clientsJson)
  fs.writeFileSync(`${dir}/suggestions.json`, suggestionsJson)
  fs.writeFileSync(`${dir}/settings.json`, settingsJson)

  console.log(`\n✅ Data exported to ${dir}/`)
  console.log('\n📥 Now import to D1 with:')
  console.log('   node scripts/import-to-d1.mjs')
  console.log('\n   Or manually using wrangler:')
  console.log('   npx wrangler d1 execute ezzylist-db --command="INSERT ..." --yes')
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
