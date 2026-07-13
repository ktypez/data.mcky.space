#!/usr/bin/env node

/**
 * Import JSON data into Cloudflare D1.
 *
 * Usage: node scripts/import-to-d1.mjs
 *
 * Requires: wrangler CLI logged in
 * Reads JSON from scripts/migration-data/
 * Writes SQL to temp files and executes via wrangler d1 execute --file
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const DB_NAME = 'ezzylist-db'
const TMP_DIR = './scripts/migration-sql'

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  if (typeof val === 'object') return sqlEscape(JSON.stringify(val))
  const str = String(val).replace(/'/g, "''")
  return `'${str}'`
}

function rowsToInserts(table, columns, rows) {
  return rows.map((row) => {
    const values = columns.map((col) => sqlEscape(row[col]))
    return `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`
  })
}

function executeSqlFile(filePath) {
  try {
    execSync(
      `npx wrangler d1 execute ${DB_NAME} --file="${filePath}" --yes --remote`,
      { stdio: 'pipe', timeout: 60000 },
    )
    return true
  } catch (err) {
    console.error(`  Batch failed: ${err.message}`)
    return false
  }
}

async function main() {
  // Ensure temp dir is clean
  mkdirSync(TMP_DIR, { recursive: true })

  const dir = './scripts/migration-data'
  const tables = ['clients', 'suggestions', 'settings']

  for (const table of tables) {
    const filePath = `${dir}/${table}.json`
    let rows
    try {
      const data = readFileSync(filePath, 'utf-8')
      rows = JSON.parse(data)
    } catch {
      console.log(`Skipping ${table}.json (not found or empty)`)
      continue
    }

    if (rows.length === 0) {
      console.log(`Skipping ${table} (empty)`)
      continue
    }

    const columns = Object.keys(rows[0])
    const sqlStatements = rowsToInserts(table, columns, rows)

    console.log(`Importing ${rows.length} rows into ${table}...`)

    // Write batches to temp SQL files (500 statements per file to be safe)
    const batchSize = 500
    for (let i = 0; i < sqlStatements.length; i += batchSize) {
      const batch = sqlStatements.slice(i, i + batchSize)
      const sqlContent = batch.join('\n')
      const tmpFile = join(TMP_DIR, `${table}_${i}.sql`)
      writeFileSync(tmpFile, sqlContent, 'utf-8')
      console.log(`  Batch ${i / batchSize + 1}/${Math.ceil(sqlStatements.length / batchSize)}...`)
      executeSqlFile(tmpFile)
    }

    console.log(`Done: ${rows.length} rows into ${table}`)
  }

  // Cleanup temp files
  rmSync(TMP_DIR, { recursive: true, force: true })

  console.log('\n✅ Migration complete! Verify with:')
  console.log(`  npx wrangler d1 execute ${DB_NAME} --command="SELECT COUNT(*) as count FROM clients" --yes --remote`)
  console.log(`  npx wrangler d1 execute ${DB_NAME} --command="SELECT COUNT(*) as count FROM suggestions" --yes --remote`)
  console.log(`  npx wrangler d1 execute ${DB_NAME} --command="SELECT * FROM settings" --yes --remote`)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
