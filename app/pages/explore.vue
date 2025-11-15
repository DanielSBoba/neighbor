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
            <h2 class="text-highlighted font-semibold">Neighborhood Explorer</h2>
            <p class="mt-1 text-muted text-sm">Adjust location coordinates, view height, and toggle 3D buildings view</p>
          </div>
          <UButton
            @click="resetView"
            color="neutral"
            variant="outline"
            icon="i-lucide-rotate-ccw"
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
          :longitude="locationStore.longitude"
          :latitude="locationStore.latitude"
          @position-changed="handleStreetViewPositionChange"
          @pov-changed="handleStreetViewPovChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLocationStore } from '../stores/location'

// Use location store
const locationStore = useLocationStore()

// Use composable for slideover state
const { isOpen: isSlideoverOpen } = useLocationSlideover()

const cesiumViewerRef = ref<any>(null)

// Track Street View POV (Point of View)
const streetViewHeading = ref(0)
const streetViewPitch = ref(0)

const onViewerReady = (viewer: any) => {
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

useHead({
  title: 'Explore Neighborhoods - Neighbor'
})
</script>

