import { describe, it, expect } from 'vitest'
import {
  coerceStringArray,
  normalizeClient,
  branchValue,
  clientTitle,
  clientTitleWithShops,
  clientShopNames,
  clientNameValues,
  clientNamesJoined,
  clientSubNames,
  clientMatchesQuery,
  clientTitleValues,
  shopNameValue,
  stripLeadingLabel,
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

describe('clientShopNames / clientNameValues (array forms)', () => {
  it('title values = all shops; name values = all names when shops exist', () => {
    const c = { name: ['aaaaa', 'bbbbb'], shopName: ['xxx', 'yyy'] }
    expect(clientShopNames(c)).toEqual(['xxx', 'yyy'])
    expect(clientNameValues(c)).toEqual(['aaaaa', 'bbbbb'])
  })

  it('no shops → title = first name, name values = the rest', () => {
    const c = { name: ['aaaaa', 'bbbbb', 'cccc'], shopName: [] }
    expect(clientShopNames(c)).toEqual(['aaaaa'])
    expect(clientNameValues(c)).toEqual(['bbbbb', 'cccc'])
  })

  it('empty when nothing to show', () => {
    expect(clientShopNames({ name: [], shopName: [] })).toEqual([])
    expect(clientNameValues({ name: [], shopName: [] })).toEqual([])
  })
})

describe('branchValue', () => {
  it('strips the label so callers can add it exactly once', () => {
    expect(branchValue('เชียงใหม่')).toBe('เชียงใหม่')
    expect(branchValue('สาขาเชียงใหม่')).toBe('เชียงใหม่')
    expect(branchValue('สาขา: เชียงใหม่')).toBe('เชียงใหม่')
    expect(branchValue('  สาขา เชียงใหม่  ')).toBe('เชียงใหม่')
  })

  it('is empty for missing or label-only values', () => {
    expect(branchValue('')).toBe('')
    expect(branchValue('   ')).toBe('')
    expect(branchValue(null)).toBe('')
    expect(branchValue(undefined)).toBe('')
    expect(branchValue('สาขา')).toBe('')
  })

  it('keeps a value that merely contains สาขา mid-string', () => {
    expect(branchValue('ตลาดสาขาใหญ่')).toBe('ตลาดสาขาใหญ่')
  })
})

describe('shopNameValue', () => {
  it('strips the ร้าน prefix the copy label already supplies', () => {
    expect(shopNameValue('ร้านสมชาย คาเฟ่')).toBe('สมชาย คาเฟ่')
    expect(shopNameValue('ร้าน: กาแฟ')).toBe('กาแฟ')
    expect(shopNameValue('ร้าน กาแฟ')).toBe('กาแฟ')
    expect(shopNameValue('  ร้านกาแฟ  ')).toBe('กาแฟ')
  })

  it('keeps the name when there is nothing left after stripping', () => {
    expect(shopNameValue('ร้าน')).toBe('ร้าน')
    expect(shopNameValue('ร้าน: ')).toBe('ร้าน:')
  })

  it('leaves ร้าน alone when it is part of the name, not a prefix', () => {
    expect(shopNameValue('บ้านร้านอาหาร')).toBe('บ้านร้านอาหาร')
    expect(shopNameValue('ร้านยา')).toBe('ยา')
  })

  it('leaves names without the prefix untouched', () => {
    expect(shopNameValue('Khao Man Gai Shop')).toBe('Khao Man Gai Shop')
    expect(shopNameValue('')).toBe('')
    expect(shopNameValue(null)).toBe('')
  })
})

describe('stripLeadingLabel', () => {
  it('only strips a leading occurrence', () => {
    expect(stripLeadingLabel('ร้าน ร้านคาเฟ่', 'ร้าน')).toBe('ร้านคาเฟ่')
    expect(stripLeadingLabel('  สาขา : เหนือ', 'สาขา')).toBe('เหนือ')
    expect(stripLeadingLabel('เชียงใหม่', 'สาขา')).toBe('เชียงใหม่')
  })
})

describe('clientTitleValues', () => {
  it('glues the branch onto the first shop name with a dash', () => {
    expect(clientTitleValues({ name: ['ชาญชัย'], shopName: ['BEYOND CAFE'], branch: 'ขอนแก่น' }))
      .toEqual(['BEYOND CAFE - ขอนแก่น'])
  })

  it('leaves the title alone when there is no branch', () => {
    expect(clientTitleValues({ name: ['Alice'], shopName: ['Cafe'] })).toEqual(['Cafe'])
    expect(clientTitleValues({ name: ['Alice'], shopName: ['Cafe'], branch: '' })).toEqual(['Cafe'])
    expect(clientTitleValues({ name: ['Alice'], shopName: ['Cafe'], branch: '   ' })).toEqual(['Cafe'])
  })

  it('keeps extra shop names after the branch so they collapse into +N', () => {
    expect(clientTitleValues({ name: [], shopName: ['Cafe A', 'Cafe B', 'Cafe C'], branch: 'เหนือ' }))
      .toEqual(['Cafe A - เหนือ', 'Cafe B', 'Cafe C'])
  })

  it('falls back to the person name when there is no shop name', () => {
    expect(clientTitleValues({ name: ['Alice'], shopName: [] })).toEqual(['Alice'])
    expect(clientTitleValues({ name: ['Alice'], shopName: [], branch: 'เหนือ' })).toEqual(['Alice - เหนือ'])
  })

  it('is empty when there is nothing to show', () => {
    expect(clientTitleValues({ name: [], shopName: [], branch: 'เหนือ' })).toEqual([])
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

  it('matches branch case-insensitively', () => {
    const c = { name: ['Alice'], shopName: ['Cafe'], branch: 'สาขาเชียงใหม่' }
    expect(clientMatchesQuery(c, 'เชียง')).toBe(true)
    expect(clientMatchesQuery(c, 'สาขา')).toBe(true)
    expect(clientMatchesQuery(c, 'phuket')).toBe(false)
  })

  it('never matches on an empty branch for a non-matching query', () => {
    const c = { name: ['Alice'], shopName: ['Cafe'], branch: '' }
    expect(clientMatchesQuery(c, 'zzz')).toBe(false)
  })
})

describe('normalizeClient', () => {
  it('normalizes name/shopName and preserves other fields', () => {
    const c = normalizeClient({
      id: 'x',
      name: 'Alice',
      shopName: '["Cafe","Noodle"]',
      branch: '  สาขาเชียงใหม่  ',
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
    expect(c.branch).toBe('สาขาเชียงใหม่')
    expect(c.address).toBe('123')
    expect(c.images).toEqual(['a.png'])
    expect(c.createdAt).toBe(1)
  })
})
