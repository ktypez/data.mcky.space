import type { StyleSpecification } from 'maplibre-gl'
import darkStyle from './generated-map-styles/dark.json'
import lightStyle from './generated-map-styles/light.json'

export const OFFLINE_MAP_PACK_VERSION = '20260917-z14-v1'
export const OFFLINE_MAP_BOUNDS: [number, number, number, number] = [101.25, 15.75, 103.05, 17.15]
export const OFFLINE_MAP_MIN_ZOOM = 6
export const OFFLINE_MAP_MAX_ZOOM = 14

export function getOfflineMapStyle(dark: boolean): StyleSpecification {
  return structuredClone((dark ? darkStyle : lightStyle) as StyleSpecification)
}
