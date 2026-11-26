import { describe, expect, it } from 'vitest'
import { hasValidCoords } from '@/lib/utils'

describe('hasValidCoords', () => {
  it('accepts coordinates inside geographic bounds', () => {
    expect(hasValidCoords(13.7563, 100.5018)).toBe(true)
    expect(hasValidCoords(-90, 180)).toBe(true)
  })

  it('rejects missing, non-finite, and out-of-range coordinates', () => {
    expect(hasValidCoords(null, 100)).toBe(false)
    expect(hasValidCoords(Number.NaN, 100)).toBe(false)
    expect(hasValidCoords(91, 100)).toBe(false)
    expect(hasValidCoords(13, -181)).toBe(false)
  })
})
