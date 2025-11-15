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
let isUpdatingFromProps = false

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

    // Listen for position changes when user navigates in Street View
    positionChangedListener = streetViewPanorama.addListener('position_changed', () => {
      if (isUpdatingFromProps) {
        return
      }

      const position = streetViewPanorama.getPosition()
      if (position) {
        const lat = position.lat()
        const lng = position.lng()

        // Only emit if position actually changed
        if (Math.abs(lat - props.latitude) > 0.0001 || Math.abs(lng - props.longitude) > 0.0001) {
          emit('positionChanged', lng, lat)
        }
      }
    })

    // Listen for POV (heading/pitch) changes
    povChangedListener = streetViewPanorama.addListener('pov_changed', () => {
      if (isUpdatingFromProps) {
        return
      }

      const pov = streetViewPanorama.getPov()
      if (pov) {
        emit('povChanged', pov.heading, pov.pitch)
      }
    })

    // Emit initial POV
    const initialPov = streetViewPanorama.getPov()
    if (initialPov) {
      emit('povChanged', initialPov.heading, initialPov.pitch)
    }
  } catch (error: any) {
    console.error('Failed to initialize Street View:', error)
  }
}

// Update Street View position
const updateStreetViewPosition = () => {
  if (!streetViewPanorama || !props.latitude || !props.longitude) {
    return
  }

  try {
    isUpdatingFromProps = true

    // Update Street View position
    streetViewPanorama.setPosition({
      lat: props.latitude,
      lng: props.longitude
    })

    // Also update the POV to face north (optional, can be adjusted)
    streetViewPanorama.setPov({
      heading: 0,
      pitch: 0
    })

    // Reset flag after a short delay to allow position_changed event to fire
    setTimeout(() => {
      isUpdatingFromProps = false
    }, 100)
  } catch (error) {
    console.warn('Failed to update Street View position:', error)
    isUpdatingFromProps = false
  }
}

// Watch for location changes
watch(() => [props.longitude, props.latitude], () => {
  updateStreetViewPosition()
}, { deep: true })

// Capture screenshot using html2canvas or similar approach
const captureScreenshot = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!streetViewContainerRef.value) {
      reject(new Error('Street View not initialized'))
      return
    }

    try {
      // Find the Street View canvas
      const canvas = streetViewContainerRef.value.querySelector('canvas') as HTMLCanvasElement
      if (!canvas) {
        reject(new Error('Street View canvas not found'))
        return
      }

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      resolve(dataUrl)
    } catch (error) {
      reject(error)
    }
  })
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
  if (positionChangedListener) {
    if (typeof positionChangedListener.remove === 'function') {
      positionChangedListener.remove()
    }
    positionChangedListener = null
  }
  if (povChangedListener) {
    if (typeof povChangedListener.remove === 'function') {
      povChangedListener.remove()
    }
    povChangedListener = null
  }
  if (streetViewPanorama) {
    streetViewPanorama = null
  }
})
</script>
