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
- deploy: `pnpm exec wrangler pages deploy ./dist --project-name=data-mcky-space`

## Rules
- git auto-deploy is OFF — manual wrangler deploy required
- branch: `main`

## Local
- Env: wrangler config

## MCP Source Cite
When answering using data from an MCP server, indicate the source in square brackets at the end:
- `[source: brain]` — from brain.mcky.space
- `[source: context7]` — from library docs
