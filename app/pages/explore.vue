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
    <!-- Animated Analyze Button -->
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
      <UButton
        :loading="isAnalyzing"
        :disabled="isAnalyzing"
        size="xl"
        color="primary"
        variant="solid"
        icon="i-lucide-sparkles"
        class="animate-bounce hover:animate-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        @click="analyzeBuilding"
      >
        {{ isAnalyzing ? 'Analyzing...' : 'Analyze Building' }}
      </UButton>
    </div>
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

// Analysis state
const isAnalyzing = ref(false)
const toast = useToast()

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
    toast.add({
      title: 'Error',
      description: 'Views not ready. Please wait and try again.',
      color: 'error'
    })
    return
  }

  isAnalyzing.value = true

  try {
    // Capture screenshots from both views
    const cesiumScreenshot = await cesiumViewerRef.value.captureScreenshot()
    const streetViewScreenshot = await streetViewRef.value.captureScreenshot()

    // Prepare the images array for the API
    const images = [
      { url: cesiumScreenshot, detail: 'high' },
      { url: streetViewScreenshot, detail: 'high' }
    ]

    // Get current address (you might want to reverse geocode the coordinates)
    const address = `${locationStore.latitude.toFixed(6)}, ${locationStore.longitude.toFixed(6)}`

    // Call the API endpoint
    const response = await $fetch<AnalyzeBuildingResponse>('/api/analyze-building', {
      method: 'POST',
      body: {
        address,
        images
      }
    })

    if (response.success && response.data) {
      toast.add({
        title: 'Analysis Complete!',
        description: `Building has ${response.data.combined_matrix.num_floors} floors and is ${response.data.combined_matrix.architectural_style.replace(/_/g, ' ')} style.`,
        color: 'success'
      })

      // Log the full response for now
      console.log('Building Analysis:', response.data)
    } else {
      throw new Error('No data received from analysis')
    }
  } catch (error: unknown) {
    console.error('Analysis error:', error)

    // Extract detailed error message
    let errorMessage = 'Failed to analyze building. Please try again.'
    if (error && typeof error === 'object' && 'data' in error) {
      const errorData = error.data as { statusMessage?: string }
      errorMessage = errorData.statusMessage || errorMessage
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    toast.add({
      title: 'Analysis Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    isAnalyzing.value = false
  }
}

useHead({
  title: 'Explore Neighborhoods - Neighbor'
})
</script>
