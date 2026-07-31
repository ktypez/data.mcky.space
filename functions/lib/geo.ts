// L2 fix: round lat/lng to ~11m precision (5 decimal places) before
// returning clients from any endpoint. This obscures exact addresses
// (privacy) without breaking map rendering — Mapbox/Leaflet both
// render correctly at 5 decimals.
//
// 5 decimals ≈ 1.1m at the equator. 6 decimals ≈ 0.11m (exact house).
// Rounding to 5 is the standard "storefront-level" precision.

const LAT_LNG_PRECISION = 5

export function roundCoord(n: number | null | undefined): number | null {
  if (n == null) return null
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  return Math.round(n * 10 ** LAT_LNG_PRECISION) / 10 ** LAT_LNG_PRECISION
}

export function roundLatLng<T extends { lat?: number | null; lng?: number | null }>(row: T): T {
  return { ...row, lat: roundCoord(row.lat), lng: roundCoord(row.lng) }
}

export function roundLatLngList<T extends { lat?: number | null; lng?: number | null }>(rows: T[]): T[] {
  return rows.map(roundLatLng)
}
