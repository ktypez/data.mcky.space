/// <reference types="@cloudflare/workers-types/experimental" />
import { treaty } from '@elysiajs/eden'
import type { App } from '../../api/src/index'
import { clerkToken } from '@/lib/api'

const WORKER_BASE = 'https://data-api.fall3n.workers.dev'

// Typed RPC client over the existing Elysia app. `App` is a type-only import
// (erased at build), so the server runtime is untouched.
export const treatyClient = treaty<App>(WORKER_BASE)

// Auth mirrors the old apiFetch: Clerk Bearer when a session exists, omitted
// for guests. Pass per call on admin routes — inline headers win over config:
//   await treatyClient.api.clients.list.get({ headers: await treatyHeaders() })
export async function treatyHeaders(idempotencyKey?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  try {
    const token = await clerkToken()
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    // An unauthenticated request will be rejected by the API gate.
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  return headers
}
