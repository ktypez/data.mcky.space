function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('ezzylist_admin_token')
  return token ? { 'x-admin-token': token } : {}
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...authHeaders(), ...options.headers as Record<string, string> }
  return fetch(url, { ...options, headers })
}
