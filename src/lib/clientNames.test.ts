import { describe, it, expect } from 'vitest'
import {
  coerceStringArray,
  normalizeClient,
  clientTitle,
  clientTitleWithShops,
  clientNamesJoined,
  clientSubNames,
  clientMatchesQuery,
} from './clientNames'

describe('coerceStringArray', () => {
  it('passes through a real array, dropping empty strings', () => {
    expect(coerceStringArray(['A', '', 'B'])).toEqual(['A', 'B'])
  })

  it('wraps a plain legacy string', () => {
    expect(coerceStringArray('Alice')).toEqual(['Alice'])
  })

  it('parses a JSON-encoded array string', () => {
    expect(coerceStringArray('["Alice","Bob"]')).toEqual(['Alice', 'Bob'])
  })

  it('returns [] for null/undefined/empty string', () => {
    expect(coerceStringArray(null)).toEqual([])
    expect(coerceStringArray(undefined)).toEqual([])
    expect(coerceStringArray('')).toEqual([])
    expect(coerceStringArray('   ')).toEqual([])
  })

  it('treats a non-array, non-string as empty', () => {
    expect(coerceStringArray(123)).toEqual([])
  })
})

describe('clientTitle', () => {
  it('prefers shopName[0] when present', () => {
    expect(clientTitle({ name: ['Alice'], shopName: ['Cafe'] })).toBe('Cafe')
  })

  it('falls back to name[0]', () => {
    expect(clientTitle({ name: ['Alice', 'Bob'], shopName: [] })).toBe('Alice')
  })

  it('returns empty string when both empty', () => {
    expect(clientTitle({ name: [], shopName: [] })).toBe('')
  })
})

describe('clientSubNames', () => {
  it('joins every remaining value with " / " (all names + remaining shops)', () => {
    expect(
      clientSubNames({ name: ['Alice', 'Somchai'], shopName: ['Cafe', 'Noodle'] }),
    ).toBe('Alice / Somchai / Noodle')
  })

  it('returns empty when there is only the title', () => {
    expect(clientSubNames({ name: ['Alice'], shopName: [] })).toBe('')
  })

  it('works when names-only and multi-value', () => {
    expect(clientSubNames({ name: ['Alice', 'Bob'], shopName: [] })).toBe('Bob')
  })
})

describe('clientTitleWithShops / clientNamesJoined (separate groups)', () => {
  it('puts all shops on the title line, names on their own line — never mixed', () => {
    const c = { name: ['aaaaa', 'bbbbb', 'cccc'], shopName: ['xxx', 'yyy', 'zzz'] }
    expect(clientTitleWithShops(c)).toBe('xxx / yyy / zzz')
    expect(clientNamesJoined(c)).toBe('aaaaa / bbbbb / cccc')
  })

  it('title falls back to first name when no shops', () => {
    const c = { name: ['aaaaa', 'bbbbb', 'cccc'], shopName: [] }
    expect(clientTitleWithShops(c)).toBe('aaaaa')
    expect(clientNamesJoined(c)).toBe('bbbbb / cccc')
  })

  it('single shop → title is just the shop, names line shows all names', () => {
    const c = { name: ['Alice'], shopName: ['Cafe'] }
    expect(clientTitleWithShops(c)).toBe('Cafe')
    expect(clientNamesJoined(c)).toBe('Alice')
  })

  it('multiple shops + single name → shops all on title, name on its own line', () => {
    const c = { name: ['Alice'], shopName: ['xxx', 'yyy', 'zzz'] }
    expect(clientTitleWithShops(c)).toBe('xxx / yyy / zzz')
    expect(clientNamesJoined(c)).toBe('Alice')
  })
})

describe('clientMatchesQuery', () => {
  it('matches any name or shopName value case-insensitively', () => {
    const c = { name: ['Alice', 'Somchai'], shopName: ['Cafe'] }
    expect(clientMatchesQuery(c, 'somchai')).toBe(true)
    expect(clientMatchesQuery(c, 'CAFE')).toBe(true)
    expect(clientMatchesQuery(c, 'alice')).toBe(true)
    expect(clientMatchesQuery(c, 'zzz')).toBe(false)
  })
})

describe('normalizeClient', () => {
  it('normalizes name/shopName and preserves other fields', () => {
    const c = normalizeClient({
      id: 'x',
      name: 'Alice',
      shopName: '["Cafe","Noodle"]',
      address: '123',
      lat: 1.5,
      lng: 2.5,
      images: ['a.png'],
      badge: null,
      notes: 'hi',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(c.name).toEqual(['Alice'])
    expect(c.shopName).toEqual(['Cafe', 'Noodle'])
    expect(c.address).toBe('123')
    expect(c.images).toEqual(['a.png'])
    expect(c.createdAt).toBe(1)
  })
})
