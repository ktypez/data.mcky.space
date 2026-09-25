# data.mcky.space

## Memory
Project context is stored in the shared agentmemory service under the stable project slug `data`.
- Use `memory_recall` before non-trivial work and `memory_file_history` before editing established files.
- Save durable outcomes with `memory_save`, always setting `project: "data"`.

## Stack
- Vite 8 + React 19 + TypeScript
- Tailwind CSS 4 + Zustand
- Cloudflare D1 (SQLite) + R2 storage
- MapLibre-free Leaflet map (lazy-loaded)
- Deploy: Cloudflare Pages (wrangler deploy + _routes.json static-asset routing)

## Package Manager
- **npm เท่านั้น** — เครื่องนี้ไม่มี pnpm อย่าใช้ `pnpm ...` ให้ใช้ `npm run ...` แทน
- Lockfile ที่ใช้คือ `package-lock.json` (`pnpm-lock.yaml` / `pnpm-workspace.yaml` เป็นของเหลือจากตอน dev บน Android Termux proot — อย่าใช้เป็นหลัก, ลบทิ้งได้ถ้าต้องการ)
- **npm workspaces**: `api/` เป็น workspace ของ root (`"workspaces": ["api"]`) lockfile เดียวที่ root — `api/package-lock.json` ถูกลบแล้ว อย่าสร้างใหม่
- ติดตั้งจาก root เสมอ: `npm install` (ห้าม `npm install` ค้างใน `api/` สร้าง nested `node_modules` — elysia ต้องมีก๊อปปี้เดียวที่ root ไม่งั้น Treaty typecheck แตก)

## Commands
- dev: `npm run dev`
- build: `npm run build` (vite only — เร็ว, ไม่ตรวจ types)
- build:full: `npm run typecheck && npm run build` (tsc + vite — ตรวจครบก่อน release)
- typecheck: `npm run typecheck` (`tsc --noEmit`)
- test: `npm test` (watch) / `npm run test:run` (run once)
- health: `node scripts/health-check.mjs` (ต้องมี playwright chromium; ไม่มี → fallback curl smoke test)
- deploy: `npm run deploy` (build vite + upload to Cloudflare Pages with --branch main)
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

## UI
- **DATA Ledger V3** is the only application UI. Its shell and routes live in
  `src/App.tsx`; pages are under `src/pages/`; shared components remain top-level.
- The V3 label is product version metadata only; filenames and runtime identifiers
  stay version-neutral.
- The complete catalog is virtualized and renders only the visible row window.
- Deploying from a git worktree auto-detects a non-production branch → PREVIEW deploy
  (custom domain won't update!). Always pass `--branch main`:
  `npm run wrangler -- pages deploy ./dist --project-name data-mcky-space --branch main`
- Verify deploys by comparing `index-*.js` hash between `dist/assets` and the custom
  domain — HTTP 200 alone proves nothing (SPA fallback answers 200 for every path).

## MCP Source Cite
When answering using data from an MCP server, indicate the source in square brackets at the end:
- `[source: brain]` — from brain.mcky.space
- `[source: context7]` — from library docs
