import { GEOLOCATION_TIMEOUT_MS } from '@/lib/utils'

export function createGeolocation() {
  let locating = $state(false)

  const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
    if (!navigator.geolocation) return Promise.resolve(null)
    locating = true
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locating = false
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          locating = false
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS },
      )
    })
  }

  return {
    getCurrentLocation,
    get locating() {
      return locating
    },
  }
}
