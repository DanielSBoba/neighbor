<template>
  <div class="w-full h-full relative">
    <div
      ref="streetViewContainerRef"
      class="w-full h-full"
    />
    <div
      v-if="streetViewError"
      class="absolute inset-0 flex items-center justify-center bg-muted"
    >
      <div class="text-center p-4">
        <UIcon
          name="i-lucide-alert-circle"
          class="w-8 h-8 text-muted mb-2 mx-auto"
        />
        <p class="text-sm text-muted">
          {{ streetViewError }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  longitude: number
  latitude: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  positionChanged: [longitude: number, latitude: number]
  povChanged: [heading: number, pitch: number]
}>()

// Use Google Maps composable
const { loadGoogleMapsAPI, error: googleMapsError } = useGoogleMaps()

const streetViewContainerRef = ref<HTMLElement | null>(null)
const streetViewError = computed(() => googleMapsError.value)
let streetViewPanorama: any = null
let positionChangedListener: any = null
let povChangedListener: any = null
let panoChangedListener: any = null
let isUpdatingFromProps = false
let isRestoringPov = false
let lastKnownPov: { heading: number, pitch: number } | null = null

// Initialize Street View Panorama
const initStreetView = async () => {
  if (!streetViewContainerRef.value) return

  try {
    await loadGoogleMapsAPI()

    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API not available')
    }

    streetViewPanorama = new window.google.maps.StreetViewPanorama(
      streetViewContainerRef.value,
      {

        position: { lat: props.latitude, lng: props.longitude },
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        visible: true
      }
    )

    // Restore saved heading when panorama changes (e.g., clicking navigation arrows)
    panoChangedListener = streetViewPanorama.addListener('pano_changed', () => {
      if (isUpdatingFromProps || !lastKnownPov) return

      isRestoringPov = true
      const savedPov = { ...lastKnownPov }

      // Restore POV immediately and on next frame to handle async rendering
      streetViewPanorama.setPov(savedPov)
      requestAnimationFrame(() => {
        if (streetViewPanorama) {
          streetViewPanorama.setPov(savedPov)
          isRestoringPov = false
        }
      })
    })

    // Emit position changes when user navigates in Street View
    positionChangedListener = streetViewPanorama.addListener('position_changed', () => {
      if (isUpdatingFromProps) return

      const position = streetViewPanorama.getPosition()
      if (!position) return

      const lat = position.lat()
      const lng = position.lng()

      // Only emit if position actually changed
      if (Math.abs(lat - props.latitude) > 0.0001 || Math.abs(lng - props.longitude) > 0.0001) {
        emit('positionChanged', lng, lat)
      }
    })

    // Track and emit POV (heading/pitch) changes
    povChangedListener = streetViewPanorama.addListener('pov_changed', () => {
      if (isUpdatingFromProps || isRestoringPov) return

      const pov = streetViewPanorama.getPov()
      if (!pov) return

      lastKnownPov = { heading: pov.heading, pitch: pov.pitch }
      emit('povChanged', pov.heading, pov.pitch)
    })

    // Emit initial POV
    const initialPov = streetViewPanorama.getPov()
    if (initialPov) {
      lastKnownPov = { heading: initialPov.heading, pitch: initialPov.pitch }
      emit('povChanged', initialPov.heading, initialPov.pitch)
    }
  } catch (error: any) {
    console.error('Failed to initialize Street View:', error)
  }
}

// Update Street View position when props change
const updateStreetViewPosition = () => {
  if (!streetViewPanorama || !props.latitude || !props.longitude) return

  isUpdatingFromProps = true
  
  streetViewPanorama.setPosition({
    lat: props.latitude,
    lng: props.longitude
  })

  // Preserve current POV instead of resetting to default
  // (removed setPov call)

  setTimeout(() => {
    isUpdatingFromProps = false
  }, 100)
}

// Watch for location changes
watch(() => [props.longitude, props.latitude], () => {
  updateStreetViewPosition()
}, { deep: true })

// Capture screenshot using Google Static Street View API
const captureScreenshot = async (): Promise<string> => {
  if (!streetViewPanorama) {
    throw new Error('Street View not initialized')
  }

  try {
    // Get current position and POV
    const position = streetViewPanorama.getPosition()
    const pov = streetViewPanorama.getPov()
    
    if (!position) {
      throw new Error('Street View position not available')
    }

    const lat = position.lat()
    const lng = position.lng()
    const heading = Math.round(pov.heading)
    const pitch = Math.round(pov.pitch)
    const fov = 90 // Field of view

    // Get Google Maps API key from runtime config
    const config = useRuntimeConfig()
    const apiKey = config.public.googleMapsApiKey

    if (!apiKey) {
      throw new Error('Google Maps API key not configured')
    }

    // Build Static Street View API URL
    const size = '800x600'
    const url = `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${apiKey}`

    // Fetch the image and convert to base64
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch Street View image')
    }

    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Failed to capture Street View screenshot:', error)
    throw error
  }
}

// Expose methods to parent
defineExpose({
  captureScreenshot
})

onMounted(async () => {
  await nextTick()
  await initStreetView()
})

onUnmounted(() => {
  // Clean up event listeners
  const listeners = [positionChangedListener, povChangedListener, panoChangedListener]
  listeners.forEach(listener => {
    if (listener && typeof listener.remove === 'function') {
      listener.remove()
    }
  })

  // Clear references
  streetViewPanorama = null
})
</script>
