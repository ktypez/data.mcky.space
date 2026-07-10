import { useState } from 'react'

export function useGeolocation() {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation not available')
      return Promise.resolve(null)
    }
    setLocating(true)
    setError(null)
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false)
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          setLocating(false)
          setError('Failed to get location')
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }

  return { getCurrentLocation, locating, error, setError }
}
