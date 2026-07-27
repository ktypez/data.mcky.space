#!/usr/bin/env node
// check-r2-sizes.mjs — Check image sizes in Cloudflare R2 bucket
//
// Usage: node scripts/check-r2-sizes.mjs [bucket-name]
// Default bucket: ezzylist

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const CONFIG_PATH = path.join(homedir(), '.config/.wrangler/config/default.toml')
const ACCOUNT_ID = 'ea606a9e6ed1254ee546bd8eec192616'
const DEFAULT_BUCKET = 'ezzylist'

// Parse OAuth token from wrangler config
function getOAuthToken() {
  const config = readFileSync(CONFIG_PATH, 'utf8')
  const match = config.match(/oauth_token\s*=\s*"([^"]+)"/)
  if (!match) throw new Error('Could not find oauth_token in wrangler config')
  return match[1]
}

// List objects in R2 bucket using Cloudflare API
async function listR2Objects(token, bucket, prefix = '', cursor = '') {
  const params = new URLSearchParams()
  if (prefix) params.set('prefix', prefix)
  if (cursor) params.set('cursor', cursor)
  params.set('limit', '1000')
  
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${bucket}/objects?${params}`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  if (!data.success) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`)
  }
  
  return {
    objects: data.result || [],
    cursor: data.result_info?.cursor || '',
    truncated: data.result_info?.truncated || false
  }
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Main function
async function main() {
  const bucket = process.argv[2] || DEFAULT_BUCKET
  const token = getOAuthToken()
  
  console.log(`\n📦 Listing ALL objects in R2 bucket: ${bucket}\n`)
  
  let allObjects = []
  let cursor = ''
  let hasMore = true
  
  // Fetch all objects with pagination
  let page = 0
  while (hasMore) {
    page++
    const result = await listR2Objects(token, bucket, '', cursor)
    console.log(`   Page ${page}: ${result.objects.length} objects`)
    allObjects = allObjects.concat(result.objects || [])
    cursor = result.cursor || ''
    hasMore = result.truncated || false
  }
  
  // Filter for image files
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
  const images = allObjects.filter(obj => {
    const ext = path.extname(obj.key).toLowerCase()
    return imageExtensions.includes(ext)
  })
  
  // Non-image files
  const nonImages = allObjects.filter(obj => {
    const ext = path.extname(obj.key).toLowerCase()
    return !imageExtensions.includes(ext)
  })
  
  // Categorize by size
  const under1MB = []
  const over1MB = []
  const over5MB = []
  
  for (const img of images) {
    const sizeMB = img.size / (1024 * 1024)
    if (sizeMB <= 1) {
      under1MB.push(img)
    } else {
      over1MB.push(img)
      if (sizeMB > 5) {
        over5MB.push(img)
      }
    }
  }
  
  // Sort by size (largest first)
  over1MB.sort((a, b) => b.size - a.size)
  over5MB.sort((a, b) => b.size - a.size)
  
  // Print results
  console.log(`\n📊 Summary:`)
  console.log(`   Total objects in bucket: ${allObjects.length}`)
  console.log(`   Images: ${images.length}`)
  console.log(`   Other files: ${nonImages.length}`)
  
  if (nonImages.length > 0) {
    console.log(`\n📁 Non-image files:`)
    for (const obj of nonImages) {
      console.log(`   ${formatBytes(obj.size).padStart(12)}  ${obj.key}`)
    }
  }
  console.log(`   Under 1MB: ${under1MB.length}`)
  console.log(`   Over 1MB: ${over1MB.length}`)
  console.log(`   Over 5MB: ${over5MB.length}`)
  
  if (over5MB.length > 0) {
    console.log(`\n🔴 Images over 5MB (consider optimizing):`)
    for (const img of over5MB.slice(0, 20)) {
      console.log(`   ${formatBytes(img.size).padStart(12)}  ${img.key}`)
    }
    if (over5MB.length > 20) {
      console.log(`   ... and ${over5MB.length - 20} more`)
    }
  }
  
  if (over1MB.length > 0 && over5MB.length === 0) {
    console.log(`\n🟡 Images over 1MB:`)
    for (const img of over1MB.slice(0, 20)) {
      console.log(`   ${formatBytes(img.size).padStart(12)}  ${img.key}`)
    }
    if (over1MB.length > 20) {
      console.log(`   ... and ${over1MB.length - 20} more`)
    }
  }
  
  if (under1MB.length > 0) {
    console.log(`\n🟢 Images under 1MB:`)
    for (const img of under1MB) {
      console.log(`   ${formatBytes(img.size).padStart(12)}  ${img.key}`)
    }
  }
  
  console.log('')
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
