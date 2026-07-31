import type { Config } from 'drizzle-kit'

export default {
  schema: './functions/lib/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    // Used only by `drizzle-kit generate` / `push`. For remote D1 ops
    // (apply, execute), use `pnpm run wrangler d1 execute` so the OAuth
    // refresh-token handles auth.
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'ea606a9e6ed1254ee546bd8eec192616',
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID || 'd3f71826-3af4-4950-815a-2965fabb179b',
    token: process.env.CLOUDFLARE_API_TOKEN || '',
  },
} satisfies Config
