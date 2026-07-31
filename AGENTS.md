# data.mcky.space

## KB
Project context is stored in Second Brain (brain.mcky.space via secondbrain MCP).
Use `recall` to retrieve context, `remember` to save new info.
- `recall query="data.mcky.space project"` — tech stack, architecture
- `recall query="data.mcky.space agent"` — personality, triggers, commands
- Tags: `data.mcky.space`, `project`

## Stack
- Vite 7 + React 19 + TypeScript
- Tailwind CSS 4 + Zustand
- Cloudflare D1 (SQLite) + R2 storage
- MapLibre GL JS (lazy-loaded)
- Deploy: Cloudflare Pages (manual wrangler deploy)

## Commands
- dev: `pnpm dev`
- build: `pnpm run build`
- health: `node scripts/health-check.mjs`
- deploy: `pnpm run deploy` (alias for `pnpm run wrangler -- pages deploy ./dist --project-name data-mcky-space`)
- wrangler any: `pnpm run wrangler <subcmd>` (auto-unsets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` to force OAuth)
- health: `node scripts/health-check.mjs`

## Auth
- **OAuth-only.** Always use `pnpm run wrangler ...` (not `pnpm exec wrangler ...`).
- The `wrangler` script strips `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` from env
  before invoking wrangler, so wrangler falls back to the OAuth refresh-token
  in `~/.config/.wrangler/config/default.toml`. Avoids HTTP 7403 when
  `CLOUDFLARE_API_TOKEN` is set but lacks the required scope (D1, R2, etc).
- See `WRANGLER_AUTH_CHECKLIST.md` for token rotation + smoke test steps.
- **Token rotation on password change (M3):** changing the admin password
  rotates the `token_secret` in D1, which **immediately invalidates all
  existing admin tokens** (browser cookies + `x-admin-token` headers).
  The admin will be forced to log in again. This is by design — it
  prevents old session cookies from surviving a password reset.

## Rules
- git auto-deploy is OFF — manual `pnpm run deploy` required
- branch: `main`

## MCP Source Cite
When answering using data from an MCP server, indicate the source in square brackets at the end:
- `[source: brain]` — from brain.mcky.space
- `[source: context7]` — from library docs
