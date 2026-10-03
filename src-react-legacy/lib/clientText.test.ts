import { describe, it, expect } from 'vitest'
import { clientText, clientTextWithMaps } from './clientText'
import type { Client } from '@/types/index'

const base: Client = {
  id: 'abc123',
  name: ['Somchai'],
  shopName: ['Khao Man Gai Shop'],
  branch: '',
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
  it('leads the name and shop lines with their icons', () => {
    const out = clientText(base)
    expect(out).toBe('👤 : Somchai\n🏠 : Khao Man Gai Shop\nที่อยู่ : 123 Sukhumvit')
  })

  it('keeps the house icon on the shop line, never a storefront', () => {
    const out = clientText(base)
    expect(out).toContain('🏠')
    expect(out).not.toContain('🏪')
    expect(out).not.toContain('🏬')
  })

  it('omits shopName line when empty', () => {
    const out = clientText({ ...base, shopName: [] })
    expect(out).toBe('👤 : Somchai\nที่อยู่ : 123 Sukhumvit')
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
    expect(out).toBe('👤 : Somchai\n👤 : Somsak\nที่อยู่ : 123 Sukhumvit')
  })

  it('puts every shopName value on its own line', () => {
    const out = clientText({ ...base, shopName: ['Shop A', 'Shop B'] })
    expect(out).toBe('👤 : Somchai\n🏠 : Shop A\n🏠 : Shop B\nที่อยู่ : 123 Sukhumvit')
  })

  it('strips a ร้าน prefix the user typed — 🏠 already says it', () => {
    expect(clientText({ ...base, shopName: ['ร้านสมชาย คาเฟ่'] }))
      .toContain('🏠 : สมชาย คาเฟ่')
    expect(clientText({ ...base, shopName: ['ร้าน: กาแฟ'] }))
      .toContain('🏠 : กาแฟ')
    expect(clientText({ ...base, shopName: ['ร้าน กาแฟ'] }))
      .toContain('🏠 : กาแฟ')
  })

  it('keeps a shop name that is only the ร้าน label rather than printing it empty', () => {
    expect(clientText({ ...base, shopName: ['ร้าน'] })).toContain('🏠 : ร้าน')
  })

  it('leaves ร้าน alone when it is part of the name, not a prefix', () => {
    expect(clientText({ ...base, shopName: ['บ้านร้านอาหาร'] })).toContain('🏠 : บ้านร้านอาหาร')
  })

  it('puts the branch between the shop name and the address', () => {
    const out = clientText({ ...base, branch: 'เชียงใหม่' })
    expect(out).toBe('👤 : Somchai\n🏠 : Khao Man Gai Shop\nสาขา : เชียงใหม่\nที่อยู่ : 123 Sukhumvit')
  })

  it('does not double the สาขา label when the field already carries it', () => {
    const out = clientText({ ...base, branch: 'สาขาเชียงใหม่' })
    expect(out).toContain('สาขา : เชียงใหม่')
    expect(out).not.toContain('สาขา : สาขา')
  })

  it('omits the branch line when empty', () => {
    expect(clientText({ ...base, branch: '' })).not.toContain('สาขา')
    expect(clientText({ ...base, branch: '   ' })).not.toContain('สาขา')
    expect(clientText({ ...base, branch: 'สาขา' })).not.toContain('สาขา')
  })
})

describe('clientTextWithMaps', () => {
  it('appends a labelled maps line when coords are present', () => {
    const url = `https://maps.google.com/?q=${base.lat},${base.lng}`
    const out = clientTextWithMaps(base, (lat, lng) => `https://maps.google.com/?q=${lat},${lng}`)
    expect(out).toBe(`👤 : Somchai\n🏠 : Khao Man Gai Shop\nที่อยู่ : 123 Sukhumvit\nแผนที่ : ${url}`)
  })

  it('falls back to plain text when lat is null', () => {
    const out = clientTextWithMaps({ ...base, lat: null }, () => 'should-not-appear')
    expect(out).toBe('👤 : Somchai\n🏠 : Khao Man Gai Shop\nที่อยู่ : 123 Sukhumvit')
    expect(out).not.toContain('should-not-appear')
  })

  it('falls back to plain text when lng is null', () => {
    const out = clientTextWithMaps({ ...base, lng: null }, () => 'should-not-appear')
    expect(out).not.toContain('should-not-appear')
    expect(out).not.toContain('แผนที่')
  })
})
