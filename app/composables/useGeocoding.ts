/**
 * Composable for reverse geocoding using Google Maps JavaScript API
 */
export const useGeocoding = () => {
  /**
   * Reverse geocode coordinates to get street address
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Formatted street address or coordinates as fallback
   */
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // Check if Google Maps API is loaded
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps API not loaded yet, using coordinates')
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      }

      // Use Google Maps Geocoder (client-side)
      const geocoder = new window.google.maps.Geocoder()
      const latlng = { lat: latitude, lng: longitude }

      const result = await new Promise<string>((resolve) => {
        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            console.log('Geocoding success:', results[0].formatted_address)
            resolve(results[0].formatted_address)
          } else {
            console.warn('Geocoding failed:', status)
            resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          }
        })
      })

      return result
    } catch (error) {
      console.error('Error reverse geocoding:', error)
      // Fallback to coordinates if geocoding fails
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }
  }

  return {
    reverseGeocode
  }
}
