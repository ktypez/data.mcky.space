# data.mcky.space

## KB
Project context is stored in Second Brain (brain.mcky.space via secondbrain MCP).
Use `recall` to retrieve context, `remember` to save new info.
- `recall query="data.mcky.space project"` — tech stack, architecture
- `recall query="data.mcky.space agent"` — personality, triggers, commands
- Tags: `data.mcky.space`, `project`

## Stack
- Vite 8 + React 19 + TypeScript
- Tailwind CSS 4 + Zustand
- Cloudflare D1 (SQLite) + R2 storage
- MapLibre GL JS (lazy-loaded)
- Deploy: Cloudflare Pages (manual wrangler deploy)

## Package Manager
- **npm เท่านั้น** — เครื่องนี้ไม่มี pnpm อย่าใช้ `pnpm ...` ให้ใช้ `npm run ...` แทน
- Lockfile ที่ใช้คือ `package-lock.json` (`pnpm-lock.yaml` / `pnpm-workspace.yaml` เป็นของเหลือจากตอน dev บน Android Termux proot — อย่าใช้เป็นหลัก, ลบทิ้งได้ถ้าต้องการ)

## Commands
- dev: `npm run dev`
- build: `npm run build` (vite only — เร็ว, ไม่ตรวจ types)
- build:full: `npm run build:full` (tsc + vite — ตรวจครบก่อน release)
- typecheck: `npm run typecheck` (`tsc --noEmit`)
- test: `npm test` (watch) / `npm run test:run` (run once — 70 tests)
- health: `node scripts/health-check.mjs` (ต้องมี playwright chromium; ไม่มี → fallback curl smoke test)
- deploy: `npm run deploy` (alias for `npm run wrangler -- pages deploy ./dist --project-name data-mcky-space`)
- wrangler any: `npm run wrangler <subcmd>` (auto-unsets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` to force OAuth)

## Auth
- **OAuth-only.** Always use `npm run wrangler ...` (not `npm exec wrangler ...`).
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
- git auto-deploy is OFF — manual `npm run deploy` required
- branch: `main`

## UI Versions (v1 classic / v2 registry)
- `src/v2/**` — parallel "registry" redesign UI. Self-contained: pages, components,
  styles (`v2.css` token scope under `.v2-shell`), tests. Entry: early-return branch
  in `src/App.tsx` for `/v2*`; classic routes below it stay untouched.
- Everything outside `src/v2/` = classic v1 UI.
- v2 light/dark is private to the shell (localStorage `ezzylist-v2-mode`) — never
  touches the global theme engine, `themes.ts`, or the boot script.
- Deploying from a git worktree auto-detects a non-production branch → PREVIEW deploy
  (custom domain won't update!). Always pass `--branch main`:
  `npm run wrangler -- pages deploy ./dist --project-name data-mcky-space --branch main`
- Verify deploys by comparing `index-*.js` hash between `dist/assets` and the custom
  domain — HTTP 200 alone proves nothing (SPA fallback answers 200 for every path).

## MCP Source Cite
When answering using data from an MCP server, indicate the source in square brackets at the end:
- `[source: brain]` — from brain.mcky.space
- `[source: context7]` — from library docs
