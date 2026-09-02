/// <reference types="@cloudflare/workers-types" />

declare module 'cloudflare:workers' {
  export const env: {
    DB: D1Database
    BUCKET: R2Bucket
    R2_PUBLIC_URL: string
    CLERK_SECRET_KEY?: string
  }
}
