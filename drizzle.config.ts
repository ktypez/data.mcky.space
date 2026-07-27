import type { Config } from 'drizzle-kit'

export default {
  schema: './functions/lib/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
} satisfies Config
