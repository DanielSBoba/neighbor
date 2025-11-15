<template>
  <div class="relative w-full h-full">
    <div class="flex gap-4 w-full h-full">
      <div
        ref="cesiumContainerRef"
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
        <div
          ref="streetViewContainerRef"
          class="w-full h-full"
        />
        <div
          v-if="streetViewError"
          class="absolute inset-0 flex items-center justify-center bg-muted"
        >
          <div class="text-center p-4">
            <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-muted mb-2 mx-auto" />
            <p class="text-sm text-muted">{{ streetViewError }}</p>
          </div>
        </div>
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

interface Props {
  longitude: number
  latitude: number
  height?: number // Height in meters
  is3DView?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 91.44, // Default: 300 feet (~91.44m)
  is3DView: true
})

const emit = defineEmits<{
  viewerReady: [viewer: Cesium.Viewer]
}>()

// Use template ref instead of ID to avoid hydration mismatches
const cesiumContainerRef = ref<HTMLElement | null>(null)
const streetViewContainerRef = ref<HTMLElement | null>(null)

// Use Google Maps composable
const { loadGoogleMapsAPI, error: googleMapsError } = useGoogleMaps()

const streetViewError = computed(() => googleMapsError.value)
let streetViewPanorama: any = null

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
  } catch (error: any) {
    console.error('Failed to initialize Street View:', error)
  }
}

// Update Street View position
const updateStreetViewPosition = () => {
  if (streetViewPanorama && props.latitude && props.longitude) {
    streetViewPanorama.setPosition({
      lat: props.latitude,
      lng: props.longitude
    })
  }
}

const config = useRuntimeConfig()
let viewer: Cesium.Viewer | null = null
let tileset: Cesium.Cesium3DTileset | null = null

// Load 3D buildings
const loadBuildings = async () => {
  if (!viewer) return
  
  try {
    tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207)
    viewer.scene.primitives.add(tileset)
    tileset.maximumScreenSpaceError = 8
    tileset.preloadWhenHidden = false
    tileset.preloadFlightDestinations = false
  } catch (error) {
    console.warn('Failed to load 3D buildings:', error)
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

// Expose methods to parent component
const flyToLocation = (lon?: number, lat?: number, height?: number) => {
  if (!viewer) return
  
  const targetLon = lon ?? props.longitude
  const targetLat = lat ?? props.latitude
  const targetHeight = height ?? props.height
  
  if (!targetLon || !targetLat) return
  
  // For 2D mode, use simpler positioning
  if (viewer.scene.mode === Cesium.SceneMode.SCENE2D) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        targetLon,
        targetLat,
        targetHeight
      ),
      duration: 2.0
    })
    return
  }
  
  // For 3D mode, sample terrain for accurate height
  const terrainPos = Cesium.Cartographic.fromDegrees(targetLon, targetLat)
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
          pitch: Cesium.Math.toRadians(-90), // Top-down view
          roll: 0.0
        },
        duration: 2.0
      })
    }
  }).catch(() => {
    if (viewer) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          targetLon,
          targetLat,
          targetHeight
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0
        },
        duration: 2.0
      })
    }
  })
}

const toggleViewMode = async (is3D: boolean) => {
  if (!viewer) return
  
  if (is3D) {
    viewer.scene.mode = Cesium.SceneMode.SCENE3D
    viewer.terrainProvider = await Cesium.createWorldTerrainAsync()
    if (!tileset) {
      await loadBuildings()
    }
  } else {
    viewer.scene.mode = Cesium.SceneMode.SCENE2D
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()
    removeBuildings()
  }
  
  flyToLocation()
}

// Watch for prop changes and update viewer
watch(() => [props.longitude, props.latitude, props.height], () => {
  flyToLocation()
  updateStreetViewPosition()
}, { deep: true })

watch(() => props.is3DView, (newVal) => {
  toggleViewMode(newVal)
})

// Expose methods to parent
defineExpose({
  flyToLocation,
  toggleViewMode,
  viewer
})

onMounted(async () => {
  // Wait for DOM to be fully rendered before initializing Cesium
  await nextTick()
  
  // Ensure the container element exists
  if (!cesiumContainerRef.value) {
    console.error('Cesium container element not found')
    return
  }
  
  const ionToken = config.public.cesiumIonToken || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxMy1jYmY3LTQ3Y2ItODVhMS1kODUxYjI4Y2IzYzciLCJpZCI6MjU5LCJpYXQiOjE0OTI5NjE1ODN9.7rGt8e3L3Z3v5hL8x5K9JvN5mK3vN5mK3vN5mK3vN5mK'
  Cesium.Ion.defaultAccessToken = ionToken

  viewer = new Cesium.Viewer(cesiumContainerRef.value, {
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

  // Set initial camera position
  const initialPosition = Cesium.Cartesian3.fromDegrees(props.longitude, props.latitude, props.height)
  viewer.camera.setView({
    destination: initialPosition,
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0
    }
  })

  viewer.terrainProvider = await Cesium.createWorldTerrainAsync()

  viewer.imageryLayers.removeAll()
  viewer.imageryLayers.addImageryProvider(
    await Cesium.IonImageryProvider.fromAssetId(2)
  )

  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 0.1
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 40480000.0
  
  viewer.camera.frustum.near = 1.0
  viewer.camera.frustum.far = 100000000.0
  
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = true
  viewer.scene.screenSpaceCameraController.enableTilt = true
  viewer.scene.screenSpaceCameraController.enableRotate = true
  viewer.scene.screenSpaceCameraController.enableTranslate = true
  viewer.scene.screenSpaceCameraController.enableZoom = true

  // Load buildings if 3D view is enabled
  if (props.is3DView) {
    await loadBuildings()
  }

  // Update camera clipping planes dynamically
  viewer.camera.moveEnd.addEventListener(() => {
    if (!viewer) return
    const distance = viewer.camera.positionCartographic.height
    if (distance < 10) {
      viewer.camera.frustum.near = 0.1
    } else if (distance < 100) {
      viewer.camera.frustum.near = 1.0
    } else if (distance < 1000) {
      viewer.camera.frustum.near = 10.0
    } else {
      viewer.camera.frustum.near = 100.0
    }
  })

  // Sample terrain for accurate height
  const terrainPosition = Cesium.Cartographic.fromDegrees(props.longitude, props.latitude)
  Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [terrainPosition]).then((updatedPositions) => {
    if (viewer && updatedPositions && updatedPositions.length > 0 && updatedPositions[0]) {
      const terrainHeight = updatedPositions[0].height || 0
      const cameraHeight = terrainHeight + props.height
      
      const refinedPosition = Cesium.Cartesian3.fromRadians(
        updatedPositions[0].longitude,
        updatedPositions[0].latitude,
        cameraHeight
      )
      
      viewer.camera.setView({
        destination: refinedPosition,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0
        }
      })
    }
  }).catch(() => {
    // Fallback already set above
  })

  emit('viewerReady', viewer)

  // Initialize Street View
  await initStreetView()
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
  if (streetViewPanorama) {
    streetViewPanorama = null
  }
})
</script>

<style scoped>
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

