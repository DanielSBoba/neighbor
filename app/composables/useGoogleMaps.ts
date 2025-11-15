// TypeScript declarations for Google Maps API
declare global {
  interface Window {
    google?: {
      maps: {
        StreetViewPanorama: new (
          container: HTMLElement,
          opts: {
            position: { lat: number; lng: number }
            pov?: { heading: number; pitch: number }
            zoom?: number
            visible?: boolean
          }
        ) => {
          setPosition: (position: { lat: number; lng: number }) => void
        }
      }
    }
  }
}

export const useGoogleMaps = () => {
  const config = useRuntimeConfig()
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const error = ref<string | null>(null)

  // Load Google Maps JavaScript API
  const loadGoogleMapsAPI = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if API is already loaded
      if (window.google && window.google.maps) {
        isLoaded.value = true
        isLoading.value = false
        error.value = null
        resolve()
        return
      }

      const apiKey = config.public.googleMapsApiKey
      if (!apiKey) {
        const err = new Error('Google Maps API key not configured')
        error.value = err.message
        isLoading.value = false
        reject(err)
        return
      }

      isLoading.value = true
      error.value = null

      // Check if script is already being loaded
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          isLoaded.value = true
          isLoading.value = false
          resolve()
        })
        existingScript.addEventListener('error', () => {
          const err = new Error('Failed to load Google Maps API')
          error.value = err.message
          isLoading.value = false
          reject(err)
        })
        return
      }

      // Create and load script
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
      script.async = true
      script.defer = true
      script.onload = () => {
        isLoaded.value = true
        isLoading.value = false
        error.value = null
        resolve()
      }
      script.onerror = () => {
        const err = new Error('Failed to load Google Maps API')
        error.value = err.message
        isLoading.value = false
        reject(err)
      }
      document.head.appendChild(script)
    })
  }

  return {
    loadGoogleMapsAPI,
    isLoading: readonly(isLoading),
    isLoaded: readonly(isLoaded),
    error: readonly(error)
  }
}

