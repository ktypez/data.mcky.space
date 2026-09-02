import { describe, it, expect } from 'vitest'
import { clientText, clientTextWithMaps } from './clientText'
import type { Client } from '@/types/index'

const base: Client = {
  id: 'abc123',
  name: ['Somchai'],
  shopName: ['Khao Man Gai Shop'],
  address: '123 Sukhumvit',
  lat: 13.7563,
  lng: 100.5018,
  images: [],
  badge: null,
  notes: null,
  createdAt: 0,
  updatedAt: 0,
}

describe('clientText', () => {
  it('includes name, shopName, and address with emoji prefixes', () => {
    const out = clientText(base)
    expect(out).toBe('👤 : Somchai\n🏠 : Khao Man Gai Shop\n📍 : 123 Sukhumvit')
  })

  it('omits shopName line when empty', () => {
    const out = clientText({ ...base, shopName: [] })
    expect(out).toBe('👤 : Somchai\n📍 : 123 Sukhumvit')
  })

  it('omits address line when empty', () => {
    const out = clientText({ ...base, address: '' })
    expect(out).toBe('👤 : Somchai\n🏠 : Khao Man Gai Shop')
  })

  it('returns just the name when both shopName and address are empty', () => {
    const out = clientText({ ...base, shopName: [], address: '' })
    expect(out).toBe('👤 : Somchai')
  })

  it('treats null shopName/address the same as empty', () => {
    const out = clientText({ ...base, shopName: [], address: '' })
    const outNull = clientText({ ...base, shopName: null as unknown as string[], address: null as unknown as string })
    expect(out).toBe(outNull)
  })

  it('puts every name value on its own line', () => {
    const out = clientText({ ...base, name: ['Somchai', 'Somsak'], shopName: [] })
    expect(out).toBe('👤 : Somchai\n👤 : Somsak\n📍 : 123 Sukhumvit')
  })

  it('puts every shopName value on its own line', () => {
    const out = clientText({ ...base, shopName: ['Shop A', 'Shop B'] })
    expect(out).toBe('👤 : Somchai\n🏠 : Shop A\n🏠 : Shop B\n📍 : 123 Sukhumvit')
  })
})

describe('clientTextWithMaps', () => {
  it('appends a maps line when coords are present', () => {
    const url = `https://maps.google.com/?q=${base.lat},${base.lng}`
    const out = clientTextWithMaps(base, (lat, lng) => `https://maps.google.com/?q=${lat},${lng}`)
    expect(out).toBe(`👤 : Somchai\n🏠 : Khao Man Gai Shop\n📍 : 123 Sukhumvit\n🗺️ : ${url}`)
  })

  it('falls back to plain text when lat is null', () => {
    const out = clientTextWithMaps({ ...base, lat: null }, () => 'should-not-appear')
    expect(out).toBe('👤 : Somchai\n🏠 : Khao Man Gai Shop\n📍 : 123 Sukhumvit')
    expect(out).not.toContain('should-not-appear')
  })

  it('falls back to plain text when lng is null', () => {
    const out = clientTextWithMaps({ ...base, lng: null }, () => 'should-not-appear')
    expect(out).not.toContain('should-not-appear')
  })
})
