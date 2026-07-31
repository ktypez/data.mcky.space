# Wrangler Auth Refresh Checklist

**When:** Before running any `wrangler d1 execute` / migration / direct D1 ops
**Owner:** repo maintainer
**Status:** ✅ verified working — see "Last verified" below

---

## ⚠️ Critical insight from 2026-07-31

The 7403 errors were **not** from expired OAuth. They were caused by
`CLOUDFLARE_API_TOKEN` env var taking precedence over the working OAuth.
wrangler prefers the env var when set, and that token lacked D1 scope.

**Fix for the immediate failure:** `unset CLOUDFLARE_API_TOKEN` before
running wrangler commands (or fix the token — see Part B).

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
- [ ] **A2.** **Unset any conflicting env vars first:**
  `unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID`
- [ ] **A3.** Verify identity: `pnpm exec wrangler whoami`
  - Expected: account email `keitochan@gmail.com` + Account ID `ea606a9e6ed1254ee546bd8eec192616`
- [ ] **A4.** If `whoami` fails, run `pnpm exec wrangler login`
  - Browser opens → log in with the account that owns `data-mcky.space`
  - Approve the OAuth grant
- [ ] **A5.** Verify D1 access: `pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT 1 AS ok"`
  - Expected: `{"success":true,"results":[{"ok":1}]}`

### Troubleshooting

| Symptom | Fix |
|---|---|
| Browser doesn't open | `wrangler login` requires a GUI. If on headless box, copy `~/.config/.wrangler/config/default.toml` from a machine that can do OAuth |
| "Authorization code was already redeemed" | A token already exists. Run `wrangler logout` first |
| 7403 after `unset` + whoami OK | The env token in your shell rc file (`~/.bashrc` etc.) is being re-sourced. Comment it out for this session |

### Last verified: 2026-07-31

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

The token in the env (currently `cfut_Z1Cmi...`) is rejected with **7403**
for D1 operations — either wrong account or missing scopes. Need a new
token with **D1:Edit** at minimum.

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

**Tip:** Or just use the **"Edit Cloudflare Pages"** template + add
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
- [ ] **B6.** Store it. Two options:
  - **Option A (recommended):** put in shell rc file
    ```bash
    # ~/.bashrc or ~/.zshrc
    export CLOUDFLARE_API_TOKEN=<paste-here>
    export CLOUDFLARE_ACCOUNT_ID=ea606a9e6ed1254ee546bd8eec192616
    ```
    Then `source ~/.bashrc`
  - **Option B (project-local, .env):** create `.env.local` (already in
    `.gitignore`) at the project root:
    ```
    CLOUDFLARE_API_TOKEN=<paste-here>
    CLOUDFLARE_ACCOUNT_ID=ea606a9e6ed1254ee546bd8eec192616
    ```
    Note: wrangler does not auto-load `.env.local` for the account_id,
    you'll still need to pass `--account-id` or export manually.
- [ ] **B7.** Verify D1: `curl -X POST \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database/d3f71826-3af4-4950-815a-2965fabb179b/query" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"sql":"SELECT 1 AS ok"}'`
  - Expected: `{"success":true,"result":{"results":[{"ok":1}]}}`
- [ ] **B8.** Verify Pages deploy via token (sanity):
  `CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT 1"`
- [ ] **B9.** Record the token's expiry in your calendar
- [ ] **B10.** (Optional) Revoke the old token at the same dashboard URL

### Troubleshooting

| Symptom | Fix |
|---|---|
| 7403 "account not valid" | Wrong account selected in B3, or wrong `CLOUDFLARE_ACCOUNT_ID` |
| 9109 "token too old" | TTL passed; create a new one (B1–B7) |
| 10000 "Authentication error" | Token malformed/copied wrong; re-copy |
| Token works in `curl` but not `wrangler` | wrangler uses OAuth (Part A) for its own session; the env token is only used when wrangler needs programmatic auth (rare) |

---

## Part C — Smoke test on a real D1 query

Once Part A is verified, run these. (Part B is optional — only needed
if you want to keep using `CLOUDFLARE_API_TOKEN` for CI/scripts.)

- [ ] **C1.** `pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT COUNT(*) AS clients FROM clients"`
  - Expected: `{"success":true,"result":{"results":[{"clients":368}]}}`
- [ ] **C2.** List tables: `pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"`
  - Expected: `_cf_KV`, `clients`, `settings`, `suggestions`
- [ ] **C3.** List indexes: `pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT name, tbl_name FROM sqlite_master WHERE type='index' ORDER BY tbl_name, name"`
  - Expected: `clients_updated_at_idx`, plus `sqlite_autoindex_*` for each table's primary key

### Last verified: 2026-07-31

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
pnpm exec wrangler d1 execute ezzylist-db --remote --command "<preflight query>"
# 3. Apply
pnpm exec wrangler d1 execute ezzylist-db --remote --file ./drizzle/migrations/000X_name.sql
# 4. Verify
pnpm exec wrangler d1 execute ezzylist-db --remote --command "<verify query>"
```

If the migration adds a new column/index, **D1 does not support
transactions across multiple statements in a single `wrangler d1 execute
--file` call** — split into multiple statements within the same file
(they run in a transaction) or run them one by one.

---

## Notes

- The OAuth token and API token are **independent** — refresh/rotate both
  on the same schedule (or OAuth auto-refreshes if you use it
  regularly).
- Setting `CLOUDFLARE_ACCOUNT_ID` env var avoids wrangler making an
  extra API call to look it up; the OAuth session usually remembers it.
- This checklist is one-time per token rotation. Re-run when:
  - OAuth expiry email arrives (or token hits 7403)
  - Calendar reminder fires (B9)
  - Offboarding / device change
