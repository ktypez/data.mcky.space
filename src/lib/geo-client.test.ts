import { describe, it, expect } from 'vitest'
import { haversineKm } from '../old/lib/geo-client'

// Reference distances computed independently and cross-checked with
// https://www.movable-type.co.uk/scripts/latlong.html (within 0.5 km).
describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(13.7563, 100.5018, 13.7563, 100.5018)).toBe(0)
  })

  it('matches the Bangkok → Singapore great-circle (~1430 km)', () => {
    // BKK: 13.7563, 100.5018 — SIN: 1.3521, 103.8198
    const km = haversineKm(13.7563, 100.5018, 1.3521, 103.8198)
    expect(km).toBeGreaterThan(1420)
    expect(km).toBeLessThan(1440)
  })

  it('matches the London → Paris great-circle (~344 km)', () => {
    // LON: 51.5074, -0.1278 — PAR: 48.8566, 2.3522
    const km = haversineKm(51.5074, -0.1278, 48.8566, 2.3522)
    expect(km).toBeGreaterThan(340)
    expect(km).toBeLessThan(350)
  })

  it('is symmetric — order of points does not change the result', () => {
    const ab = haversineKm(40.7128, -74.006, 34.0522, -118.2437)
    const ba = haversineKm(34.0522, -118.2437, 40.7128, -74.006)
    expect(ab).toBe(ba)
  })

  it('handles negative coordinates (southern + western hemisphere)', () => {
    // Sydney: -33.8688, 151.2093 — São Paulo: -23.5505, -46.6333
    // Actual great-circle: ~13,357 km. Bounded loosely so the test
    // catches a 2× error without being a moving target.
    const km = haversineKm(-33.8688, 151.2093, -23.5505, -46.6333)
    expect(km).toBeGreaterThan(13300)
    expect(km).toBeLessThan(13400)
  })

  it('handles antipodal points (~half the Earth circumference)', () => {
    // North pole vs. south pole through the equator — should be ~20015 km
    const km = haversineKm(90, 0, -90, 0)
    expect(km).toBeGreaterThan(20000)
    expect(km).toBeLessThan(20020)
  })
})
