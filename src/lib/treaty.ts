/// <reference types="@cloudflare/workers-types/experimental" />
import { treaty } from '@elysiajs/eden'
import type { App } from '../../api/src/index'
import { clerkToken } from '@/lib/api'

const WORKER_BASE = 'https://data-api.fall3n.workers.dev'

// Typed RPC client over the existing Elysia app. `App` is a type-only import
// (erased at build), so the server runtime is untouched.
export const treatyClient = treaty<App>(WORKER_BASE)

// Auth mirrors apiFetch: Clerk Bearer when a session exists, omitted for
// guests. Pass per call — inline headers win over config defaults:
//   const { data, error } = await treatyClient.api.clients.list.get({
//     headers: await treatyHeaders(),
//   })
export async function treatyHeaders(): Promise<Record<string, string>> {
  try {
    const token = await clerkToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}
