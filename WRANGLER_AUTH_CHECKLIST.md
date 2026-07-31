# Wrangler Auth Refresh Checklist

**When:** Before running any `wrangler d1 execute` / migration / direct D1 ops
**Owner:** repo maintainer
**Status:** ⏳ pending — token expired 2026-07-29

---

## Part A — Refresh OAuth (for `wrangler` CLI)

The OAuth token at `~/.config/.wrangler/config/default.toml` expired on
**2026-07-29**. Until refreshed, every `wrangler` command that hits the
Cloudflare API returns **HTTP 7403 "account not valid"** (including
`wrangler d1 execute`, `wrangler pages deploy` *might* still work via
cached session — verify each time).

### Steps

- [ ] **A1.** Open a terminal in this repo
- [ ] **A2.** Run: `pnpm exec wrangler logout` (clears the expired token)
- [ ] **A3.** Run: `pnpm exec wrangler login`
  - Browser opens → log in with the account that owns `data-mcky.space`
  - Account ID: `ea606a9e6ed1254ee546bd8eec192616`
  - Approve the OAuth grant
- [ ] **A4.** Verify token saved: `cat ~/.config/.wrangler/config/default.toml`
  - Should show fresh `oauth_token` with `expiration_time` ≥ today
- [ ] **A5.** Verify identity: `pnpm exec wrangler whoami`
  - Expected: account email + account ID matches
- [ ] **A6.** Verify D1 access: `pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT 1"`
  - Expected: `{"success":true,"results":[{"1":1}]}`
- [ ] **A7.** Verify Pages deploy still works: `pnpm exec wrangler pages deploy --help`
  - Expected: no auth error

### Troubleshooting

| Symptom | Fix |
|---|---|
| Browser doesn't open | `wrangler login` requires a GUI. If on headless box, use SSH port-forward or do A1–A4 on a local machine, then copy `~/.config/.wrangler/config/default.toml` back |
| "Authorization code was already redeemed" | A token already exists. Run `wrangler logout` first |
| 7403 after login | Wrong account — log out and use the account that owns `data-mcky.space` (account ID `ea606a9e...`) |

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

Once both Part A and Part B are done, run a real D1 operation that
previously failed:

- [ ] **C1.** `pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT COUNT(*) AS clients FROM clients"`
  - Expected: `{"success":true,"result":{"results":[{"clients":368}]}}`
- [ ] **C2.** List tables: `pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`
  - Expected: `clients`, `suggestions`, `settings`, `_cf_KV`
- [ ] **C3.** List indexes: `pnpm exec wrangler d1 execute ezzylist-db --remote --command "SELECT name, tbl_name FROM sqlite_master WHERE type='index'"`
  - Expected: existing `clients_updated_at_idx`, possibly others

If all three pass, the auth stack is good for future migrations and
ad-hoc ops.

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
