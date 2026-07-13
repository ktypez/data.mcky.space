#!/usr/bin/env node

/**
 * Find clients missing from D1 by comparing JSON source with D1 IDs.
 * Writes missing clients to a SQL file for import.
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const DB_NAME = 'ezzylist-db'

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  if (typeof val === 'object') return sqlEscape(JSON.stringify(val))
  const str = String(val).replace(/'/g, "''")
  return `'${str}'`
}

async function main() {
  // Get all existing IDs from D1
  console.log('Querying D1 for existing client IDs...')
  const result = execSync(
    `npx wrangler d1 execute ${DB_NAME} --command="SELECT id FROM clients" --yes --remote`,
    { encoding: 'utf-8', timeout: 30000 }
  )
  
  // Parse the JSON output (extract array from wrangler output)
  const match = result.match(/\[[\s\S]*\]/)
  if (!match) {
    console.error('Could not find JSON array in wrangler output')
    process.exit(1)
  }
  const parsed = JSON.parse(match[0])
  const resultObj = Array.isArray(parsed) ? parsed[0] : parsed
  const existingIds = new Set(resultObj.results.map(r => r.id))
  console.log(`Found ${existingIds.size} existing clients in D1`)

  // Load source data
  const allClients = JSON.parse(readFileSync('./scripts/migration-data/clients.json', 'utf-8'))
  console.log(`Total clients in JSON: ${allClients.length}`)

  // Find missing
  const missing = allClients.filter(c => !existingIds.has(c.id))
  console.log(`Missing clients: ${missing.length}`)

  if (missing.length === 0) {
    console.log('All clients are in D1!')
    return
  }

  // Generate SQL
  const cols = Object.keys(allClients[0])
  const sqlLines = missing.map(r => {
    const vals = cols.map(c => sqlEscape(r[c]))
    return `INSERT OR IGNORE INTO clients (${cols.join(',')}) VALUES (${vals.join(',')});`
  })

  // Write to file in chunks of 5 (SQLITE_TOOBIG limit — large image URLs)
  const BATCH = 5
  for (let i = 0; i < sqlLines.length; i += BATCH) {
    const batch = sqlLines.slice(i, i + BATCH)
    const file = `./scripts/migration-sql/missing_${i / BATCH}.sql`
    writeFileSync(file, batch.join('\n'), 'utf-8')
  }
  
  const numFiles = Math.ceil(sqlLines.length / BATCH)
  console.log(`\nWrote ${numFiles} SQL files to scripts/migration-sql/missing_*.sql`)
  console.log(`Total missing INSERT statements: ${sqlLines.length}`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
