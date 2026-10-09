# data.mcky.space

## Memory
Project context is stored in the shared agentmemory service under the stable project slug `data`.
- Use `memory_recall` before non-trivial work and `memory_file_history` before editing established files.
- Save durable outcomes with `memory_save`, always setting `project: "data"`.

## Stack
- Vite 8 + Svelte 5 + TypeScript (React ถูกเขียนใหม่ทั้งหมด — React ตัวเก่าอยู่ที่ tag `archive/react-final-2026-10-03`)
- Tailwind CSS 4 + Zustand (ผ่าน shim `src/stores/create-store.ts` ที่ใช้ `writable` + `getState`/`setState`)
- Cloudflare D1 (SQLite) + R2 storage
- MapLibre-free Leaflet map (lazy-loaded)
- Deploy: Cloudflare Pages (wrangler deploy + _routes.json static-asset routing)
- **Map tiles**: Stadia `alidade_smooth` / `alidade_smooth_dark`, needs `VITE_MAP_API_KEY`
  (gitignored `.env.local`). ไม่มี key → `getTileUrl` ตกไปใช้ raster ของ OSM ที่ไม่มีสไตล์มืด
  (ดู `tilePaneFilter` ใน `src/lib/map-styles.ts`)

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
- perf: `npm run measure:perf` — cold + warm start timings on the built `dist/`.
  Needs a server first (`npx vite preview --port 4178`). Pass `--stub-api` to
  serve fake client data over CDP, otherwise the catalog renders its error
  state and LCP measures the error string instead of real rows. `--repeat N`
  (default 3) runs each visit type N times in throwaway browser profiles and
  reports medians; webfont races make single runs swing by over a second.

## Map picker
`scripts/map-e2e.mjs` drives a real Chromium over CDP against a throwaway
`map-e2e/` harness (mounts `LocationSection`, geolocation pinned via
`Emulation.setGeolocationOverride`) and asserts the pin renders and lands at
the viewport centre. It runs **two** cases — one fix inside the province, one
far outside it. Both must pass; testing only an in-province fix hides the
`maxBounds` failure. **Recreate the harness before running** — it is not
committed:

```sh
mkdir -p map-e2e   # index.html + main.ts + Harness.svelte mounting LocationSection
npx vite --port 5199 --strictPort --host 127.0.0.1 &
node scripts/map-e2e.mjs
```

The harness page has no Tailwind, so `index.html` must inline `.h-48`/`.w-full`
or the Leaflet container collapses to 0 height and every position assert is vacuous.

Gotcha: the map components set **no `maxBounds`** (`MapPicker`, `MapPreview`,
`Maps`). A clamp makes Leaflet refuse to pan to any coordinate outside the
region, so `get location` updates the lat/long readout while the pin stays
thousands of pixels off-screen. If a region limit is ever reintroduced, it must
expand to contain the incoming fix.

Gotcha: in `MapPicker.svelte` the `map` variable must stay `$state`. Leaflet is
dynamically imported, so a plain `let` lets the coords `$effect` run once while
`map` is still `null` and never re-run — no pin, no pan, while the lat/long
readout still updates correctly. Plain `let` for `layer`/`marker`/`lib` is fine
because only the effect reads them.

## Browser PWA checks
`scripts/check-pwa-browser.mjs`, `check-pwa-offline-data.mjs` and
`check-pwa-update-browser.mjs` drive a real Chromium over CDP and assume an
**empty browser profile** — a profile carrying a service worker from a previous
build leaves the new worker waiting and the check times out at "activation
timeout". Start one per run:

```sh
npx vite preview --port 4178 &        # check-pwa-browser.mjs only
chromium --headless --no-sandbox --remote-debugging-port=9429 \
  --user-data-dir="$(mktemp -d)" about:blank &
```

`check-pwa-update-browser.mjs` sleeps 61s on purpose (Workbox ignores updates
within 60s), so give it a generous timeout.

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
  `src/App.svelte`; pages are under `src/pages/`; shared components remain top-level.
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
