#!/usr/bin/env node

/**
 * Import missing clients one-by-one using individual SQL statements.
 * Uses wrangler d1 execute with small SQL files (1 client per file).
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs'
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

function runWrangler(sqlFile) {
  try {
    execSync(
      `npx wrangler d1 execute ${DB_NAME} --file="${sqlFile}" --yes --remote`,
      { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    )
    return true
  } catch (err) {
    return false
  }
}

function getCount() {
  const result = execSync(
    `npx wrangler d1 execute ${DB_NAME} --command="SELECT COUNT(*) as count FROM clients" --yes --remote`,
    { encoding: 'utf-8', timeout: 15000 }
  )
  const m = result.match(/"count":\s*(\d+)/)
  return m ? parseInt(m[1]) : -1
}

function getExistingIds() {
  const result = execSync(
    `npx wrangler d1 execute ${DB_NAME} --command="SELECT id FROM clients" --yes --remote`,
    { encoding: 'utf-8', timeout: 30000 }
  )
  const match = result.match(/\[[\s\S]*\]/)
  if (!match) return new Set()
  const parsed = JSON.parse(match[0])
  const resultObj = Array.isArray(parsed) ? parsed[0] : parsed
  return new Set(resultObj.results.map(r => r.id))
}

async function main() {
  // Load source data
  const allClients = JSON.parse(readFileSync('./scripts/migration-data/clients.json', 'utf-8'))
  console.log(`Source: ${allClients.length} clients`)

  // Get existing IDs
  console.log('Querying existing IDs...')
  const existingIds = getExistingIds()
  console.log(`D1 has ${existingIds.size} clients`)

  // Find missing
  const missing = allClients.filter(c => !existingIds.has(c.id))
  console.log(`Missing: ${missing.length}`)

  if (missing.length === 0) {
    console.log('All clients imported!')
    return
  }

  // Get columns from first client
  const cols = Object.keys(allClients[0])

  // Import one at a time
  let imported = 0
  for (const client of missing) {
    const vals = cols.map(c => sqlEscape(client[c]))
    const sql = `INSERT OR IGNORE INTO clients (${cols.join(',')}) VALUES (${vals.join(',')});`
    
    const tmpFile = `./scripts/migration-sql/one_${client.id}.sql`
    writeFileSync(tmpFile, sql, 'utf-8')
    
    const ok = runWrangler(tmpFile)
    try { unlinkSync(tmpFile) } catch {}
    
    if (ok) {
      imported++
    }
    
    if ((imported + (existingIds.size)) % 10 === 0 || imported === missing.length) {
      process.stdout.write(`\r  Imported ${imported}/${missing.length}...`)
    }
  }
  console.log()

  // Final count
  const finalCount = getCount()
  console.log(`\nFinal D1 client count: ${finalCount}`)
  console.log(`Imported: ${imported} new clients`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
