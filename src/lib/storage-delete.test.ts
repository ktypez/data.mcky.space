import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { invalidateKeys, remove } = vi.hoisted(() => ({
  invalidateKeys: vi.fn(async () => ['https://data-api.fall3n.workers.dev/api/clients/list']),
  remove: vi.fn(async () => {}),
}))
vi.mock('./offline-db', () => ({
  responseStorage: { get: async () => undefined, put: async () => {}, keys: invalidateKeys, remove },
}))
vi.mock('./demo', () => ({ isDemoMode: () => false }))
vi.mock('./api', () => ({ clerkToken: async () => 'test-session-token' }))

beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })
afterEach(() => { vi.unstubAllGlobals() })

function mockApi(status = 200) {
  const requests: Request[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    requests.push(request)
    const authorized = request.headers.get('Authorization') === 'Bearer test-session-token'
    return Response.json(authorized ? { ok: true } : { error: 'Unauthorized' }, { status: authorized ? status : 401 })
  }))
  return requests
}

describe('client deletion through real Eden Treaty transport', () => {
  it('sends session authorization as a header and invalidates cache after success', async () => {
    const requests = mockApi()
    const { deleteClient } = await import('./storage')
    await expect(deleteClient('test-client')).resolves.toBeUndefined()
    expect(requests).toHaveLength(1)
    expect(requests[0].method).toBe('DELETE')
    expect(new URL(requests[0].url).pathname).toBe('/api/clients/test-client')
    expect(requests[0].headers.get('Authorization')).toBe('Bearer test-session-token')
    expect(await requests[0].text()).toBe('')
    expect(remove).toHaveBeenCalledWith('https://data-api.fall3n.workers.dev/api/clients/list')
  })

  it('keeps cached data when the server rejects deletion', async () => {
    mockApi(500)
    const { deleteClient } = await import('./storage')
    await expect(deleteClient('test-client')).rejects.toThrow('Failed to delete client')
    expect(invalidateKeys).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('also authorizes the rollback deletion when a photo upload fails', async () => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      requests.push(request)
      return Response.json(request.method === 'POST' ? { id: 'new-test-client' } : { ok: true })
    }))
    vi.stubGlobal('XMLHttpRequest', class {
      upload = {}
      status = 500
      onload?: () => void
      open() {}
      setRequestHeader() {}
      send() { this.onload?.() }
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { addClient, PHOTO_UPLOAD_ERROR } = await import('./storage')
      await expect(addClient({
        id: '', name: ['Test'], shopName: [], address: '', lat: null, lng: null,
        images: ['data:image/png;base64,test'], badge: null, notes: null, createdAt: 1, updatedAt: 1,
      })).rejects.toThrow(PHOTO_UPLOAD_ERROR)
      expect(requests.map(request => request.method)).toEqual(['POST', 'DELETE'])
      expect(requests[1].headers.get('Authorization')).toBe('Bearer test-session-token')
      expect(await requests[1].text()).toBe('')
    } finally {
      warn.mockRestore()
    }
  })
})
