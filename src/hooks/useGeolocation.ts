import { useState } from 'react'
import { GEOLOCATION_TIMEOUT_MS } from '@/lib/utils'

export function useGeolocation() {
  const [locating, setLocating] = useState(false)

  const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
    if (!navigator.geolocation) {
      return Promise.resolve(null)
    }
    setLocating(true)
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false)
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          setLocating(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS },
      )
    })
  }

  return { getCurrentLocation, locating }
}
