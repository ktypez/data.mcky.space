import { useCallback } from 'react'
import { useClientStore } from '@/stores/client-store'
import { useUIStore } from '@/old/stores/ui-store'
import { hasValidCoords, GEOLOCATION_TIMEOUT_MS } from '@/lib/utils'
import { haversineKm } from '@/old/lib/geo-client'
import type { RouteData } from '@/types/index'

function buildRoute(
  origin: { lat: number; lng: number },
  selected: ReturnType<typeof useClientStore.getState>['clients'],
): RouteData {
  const withDist = selected
    .map((c) => ({ client: c, dist: haversineKm(origin.lat, origin.lng, c.lat!, c.lng!) }))
    .sort((a, b) => a.dist - b.dist)
  return { origin, clients: withDist }
}

/**
 * Plan a driving route from the user's current location to the
 * currently-selected clients, or from manually-entered coordinates
 * if geolocation fails / is denied.
 */
export function useRoutePlanner() {
  const planRoute = useCallback(async () => {
    const { clients, selectedIds } = useClientStore.getState()
    const selected = clients.filter(
      (c) => selectedIds.has(c.id) && hasValidCoords(c.lat, c.lng),
    )
    const ui = useUIStore.getState()
    if (selected.length === 0) {
      ui.setRouteError('Selected clients have no location')
      ui.setRouteData(null)
      return
    }
    ui.setRouting(true)
    ui.setRouteError('')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: GEOLOCATION_TIMEOUT_MS,
        }),
      )
      const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      const next = useUIStore.getState()
      next.setRouteData(buildRoute(origin, selected))
      next.setShowManualOrigin(false)
    } catch {
      useUIStore.getState().setShowManualOrigin(true)
    } finally {
      useUIStore.getState().setRouting(false)
    }
  }, [])

  const handleManualOrigin = useCallback(() => {
    const { manualOriginLat, manualOriginLng } = useUIStore.getState()
    const lat = parseFloat(manualOriginLat)
    const lng = parseFloat(manualOriginLng)
    const ui = useUIStore.getState()
    if (
      isNaN(lat) || isNaN(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
      ui.setRouteError('Invalid coordinates')
      return
    }
    const { clients, selectedIds } = useClientStore.getState()
    const selected = clients.filter(
      (c) => selectedIds.has(c.id) && hasValidCoords(c.lat, c.lng),
    )
    ui.setRouteData(buildRoute({ lat, lng }, selected))
    ui.setShowManualOrigin(false)
  }, [])

  return { planRoute, handleManualOrigin }
}
