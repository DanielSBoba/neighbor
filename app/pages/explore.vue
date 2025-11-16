<template>
  <div class="relative w-full h-[calc(100vh-200px)] min-h-[600px]">
    <USlideover
      v-model:open="isSlideoverOpen"
      side="bottom"
      :overlay="false"
      :modal="false"
      :dismissible="true"
    >
      <template #default>
        <!-- Trigger is in navbar, so this slot is empty -->
      </template>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="text-highlighted font-semibold">
              Neighborhood Explorer
            </h2>
            <p class="mt-1 text-muted text-sm">
              Adjust location coordinates, view height, and toggle 3D buildings view
            </p>
          </div>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-rotate-ccw"
            @click="resetView"
          >
            Reset View
          </UButton>
        </div>
      </template>
      <template #body>
        <LocationControls
          :longitude="locationStore.longitude"
          :latitude="locationStore.latitude"
          :height-in-feet="locationStore.heightInFeet"
          :is3-d-view="locationStore.is3DView"
          @update:longitude="locationStore.setLongitude($event)"
          @update:latitude="locationStore.setLatitude($event)"
          @update:height-in-feet="locationStore.setHeightInFeet($event)"
          @update:is3-d-view="locationStore.setIs3DView($event)"
        />
      </template>
    </USlideover>
    <div class="flex gap-4 w-full h-full">
      <div class="flex-1 h-full rounded-lg border border-default overflow-hidden bg-default">
        <CesiumViewer
          ref="cesiumViewerRef"
          :longitude="locationStore.longitude"
          :latitude="locationStore.latitude"
          :height="locationStore.heightInMeters"
          :is3-d-view="locationStore.is3DView"
          :street-view-heading="streetViewHeading"
          :street-view-pitch="streetViewPitch"
          :osm-data="osmData"
          @viewer-ready="onViewerReady"
        />
      </div>
      <div class="flex-1 h-full rounded-lg border border-default overflow-hidden bg-default">
        <StreetView
          ref="streetViewRef"
          :longitude="locationStore.longitude"
          :latitude="locationStore.latitude"
          @position-changed="handleStreetViewPositionChange"
          @pov-changed="handleStreetViewPovChange"
        />
      </div>
    </div>
    <!-- Building Analysis Drawer (from bottom) -->
    <BuildingAnalysisSidebar
      v-model:open="isAnalysisSidebarOpen"
      :analysis="analysisData"
      :osm-data="osmData"
    />
  </div>
</template>

<script setup lang="ts">
import { useLocationStore } from '../stores/location'
import type { AnalyzeBuildingResponse } from '../../types/building-analysis'

// Use location store
const locationStore = useLocationStore()

// Use composable for slideover state
const { isOpen: isSlideoverOpen } = useLocationSlideover()

const cesiumViewerRef = ref<{ captureScreenshot: () => Promise<string> } | null>(null)
const streetViewRef = ref<{ captureScreenshot: () => Promise<string> } | null>(null)

// Track Street View POV (Point of View)
const streetViewHeading = ref(0)
const streetViewPitch = ref(0)

// Analysis state - use shared state from app.vue
const isAnalyzing = useState('is-analyzing', () => false)
const { isOpen: isAnalysisSidebarOpen, analysisData, osmData, setAnalysisData, setOsmData, open: openAnalysisSidebar } = useBuildingAnalysisSidebar()

const onViewerReady = (_viewer: unknown) => {
  // Viewer is ready, can store reference if needed
}

const resetView = () => {
  locationStore.resetView()
}

const handleStreetViewPositionChange = (longitude: number, latitude: number) => {
  locationStore.setLocation(longitude, latitude)
}

const handleStreetViewPovChange = (heading: number, pitch: number) => {
  streetViewHeading.value = heading
  streetViewPitch.value = pitch
}

const analyzeBuilding = async () => {
  if (!cesiumViewerRef.value || !streetViewRef.value) {
    console.error('Views not ready. Please wait and try again.')
    return
  }

  isAnalyzing.value = true

  try {
    // Capture screenshots from both views
    const cesiumScreenshot = await cesiumViewerRef.value.captureScreenshot()
    const streetViewScreenshot = await streetViewRef.value.captureScreenshot()

    // Prepare the images array for the API (sending both screenshots)
    const images = [
      { url: cesiumScreenshot, detail: 'high' },
      { url: streetViewScreenshot, detail: 'high' }
    ]

    // Get current address using Google Geocoding API
    const { reverseGeocode } = useGeocoding()
    const address = await reverseGeocode(locationStore.latitude, locationStore.longitude)
    console.log('Using address:', address)

    // Call both endpoints in parallel
    const [buildingResponse, osmResponse] = await Promise.all([
      $fetch<AnalyzeBuildingResponse>('/api/analyze-building', {
        method: 'POST',
        body: {
          address,
          images
        }
      }),
      $fetch('/api/fetch-osm-data', {
        method: 'POST',
        body: {
          latitude: locationStore.latitude,
          longitude: locationStore.longitude,
          radius: 600
        }
      })
    ])

    // Store building analysis data
    if (buildingResponse.success && buildingResponse.data) {
      setAnalysisData(buildingResponse.data.combined_matrix)
    } else {
      throw new Error('No data received from building analysis')
    }

    // Store OSM data
    if (osmResponse.success && osmResponse.data) {
      setOsmData(osmResponse.data)
      console.log('OSM data fetched:', osmResponse.data)
    } else {
      console.warn('Failed to fetch OSM data, but continuing with analysis')
      setOsmData(null)
    }

    // Open the sidebar
    openAnalysisSidebar()
  } catch (error: unknown) {
    console.error('Analysis error:', error)
  } finally {
    isAnalyzing.value = false
  }
}

useHead({
  title: 'Explore Neighborhoods - Neighbor'
})

// Listen for analyze trigger from navbar
onMounted(() => {
  if (process.client) {
    window.addEventListener('trigger-analyze', analyzeBuilding)
  }
})

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('trigger-analyze', analyzeBuilding)
  }
})
</script>
