<template>
  <div class="relative w-full h-[calc(100vh-200px)] min-h-[600px]">
    <div class="absolute top-5 left-5 z-[1000] max-w-[300px]">
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
              />
              <UInput
                v-model.number="latitude"
                type="number"
                placeholder="Latitude"
                step="0.0001"
                class="flex-1"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Height</label>
            <div class="flex items-center gap-2">
              <UInput
                v-model.number="height"
                type="number"
                placeholder="Height (m)"
                step="3.048"
                class="flex-1"
              />
              <span class="text-sm text-muted whitespace-nowrap">{{ heightInFeet }} ft</span>
            </div>
            <p class="text-xs text-muted mt-1">Default: 300 ft (~91m)</p>
          </div>
          <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div class="flex flex-col">
              <span class="text-sm font-medium">3D View</span>
              <span class="text-xs text-muted">With buildings</span>
            </div>
            <UToggle
              v-model="is3DView"
              @update:model-value="toggleViewMode"
            />
          </div>
          <UButton
            @click="flyToLocation"
            color="primary"
            block
          >
            Fly to Location
          </UButton>
          <UButton
            @click="resetView"
            color="neutral"
            variant="outline"
            block
          >
            Reset View
          </UButton>
        </div>
      </UCard>
    </div>
    <div class="flex gap-4 w-full h-full">
      <div
        id="cesium-container"
        class="flex-1 h-full cesium-viewer"
      />
      <div class="flex-1 h-full relative bg-muted rounded-lg overflow-hidden">
        <div class="absolute top-2 right-2 z-10">
          <UCard class="p-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-map" class="w-4 h-4 text-primary" />
              <span class="text-sm font-medium">Street View</span>
            </div>
          </UCard>
        </div>
        <iframe
          :src="streetViewUrl"
          class="w-full h-full border-0"
          allowfullscreen
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

// Set Cesium base URL for assets
if (typeof window !== 'undefined') {
  ;(window as any).CESIUM_BASE_URL = '/Cesium/'
}

const config = useRuntimeConfig()
const longitude = ref(-73.9553126)
const latitude = ref(40.7200922)
// Default height: 300 feet = ~91.44 meters
const height = ref(91.44) // Height in meters (default: 300 feet)
const is3DView = ref(true) // Toggle between 3D and flat map

// Convert meters to feet for display (1 meter = 3.28084 feet)
const heightInFeet = computed(() => Math.round(height.value * 3.28084))

// Generate Google Street View URL based on current location
const streetViewUrl = computed(() => {
  if (!latitude.value || !longitude.value) {
    return ''
  }
  // Use Google Street View embed URL format
  // This creates a Street View panorama at the specified coordinates
  const lat = latitude.value
  const lng = longitude.value
  // Use the Google Street View embed format
  // Format: https://www.google.com/maps/@LAT,LNG,ZOOMa,TILTy,HEADINGh,PITCHt/data=...
  // This format works in iframes and shows Street View panoramas
  return `https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s${lat}!2s${lng}!4v1!5m2!1e1!4e1`
})

let viewer: Cesium.Viewer | null = null
let tileset: Cesium.Cesium3DTileset | null = null

// Load 3D buildings
const loadBuildings = async () => {
  if (!viewer) return
  
  try {
    tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207)
    viewer.scene.primitives.add(tileset)
    
    // Adjust tileset properties for better rendering
    tileset.maximumScreenSpaceError = 8
    tileset.preloadWhenHidden = false
    tileset.preloadFlightDestinations = false
  } catch (error) {
    console.warn('Failed to load 3D buildings:', error)
    // Fallback to OSM Buildings if Photorealistic tiles fail
    try {
      tileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188)
      viewer.scene.primitives.add(tileset)
      tileset.maximumScreenSpaceError = 8
    } catch (fallbackError) {
      console.warn('Failed to load OSM buildings:', fallbackError)
    }
  }
}

// Remove 3D buildings
const removeBuildings = () => {
  if (!viewer || !tileset) return
  
  viewer.scene.primitives.remove(tileset)
  tileset = null
}

// Toggle between 3D view with buildings and flat 2D map
const toggleViewMode = async () => {
  if (!viewer) return
  
  if (is3DView.value) {
    // Switch to 3D mode with buildings
    viewer.scene.mode = Cesium.SceneMode.SCENE3D
    viewer.terrainProvider = await Cesium.createWorldTerrainAsync()
    
    // Load buildings if not already loaded
    if (!tileset) {
      await loadBuildings()
    }
  } else {
    // Switch to flat 2D map mode
    viewer.scene.mode = Cesium.SceneMode.SCENE2D
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider() // Flat terrain
    
    // Remove buildings
    removeBuildings()
  }
  
  // Update camera view after mode change
  flyToLocation()
}

onMounted(async () => {
  // Initialize Cesium Ion access token
  // Get your token from https://cesium.com/ion/tokens
  // You can set it via runtime config: CESIUM_ION_TOKEN
  const ionToken = config.public.cesiumIonToken || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxMy1jYmY3LTQ3Y2ItODVhMS1kODUxYjI4Y2IzYzciLCJpZCI6MjU5LCJpYXQiOjE0OTI5NjE1ODN9.7rGt8e3L3Z3v5hL8x5K9JvN5mK3vN5mK3vN5mK3vN5mK'
  Cesium.Ion.defaultAccessToken = ionToken

  // Create viewer
  viewer = new Cesium.Viewer('cesium-container', {
    baseLayerPicker: false,
    geocoder: true,
    homeButton: true,
    infoBox: true,
    sceneModePicker: true,
    selectionIndicator: true,
    timeline: false,
    navigationHelpButton: true,
    animation: false,
    creditContainer: document.createElement('div')
  })

  // Set initial camera position immediately to avoid showing globe (top-down view)
  const initialPosition = Cesium.Cartesian3.fromDegrees(longitude.value, latitude.value, height.value)
  viewer.camera.setView({
    destination: initialPosition,
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90), // Top-down view (looking straight down)
      roll: 0.0
    }
  })

  // Set terrain provider (async)
  viewer.terrainProvider = await Cesium.createWorldTerrainAsync()

  // Set photorealistic imagery provider (Bing Maps Aerial)
  viewer.imageryLayers.removeAll()
  viewer.imageryLayers.addImageryProvider(
    await Cesium.IonImageryProvider.fromAssetId(2)
  )

  // Configure camera to prevent clipping when zoomed in
  // Adjust near/far clipping planes for street-level rendering
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 0.1
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 40480000.0
  
  // Set camera frustum for top-down view at 100m
  viewer.camera.frustum.near = 1.0 // Larger near plane for higher altitude
  viewer.camera.frustum.far = 100000000.0
  
  // Enable collision detection to prevent going underground
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = true
  
  // Disable terrain collision for smoother movement at street level
  viewer.scene.screenSpaceCameraController.enableTilt = true
  viewer.scene.screenSpaceCameraController.enableRotate = true
  viewer.scene.screenSpaceCameraController.enableTranslate = true
  viewer.scene.screenSpaceCameraController.enableZoom = true

  // Add photorealistic 3D buildings (Google Photorealistic 3D Tiles)
  await loadBuildings()

  // Update camera clipping planes dynamically as camera moves
  viewer.camera.moveEnd.addEventListener(() => {
    if (!viewer) return
    const distance = viewer.camera.positionCartographic.height
    // Adjust near plane based on distance to prevent clipping
    if (distance < 10) {
      viewer.camera.frustum.near = 0.1 // Very close
    } else if (distance < 100) {
      viewer.camera.frustum.near = 1.0
    } else if (distance < 1000) {
      viewer.camera.frustum.near = 10.0
    } else {
      viewer.camera.frustum.near = 100.0
    }
  })

  // Sample terrain to get accurate height and set top-down view
  const terrainPosition = Cesium.Cartographic.fromDegrees(longitude.value, latitude.value)
  const terrainPositions = [terrainPosition]
  
  // Sample terrain to get accurate height
  Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, terrainPositions).then((updatedPositions) => {
    if (viewer && updatedPositions && updatedPositions.length > 0 && updatedPositions[0]) {
      const terrainHeight = updatedPositions[0].height || 0
      // Set camera height to terrain height + desired height
      const cameraHeight = terrainHeight + height.value
      
      const initialPosition = Cesium.Cartesian3.fromRadians(
        updatedPositions[0].longitude,
        updatedPositions[0].latitude,
        cameraHeight
      )
      
      viewer.camera.setView({
        destination: initialPosition,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90), // Top-down view (looking straight down)
          roll: 0.0
        }
      })
    }
  }).catch(() => {
    // Fallback if terrain sampling fails
    if (viewer) {
      const initialPosition = Cesium.Cartesian3.fromDegrees(longitude.value, latitude.value, height.value)
      viewer.camera.setView({
        destination: initialPosition,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90), // Top-down view
          roll: 0.0
        }
      })
    }
  })
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})

const flyToLocation = () => {
  if (viewer && longitude.value && latitude.value) {
    const targetHeight = height.value || 91.44 // Default: 300 feet
    
    // For 2D mode, use simpler positioning
    if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          longitude.value,
          latitude.value,
          targetHeight
        ),
        duration: 2.0
      })
      return
    }
    
    // For 3D mode, sample terrain for accurate height
    const terrainPos = Cesium.Cartographic.fromDegrees(longitude.value, latitude.value)
    Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [terrainPos]).then((sampled) => {
      if (viewer && sampled && sampled.length > 0 && sampled[0]) {
        const terrainH = sampled[0].height || 0
        const cameraHeight = terrainH + targetHeight
        
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(
            sampled[0].longitude,
            sampled[0].latitude,
            cameraHeight
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90), // Top-down view (looking straight down)
            roll: 0.0
          },
          duration: 2.0
        })
      }
    }).catch(() => {
      // Fallback if terrain sampling fails
      if (viewer) {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            longitude.value,
            latitude.value,
            targetHeight
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90), // Top-down view
            roll: 0.0
          },
          duration: 2.0
        })
      }
    })
  }
}

const resetView = () => {
  longitude.value = -73.9553126
  latitude.value = 40.7200922
  height.value = 91.44 // Default height: 300 feet (~91.44m)
  flyToLocation()
}

// Set page title
useHead({
  title: 'Cesium Viewer - Photorealistic Tiles'
})
</script>

<style scoped>
/* Deep selectors for Cesium widgets - cannot be replaced with Tailwind */
:deep(.cesium-viewer) {
  font-family: inherit;
}

:deep(.cesium-viewer-toolbar) {
  display: none;
}

:deep(.cesium-viewer-timelineContainer) {
  display: none !important;
}

:deep(.cesium-viewer-animationContainer) {
  display: none !important;
}

:deep(.cesium-viewer-bottom) {
  display: none !important;
}
</style>

