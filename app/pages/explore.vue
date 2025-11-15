<template>
  <div class="relative w-full h-[calc(100vh-200px)] min-h-[600px]">
    <div class="absolute top-5 left-5 z-[1000] max-w-[320px]">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary" />
            <h3 class="text-lg font-semibold">Neighborhood Explorer</h3>
          </div>
        </template>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Location</label>
            <div class="flex gap-2">
              <UInput
                v-model.number="longitude"
                type="number"
                placeholder="Longitude"
                step="0.0001"
                class="flex-1"
                icon="i-lucide-navigation"
              />
              <UInput
                v-model.number="latitude"
                type="number"
                placeholder="Latitude"
                step="0.0001"
                class="flex-1"
                icon="i-lucide-map-pin"
              />
            </div>
            <p class="text-xs text-muted mt-1">Enter coordinates or use the map controls</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">View Height</label>
            <UInput
              v-model.number="heightInFeet"
              type="number"
              placeholder="Height (ft)"
              step="10"
              icon="i-lucide-move-vertical"
            />
            <p class="text-xs text-muted mt-1">Default: 300 ft - Top-down view</p>
          </div>
          <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div class="flex flex-col">
              <span class="text-sm font-medium">3D Buildings</span>
              <span class="text-xs text-muted">Photorealistic view</span>
            </div>
            <USwitch
              v-model="is3DView"
            />
          </div>
          <UButton
            @click="resetView"
            color="neutral"
            variant="outline"
            block
            icon="i-lucide-rotate-ccw"
          >
            Reset View
          </UButton>
        </div>
      </UCard>
    </div>
    <CesiumViewer
      ref="cesiumViewerRef"
      :longitude="longitude"
      :latitude="latitude"
      :height="heightInMeters"
      :is3-d-view="is3DView"
      @viewer-ready="onViewerReady"
    />
  </div>
</template>

<script setup lang="ts">
const longitude = ref(-73.9553126)
const latitude = ref(40.7200922)
// Height stored in feet, converted to meters for Cesium
const heightInFeet = ref(300) // Default: 300 feet
const is3DView = ref(true) // Toggle between 3D buildings and planar map

// Convert feet to meters (1 foot = 0.3048 meters)
const heightInMeters = computed(() => heightInFeet.value * 0.3048)

const cesiumViewerRef = ref<any>(null)

const onViewerReady = (viewer: any) => {
  // Viewer is ready, can store reference if needed
}

const resetView = () => {
  longitude.value = -73.9553126
  latitude.value = 40.7200922
  heightInFeet.value = 300 // Default height: 300 feet
}

useHead({
  title: 'Explore Neighborhoods - Neighbor'
})
</script>

