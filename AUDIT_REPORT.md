# Data Integrity & Health Audit — data.mcky.space

**Date:** 2026-07-31
**Scope:** D1 (SQLite) + R2 (storage) + IndexedDB (offline) data layer
**Auditor:** senior-software-engineer agent
**Status:** 🟢 3 critical issues remediated (C1, C2, C4) · 1 reclassified as by-design (C3)

## Architecture

| Layer    | Tech                                 | Holds                                    |
| -------- | ------------------------------------ | ---------------------------------------- |
| Source   | Cloudflare D1 (SQLite)               | `clients`, `suggestions`, `settings`     |
| Storage  | Cloudflare R2 (public)               | `clients/<id>/<ts>.<ext>` photos         |
| Cache    | IndexedDB (`ezzydata-offline` v2)    | `clients` TTL 30d                        |

**Lifecycle:** UI → `/api/*` → D1 + R2 → IDB cache
**Soft delete:** DELETE moves client snapshot to `settings.trash_<id>` (30-day TTL)
**Identity model:** `id` is the primary key. Two clients may share a name — separation
is by id, not by name. (See C3 below.)

## Critical Issues — REMEDIATED

### C1. Soft-delete permanently destroys R2 photos before snapshot

- **Severity:** 🔴 data loss → ✅ fixed
- **Where:** `functions/api/clients/[id].ts` (DELETE handler)
- **Flow:** DELETE → `deleteClientImages(R2)` → `JSON.stringify({...row})` → insert settings
- **Impact:** Restoring from trash yields client with `images[]` pointing to deleted R2 keys → 404 on render
- **Fix:** DELETE no longer touches R2. `force-delete` (in trash handler) now does the R2 cleanup.

### C2. Promise.allSettled in uploadClientImages leaks base64 into D1

- **Severity:** 🔴 corruption → ✅ fixed
- **Where:** `functions/lib/r2.ts`, `functions/api/photo-request.ts`, `functions/api/suggestions/[id].ts`
- **Flow:** partial upload fail → `allSettled` returns original `images[i]` (base64) → merged into D1
- **Impact:** D1 rows bloat with raw base64, JSON parsing slow, no cache hits
- **Fix:** `uploadClientImages` now uses `Promise.all` and throws on any failure. Callers return 502.

### C3. Duplicate client names (NOT A BUG — by design)

- **Severity:** originally flagged 🔴, reclassified as ✅ intentional
- **Where:** `functions/lib/schema.ts` (no unique index — correctly so)
- **Why originally flagged:** Client-side Jaro-Winkler dedup could be bypassed via direct API call.
- **Why reverted:** Product decision — clients are identified by `id`, and two distinct
  clients can legitimately share the same name (e.g. a chain, or two unrelated shops
  with the same name in different districts). The client-side fuzzy match in
  `AddClientForm` is a UX hint, not a hard rule.
- **No DB unique index added.** No application-level 409. Audit removed.

### C4. Suggestion photo-approval appends without dedup

- **Severity:** 🔴 integrity → ✅ fixed
- **Where:** `functions/api/suggestions/[id].ts` (approve action)
- **Impact:** Approve same photo suggestion 3× → 3 duplicates in `client.images` (different R2 timestamps)
- **Fix:** Skip the append if `newUrls[0]` is already in `client.images`.

## High-Priority Backlog (DEFERRED)

- **H1.** R2 bucket fully public
- **H2.** No index on `suggestions.clientId`/`status`
- **H3.** No FK between `suggestions` and `clients`
- **H4.** No Drizzle migration history (still using ad-hoc deploys)
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

## Build / deploy notes

- `pnpm run build` also copies `functions/` → `dist/functions/` so Pages
  Functions deploy with the static assets (required by `wrangler pages
  deploy`).
- `pnpm exec wrangler pages deploy ./dist --project-name=data-mcky-space`
  ships the bundle in one deploy.
- Manual deploy only — no auto-deploy on git push (per `AGENTS.md`).

## Verification Checklist (manual)

- [ ] Create client with photo → delete → restore → photos still load (C1)
- [ ] Force-delete from trash → R2 HEAD on key returns 404 (C1)
- [ ] POST two clients with the same name → both succeed (C3 by design)
- [ ] Approve same photo suggestion twice → single entry in `images` (C4)
- [ ] Simulate upload failure → D1 row has no base64, returns 502 (C2)
- [ ] `node scripts/health-check.mjs` → all green (requires Chromium)
