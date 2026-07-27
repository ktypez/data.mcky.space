# data.mcky.space

## KB
- `~/OKF/projects/data.mcky.space/agent.md` — full context (personality, stack, architecture, commands, triggers)
- `~/OKF/projects/data.mcky.space/status.md` — project status (routes, design, changelog)
- `~/OKF/system/conventions.md` — communication rules, Termux setup
- `~/OKF/system/workspace.md` — cross-project comparison, dev commands
- `~/OKF/skills/INDEX.md` — available skills

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
- deploy: `pnpm exec wrangler pages deploy ./dist --project-name=data-mcky-space`

## Rules
- git auto-deploy is OFF — manual wrangler deploy required
- branch: `main`

## Local
- Env: wrangler config
