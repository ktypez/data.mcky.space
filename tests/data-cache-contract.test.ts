import { describe, expect, it } from 'vitest'
import { clientDataEtag, etagMatches } from '../api/src/data-cache'

describe('client data cache contract', () => {
  it('keeps revision ETags stable for unchanged response shapes', () => {
    expect(clientDataEtag('/api/clients', 7)).toBe('"rev-7"')
  })

  it('changes the list validator when the response gains hasNotes and branch', () => {
    const etag = clientDataEtag('/api/clients/list', 7)
    expect(etag).toBe('"rev-7-list-notes-v2"')
    expect(etagMatches(new Request('https://example.test/api/clients/list', {
      headers: { 'If-None-Match': etag },
    }), etag)).toBe(true)
  })
})
