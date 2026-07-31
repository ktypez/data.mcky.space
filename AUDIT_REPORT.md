# Data Integrity & Health Audit — data.mcky.space

**Date:** 2026-07-31
**Scope:** D1 (SQLite) + R2 (storage) + IndexedDB (offline) data layer
**Auditor:** senior-software-engineer agent
**Status:** 🔴 4 critical issues found — C1–C4 remediated

## Architecture

| Layer    | Tech                                 | Holds                                    |
| -------- | ------------------------------------ | ---------------------------------------- |
| Source   | Cloudflare D1 (SQLite)               | `clients`, `suggestions`, `settings`     |
| Storage  | Cloudflare R2 (public)               | `clients/<id>/<ts>.<ext>` photos         |
| Cache    | IndexedDB (`ezzydata-offline` v2)    | `clients` TTL 30d                        |

**Lifecycle:** UI → `/api/*` → D1 + R2 → IDB cache
**Soft delete:** DELETE moves client snapshot to `settings.trash_<id>` (30-day TTL)

## Critical Issues — REMEDIATED

### C1. Soft-delete permanently destroys R2 photos before snapshot

- **Severity:** 🔴 data loss
- **Where:** `functions/api/clients/[id].ts:51-57`
- **Flow:** DELETE → `deleteClientImages(R2)` → `JSON.stringify({...row})` → insert settings
- **Impact:** Restoring from trash yields client with `images[]` pointing to deleted R2 keys → 404 on render
- **Fix:** Move R2 deletion to `force-delete` only. DELETE = pure soft-delete.

### C2. Promise.allSettled in uploadClientImages leaks base64 into D1

- **Severity:** 🔴 corruption
- **Where:** `functions/lib/r2.ts:49-52`, `functions/api/photo-request.ts:36-46`
- **Flow:** partial upload fail → `allSettled` returns original `images[i]` (base64) → merged into D1
- **Impact:** D1 rows bloat with raw base64, JSON parsing slow, no cache hits
- **Fix:** Throw on upload failure; filter to URL-only results before D1 merge.

### C3. No DB-level uniqueness on client name

- **Severity:** 🔴 integrity
- **Where:** `functions/lib/schema.ts:3-17` (no unique index)
- **Impact:** Client-side Jaro-Winkler check is bypassable via direct API call
- **Fix:** `CREATE UNIQUE INDEX clients_name_lower_idx ON clients(lower(name))` + 409 on conflict

### C4. Suggestion photo-approval appends without dedup

- **Severity:** 🔴 integrity
- **Where:** `functions/api/suggestions/[id].ts:37-45`
- **Impact:** Approve same photo suggestion 3× → 3 duplicates in `client.images` (different R2 timestamps)
- **Fix:** Check `newUrls[0]` not already in `client.images` before appending.

## High-Priority Backlog (DEFERRED)

- **H1.** R2 bucket fully public
- **H2.** No index on `suggestions.clientId`/`status`
- **H3.** No FK between `suggestions` and `clients`
- **H4.** Empty `drizzle/migrations/` (no migration history) — partially addressed: C3 migration added
- **H5.** No rate limit on `/api/auth`

## Medium-Priority Backlog (DEFERRED)

- **M1.** Trash cleanup requires manual trigger (no cron)
- **M2.** `refresh()` doesn't fall back to IDB
- **M3.** Password change doesn't revoke old tokens
- **M4.** IDB TTL purge only on `getAllClients`
- **M5.** Settings table key-bag with `LIKE 'trash_%'`
- **M6.** `compressImage` not called on all upload paths

## Low-Priority Backlog (DEFERRED)

- **L1.** No audit log
- **L2.** lat/lng full precision (PII)
- **L3.** No DB-level image size limit
- **L4.** POST accepts arbitrary `createdAt`

## Migration Log

| Version | Name                          | Date       | Notes                                    |
| ------- | ----------------------------- | ---------- | ---------------------------------------- |
| 0001    | unique_client_name_lower_idx  | 2026-07-31 | C3 — unique `lower(name)`, needs apply   |

### Applying the C3 migration to production D1

The C3 fix has two parts: (a) the SQL migration, (b) application-level 409
pre-checks. The pre-checks are already deployed with this build. The SQL
migration must be applied manually after deploy:

```bash
# Pre-flight: confirm no existing duplicates
wrangler d1 execute ezzylist-db --remote --command \
  "SELECT lower(name) AS lname, COUNT(*) AS cnt FROM clients GROUP BY lower(name) HAVING cnt > 1"

# If no rows returned, apply the migration
wrangler d1 execute ezzylist-db --remote --file \
  ./drizzle/migrations/0001_unique_client_name_lower_idx.sql
```

If duplicates are found, resolve them first (rename or merge) — the index
creation will fail otherwise.

## Build / deploy notes

- `pnpm run build` now also copies `functions/` → `dist/functions/` so
  Pages Functions deploy with the static assets (required by `wrangler
  pages deploy`).
- `pnpm exec wrangler pages deploy ./dist --project-name=data-mcky-space`
  ships the bundle + the C3 pre-checks in the same deploy.

## Verification Checklist (manual)

- [ ] Create client with photo → delete → restore → photos still load (C1)
- [ ] Force-delete from trash → R2 HEAD on key returns 404 (C1)
- [ ] POST duplicate name (different case) → 409 (C3)
- [ ] Approve same photo suggestion twice → single entry in `images` (C4)
- [ ] Simulate upload failure → D1 row has no base64, returns 502 (C2)
- [ ] Run C3 migration SQL on remote D1 (see above)
- [ ] `node scripts/health-check.mjs` → all green (requires Chromium)
