function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('ezzylist_admin_token')
  return token ? { 'x-admin-token': token } : {}
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...authHeaders(), ...options.headers as Record<string, string> }
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
