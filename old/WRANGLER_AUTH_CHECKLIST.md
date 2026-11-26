# Wrangler Auth Refresh Checklist

**When:** Before running any `wrangler d1 execute` / migration / direct D1 ops
**Owner:** repo maintainer
**Status:** ✅ verified working — see "Last verified" below

---

## ⚠️ Critical insight from 2026-07-31 (and the fix that ships in 2026-07-31)

The 7403 errors were **not** from expired OAuth. They were caused by
`CLOUDFLARE_API_TOKEN` env var taking precedence over the working OAuth.
wrangler prefers the env var when set, and that token lacked D1 scope.

**The fix ships with this repo** — the `wrangler` npm script now strips
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from env before
invoking wrangler. **Always use `pnpm run wrangler ...` instead of
`pnpm exec wrangler ...`** (or call `wrangler` directly). The deploy
script also goes through this wrapper.

The OAuth `oauth_token` field showing `expiration_time` in the config is
**misleading** — that's the short-lived access_token expiry. The
`refresh_token` lives forever and wrangler auto-refreshes on every call.
No manual `wrangler login` is needed unless `wrangler logout` was run.

---

## Part A — Refresh OAuth (for `wrangler` CLI)

In normal operation, **no action needed** — the refresh_token auto-rotates
the access_token on each call. Run Part A only if you hit auth errors
_after_ unsetting `CLOUDFLARE_API_TOKEN`.

### Steps

- [ ] **A1.** Open a terminal in this repo
- [ ] **A2.** Always invoke wrangler via the project script:
  `pnpm run wrangler <subcommand> ...` — this auto-unsets the conflicting
  env vars, so you don't need to `unset` manually.
- [ ] **A3.** Verify identity: `pnpm run wrangler whoami`
  - Expected: account email `keitochan@gmail.com` + Account ID `ea606a9e6ed1254ee546bd8eec192616`
- [ ] **A4.** If `whoami` fails, run `pnpm run wrangler login`
  - Browser opens → log in with the account that owns `data.mcky.space`
  - Approve the OAuth grant
- [ ] **A5.** Verify D1 access:
  `pnpm run wrangler d1 execute ezzylist-db --remote --command "SELECT 1 AS ok"`
  - Expected: `{"success":true,"results":[{"ok":1}]}`

### Troubleshooting

| Symptom | Fix |
|---|---|
| Browser doesn't open | `wrangler login` requires a GUI. If on headless box, copy `~/.config/.wrangler/config/default.toml` from a machine that can do OAuth |
| "Authorization code was already redeemed" | A token already exists. Run `wrangler logout` first |
| 7403 with `pnpm run wrangler` (after A1) | The npm script failed to strip the env var. Check `package.json` → `scripts.wrangler` is `env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID wrangler` |

### Last verified: 2026-07-31

```
$ pnpm run wrangler whoami
👋 You are logged in with an OAuth Token, associated with the email keitochan@gmail.com.
   Account ID: ea606a9e6ed1254ee546bd8eec192616

$ pnpm run wrangler d1 execute ezzylist-db --remote --command "SELECT 1 AS ok"
   {"success":true,"results":[{"ok":1}]}
```
$ unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
$ wrangler whoami
👋 You are logged in with an OAuth Token, associated with the email keitochan@gmail.com.
   Account ID: ea606a9e6ed1254ee546bd8eec192616
$ wrangler d1 execute ezzylist-db --remote --command "SELECT 1 AS ok"
🚣 Executed 1 command in 0.14ms
   {"success":true,"results":[{"ok":1}]}
```

---

## Part B — Rotate `CLOUDFLARE_API_TOKEN` (programmatic access)

**The current env token (`cfut_Z1Cmi...`) is rejected for D1 ops** —
wrong account or missing D1 scope. As of 2026-07-31, this token is
**bypassed entirely** by the `pnpm run wrangler` wrapper, so it's
non-blocking for daily work.

**Rotate it only if** you need programmatic CI/CD access (GitHub Actions,
cron jobs, etc.) that can't go through interactive OAuth.

### Recommended scopes

For ongoing maintenance of this project (D1 + Pages + R2 ops), use a
**Custom token** with:

| Scope                         | Access | Why                                |
| ----------------------------- | ------ | ---------------------------------- |
| Account → **D1**              | Edit   | Run migrations, ad-hoc queries     |
| Account → **Workers Scripts** | Read   | Inspect deployed functions         |
| Account → **Pages**           | Edit   | Manual deploys                     |
| Account → **R2**              | Edit   | Photo cleanup, bucket inspection   |
| Account → **Account Settings**| Read   | Resolve account ID from API        |

**Tip:** Or use the **"Edit Cloudflare Pages"** template + add
`D1:Edit` and `R2:Edit` manually. Templates are easier to audit.

### Steps

- [ ] **B1.** Open https://dash.cloudflare.com/profile/api-tokens
- [ ] **B2.** Click **Create Token** → **Custom token** → **Get started**
- [ ] **B3.** Configure:
  - **Token name:** `data-mcky-space-cli` (or similar)
  - **Permissions:** as table above
  - **Account Resources:** Include → *Specific account* → `ktypez` (or
    whichever owns `data-mcky.space`)
  - **TTL:** recommend ≤ 1 year; set calendar reminder to rotate
  - **Optional:** Client IP filtering if ops happen from a known IP
- [ ] **B4.** Click **Continue to summary** → **Create Token**
- [ ] **B5.** **Copy the token now** — it shows once
- [ ] **B6.** Store it (CI secret store, NOT in your shell rc). The
  project-level `pnpm run wrangler` wrapper will **ignore** the env var
  regardless — that's the point.
- [ ] **B7.** Verify D1: `curl -X POST \
    "https://api.cloudflare.com/client/v4/accounts/ea606a9e6ed1254ee546bd8eec192616/d1/database/d3f71826-3af4-4950-815a-2965fabb179b/query" \
    -H "Authorization: Bearer <new-token>" \
    -H "Content-Type: application/json" \
    -d '{"sql":"SELECT 1 AS ok"}'`
  - Expected: `{"success":true,"result":{"results":[{"ok":1}]}}`
- [ ] **B8.** Record the token's expiry in your calendar
- [ ] **B9.** (Optional) Revoke the old token at the same dashboard URL

### Troubleshooting

| Symptom | Fix |
|---|---|
| 7403 "account not valid" | Wrong account selected in B3, or wrong account ID |
| 9109 "token too old" | TTL passed; create a new one (B1–B7) |
| 10000 "Authentication error" | Token malformed/copied wrong; re-copy |

---

## Part C — Smoke test on a real D1 query

Once Part A is verified, run these via `pnpm run wrangler` (the wrapper
auto-unsets the env var). (Part B is optional — only needed if you want
to keep using `CLOUDFLARE_API_TOKEN` for CI/scripts.)

- [ ] **C1.** `pnpm run wrangler d1 execute ezzylist-db --remote --command "SELECT COUNT(*) AS clients FROM clients"`
  - Expected: `{"success":true,"result":{"results":[{"clients":368}]}}`
- [ ] **C2.** List tables: `pnpm run wrangler d1 execute ezzylist-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"`
  - Expected: `_cf_KV`, `clients`, `settings`, `suggestions`
- [ ] **C3.** List indexes: `pnpm run wrangler d1 execute ezzylist-db --remote --command "SELECT name, tbl_name FROM sqlite_master WHERE type='index' ORDER BY tbl_name, name"`
  - Expected: `clients_updated_at_idx`, plus `sqlite_autoindex_*` for each table's primary key

### Last verified: 2026-07-31 (via `pnpm run wrangler`)

```
=== C1 ===
{"success":true,"results":[{"clients":368}]}

=== C2 ===
[{"name":"_cf_KV"},{"name":"clients"},{"name":"settings"},{"name":"suggestions"}]

=== C3 ===
[
  {"name":"clients_updated_at_idx","tbl_name":"clients"},
  {"name":"sqlite_autoindex_clients_1","tbl_name":"clients"},
  {"name":"sqlite_autoindex_settings_1","tbl_name":"settings"},
  {"name":"sqlite_autoindex_suggestions_1","tbl_name":"suggestions"}
]
```

All 3 pass. Auth stack is good for future migrations and ad-hoc ops.

### Notable: H4 backlog now verifiable

- `clients_updated_at_idx` exists → `createdAt`/`updatedAt` ordering fast ✓
- No `client_name_lower_idx` → confirms C3 was correctly reverted (no
  unique constraint was ever applied)
- No indexes on `suggestions.clientId` or `suggestions.status` →
  confirms H2 backlog item still pending

---

## Part D — (Future) Migrations

When ready to ship Drizzle migrations (H4 backlog), the workflow will be:

```bash
# 1. Write the SQL in drizzle/migrations/000X_name.sql
# 2. Pre-flight
pnpm run wrangler d1 execute ezzylist-db --remote --command "<preflight query>"
# 3. Apply
pnpm run wrangler d1 execute ezzylist-db --remote --file ./drizzle/migrations/000X_name.sql
# 4. Verify
pnpm run wrangler d1 execute ezzylist-db --remote --command "<verify query>"
```

If the migration adds a new column/index, **D1 does not support
transactions across multiple statements in a single `wrangler d1 execute
--file` call** — split into multiple statements within the same file
(they run in a transaction) or run them one by one.

---

## Notes

- **OAuth-only mode (default for this project).** The `pnpm run wrangler`
  wrapper strips `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from
  the env, so wrangler always falls back to the OAuth refresh_token in
  `~/.config/.wrangler/config/default.toml`. This is the recommended
  path for interactive work.
- The OAuth token and API token are **independent** — refresh/rotate both
  on the same schedule (or OAuth auto-refreshes if you use it
  regularly).
- Setting `CLOUDFLARE_ACCOUNT_ID` env var avoids wrangler making an
  extra API call to look it up; the OAuth session usually remembers it.
- This checklist is one-time per token rotation. Re-run when:
  - OAuth expiry email arrives (or token hits 7403 even with the wrapper)
  - Calendar reminder fires (B8)
  - Offboarding / device change
