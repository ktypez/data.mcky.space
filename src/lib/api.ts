import { useAuthStore } from '@/stores/auth-store'

// Returns the active Clerk session JWT for backend calls (used for write-only
// API routes like /api/clients/update & /api/profile/theme).
// Returns null if no session yet (visitor is guest).
//
// Clerk's getToken() only exists inside the provider context (useAuth hook);
// AuthSync stashes it into the auth store so non-component code can call it.
export async function clerkToken(): Promise<string | null> {
  try {
    const fn = useAuthStore.getState().getToken
    return fn ? await fn() : null
  } catch {
    return null
  }
}

/**
 * Wrapper for fetch that attaches a Clerk session token as Bearer header when
 * available. It replaces the legacy `x-admin-token` header (which the old
 * password based flow used). If there is no session yet, the header is simply
 * omitted.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await clerkToken()
  const headers = {
    ...options.headers as Record<string, string>,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  return fetch(url, { ...options, headers })
}

/** Fetch the admin's saved theme from the server profile. Null on failure. */
export async function getProfileTheme(): Promise<string | null> {
  try {
    const res = await apiFetch('/api/profile/theme')
    if (!res.ok) return null
    const data = (await res.json()) as { theme?: unknown }
    return typeof data.theme === 'string' ? data.theme : null
  } catch {
    return null
  }
}

/** Persist the admin's theme choice to the server profile. */
export async function setProfileTheme(theme: string): Promise<boolean> {
  try {
    const res = await apiFetch('/api/profile/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme }),
    })
    return res.ok
  } catch {
    return false
  }
}
