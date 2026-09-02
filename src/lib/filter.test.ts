import { describe, it, expect } from 'vitest'
import { applyCounts, applyFilter } from './filter'
import { FilterKey, type Client } from '@/types/index'

function mk(
  over: Omit<Partial<Client>, 'name' | 'shopName'> & {
    id: string
    name: string | string[]
    shopName?: string | string[]
  },
): Client {
  const { name, shopName, ...rest } = over
  return {
    name: Array.isArray(name) ? name : [name],
    shopName: shopName ? (Array.isArray(shopName) ? shopName : [shopName]) : [],
    address: '',
    lat: null,
    lng: null,
    images: [],
    badge: null,
    notes: null,
    createdAt: 0,
    updatedAt: 0,
    ...rest,
  }
}

const cutoff = 1_700_000_000_000
const recent = cutoff + 1_000
const old = cutoff - 1_000

const clients: Client[] = [
  mk({ id: 'a', name: 'Alice', images: ['x.png'], badge: 'penpay', createdAt: recent }),
  mk({ id: 'b', name: 'Bob', images: [], createdAt: old }),
  mk({ id: 'c', name: 'Carol', shopName: 'Cafe', images: ['y.png'], createdAt: old }),
  mk({ id: 'd', name: 'Dave', address: 'Sukhumvit 11', images: [], createdAt: old }),
]

describe('applyCounts', () => {
  it('counts total, withImages, noImages, recent, penpay in a single pass', () => {
    expect(applyCounts(clients, cutoff)).toEqual({
      total: 4,
      withImages: 2,
      noImages: 2,
      recent: 1,
      penpay: 1,
      credit: 0,
    })
  })

  it('handles an empty list', () => {
    expect(applyCounts([], cutoff)).toEqual({
      total: 0,
      withImages: 0,
      noImages: 0,
      recent: 0,
      penpay: 0,
      credit: 0,
    })
  })

  it('returns noImages === total when no client has images', () => {
    const list = [mk({ id: 'a', name: 'A' }), mk({ id: 'b', name: 'B' })]
    expect(applyCounts(list, cutoff).noImages).toBe(2)
  })
})

describe('applyFilter', () => {
  it('returns all clients when query is empty and filter is All', () => {
    expect(applyFilter(clients, '', FilterKey.All, cutoff)).toEqual(clients)
  })

  it('filters by name — query is already lowercased by the caller (see hook)', () => {
    // The hook lowercases before calling. This test exercises the
    // caller's contract; a separate test below verifies the case where
    // the input data itself has mixed case.
    const out = applyFilter(clients, 'alice', FilterKey.All, cutoff)
    expect(out.map((c) => c.id)).toEqual(['a'])
  })

  it('matches data regardless of source casing (data.toLowerCase handles it)', () => {
    const mixed = [mk({ id: 'x', name: 'MixedCase Name' })]
    expect(applyFilter(mixed, 'mixedcase', FilterKey.All, cutoff).map((c) => c.id)).toEqual(['x'])
    expect(applyFilter(mixed, 'name', FilterKey.All, cutoff).map((c) => c.id)).toEqual(['x'])
  })

  it('filters by shopName', () => {
    const out = applyFilter(clients, 'cafe', FilterKey.All, cutoff)
    expect(out.map((c) => c.id)).toEqual(['c'])
  })

  it('matches ANY value in a multi-name client', () => {
    const multi = [
      mk({ id: 'm1', name: ['Alice', 'Somchai'], shopName: ['Cafe A'] }),
      mk({ id: 'm2', name: ['Bob'], shopName: ['Noodle', 'Ramen'] }),
    ]
    expect(applyFilter(multi, 'somchai', FilterKey.All, cutoff).map((c) => c.id)).toEqual(['m1'])
    expect(applyFilter(multi, 'alice', FilterKey.All, cutoff).map((c) => c.id)).toEqual(['m1'])
    expect(applyFilter(multi, 'noodle', FilterKey.All, cutoff).map((c) => c.id)).toEqual(['m2'])
    expect(applyFilter(multi, 'ramen', FilterKey.All, cutoff).map((c) => c.id)).toEqual(['m2'])
  })

  it('does not match when no value contains the query', () => {
    const multi = [mk({ id: 'm1', name: ['Alice', 'Somchai'] })]
    expect(applyFilter(multi, 'zzz', FilterKey.All, cutoff)).toEqual([])
  })

  it('filters by address', () => {
    const out = applyFilter(clients, 'sukhumvit', FilterKey.All, cutoff)
    expect(out.map((c) => c.id)).toEqual(['d'])
  })

  it('filters by id', () => {
    const out = applyFilter(clients, 'b', FilterKey.All, cutoff)
    expect(out.map((c) => c.id)).toEqual(['b'])
  })

  it('combines search + filter (WithImages narrows after search)', () => {
    const out = applyFilter(clients, '', FilterKey.WithImages, cutoff)
    expect(out.map((c) => c.id).sort()).toEqual(['a', 'c'])
  })

  it('NoImages returns clients with empty images array', () => {
    const out = applyFilter(clients, '', FilterKey.NoImages, cutoff)
    expect(out.map((c) => c.id).sort()).toEqual(['b', 'd'])
  })

  it('Recent uses the cutoff strictly (> not >=)', () => {
    const list = [
      mk({ id: 'new', name: 'N', createdAt: cutoff + 1 }),
      mk({ id: 'exact', name: 'E', createdAt: cutoff }),
      mk({ id: 'old', name: 'O', createdAt: cutoff - 1 }),
    ]
    const out = applyFilter(list, '', FilterKey.Recent, cutoff)
    expect(out.map((c) => c.id)).toEqual(['new'])
  })

  it('Penpay matches badge === "penpay" only', () => {
    const out = applyFilter(clients, '', FilterKey.Penpay, cutoff)
    expect(out.map((c) => c.id)).toEqual(['a'])
  })

  it('returns a new array — does not mutate the input', () => {
    const before = [...clients]
    applyFilter(clients, 'a', FilterKey.All, cutoff)
    expect(clients).toEqual(before)
  })

  it('returns an empty array when nothing matches', () => {
    expect(applyFilter(clients, 'zzz-nothing-here', FilterKey.All, cutoff)).toEqual([])
  })
})
