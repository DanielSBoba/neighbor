<template>
  <div
    ref="cesiumContainerRef"
    class="flex-1 h-full cesium-viewer"
  />
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
  streetViewHeading?: number // Street View heading in degrees (0-360)
  streetViewPitch?: number // Street View pitch in degrees (-90 to 90)
}

const props = withDefaults(defineProps<Props>(), {
  height: 122, // Default: 400 feet (~121.92m)
  is3DView: true,
  streetViewHeading: 0,
  streetViewPitch: 0
})

const emit = defineEmits<{
  viewerReady: [viewer: Cesium.Viewer]
}>()

// Use template ref instead of ID to avoid hydration mismatches
const cesiumContainerRef = ref<HTMLElement | null>(null)

const config = useRuntimeConfig()
let viewer: Cesium.Viewer | null = null
let tileset: Cesium.Cesium3DTileset | null = null
let viewConeEntity: Cesium.Entity | null = null
let targetPosition: Cesium.Cartesian3 | null = null
let targetOrientation: Cesium.Quaternion | null = null
let currentPosition: Cesium.Cartesian3 | null = null
let currentOrientation: Cesium.Quaternion | null = null
let animationStartTime: number | null = null

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
  updateViewCone()
}, { deep: true })

watch(() => props.is3DView, (newVal) => {
  toggleViewMode(newVal)
})

// Smooth rotation animation
const animationDuration = 200 // 200ms

const smoothPosition = new Cesium.CallbackPositionProperty((time, result) => {
  if (!currentPosition || !targetPosition) return targetPosition || new Cesium.Cartesian3()

  if (!animationStartTime) return targetPosition

  const elapsed = Date.now() - animationStartTime
  const t = Math.min(elapsed / animationDuration, 1)
  // Ease out cubic
  const eased = 1 - Math.pow(1 - t, 3)

  return Cesium.Cartesian3.lerp(currentPosition, targetPosition, eased, result || new Cesium.Cartesian3())
}, false, Cesium.ReferenceFrame.FIXED)

const smoothOrientation = new Cesium.CallbackProperty(() => {
  if (!currentOrientation || !targetOrientation) return targetOrientation || new Cesium.Quaternion()

  if (!animationStartTime) return targetOrientation

  const elapsed = Date.now() - animationStartTime
  const t = Math.min(elapsed / animationDuration, 1)
  // Ease out cubic
  const eased = 1 - Math.pow(1 - t, 3)

  return Cesium.Quaternion.slerp(currentOrientation, targetOrientation, eased, new Cesium.Quaternion())
}, false)

const updateViewCone = () => {
  if (!viewer || props.streetViewHeading === undefined || props.streetViewPitch === undefined) {
    return
  }

  const coneLength = 35
  const halfFovRad = Cesium.Math.toRadians(30)
  const terrainPos = Cesium.Cartographic.fromDegrees(props.longitude, props.latitude)

  Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [terrainPos]).then((sampled) => {
    if (!viewer || !sampled || sampled.length === 0) return

    const terrainHeight = sampled[0]?.height || 0
    const streetLevelHeight = 0.5
    const cameraHeight = terrainHeight + streetLevelHeight

    const cameraPosition = Cesium.Cartesian3.fromRadians(
      sampled[0]!.longitude,
      sampled[0]!.latitude,
      cameraHeight
    )

    const cesiumHeading = Cesium.Math.toRadians(props.streetViewHeading + 90)
    const cesiumPitch = Cesium.Math.toRadians(-90)

    const hpr = new Cesium.HeadingPitchRoll(cesiumHeading, cesiumPitch, 0)
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(cameraPosition, hpr)

    const rotationMatrix = Cesium.Matrix3.fromQuaternion(orientation, new Cesium.Matrix3())
    const forwardZ = Cesium.Matrix3.multiplyByVector(
      rotationMatrix,
      Cesium.Cartesian3.UNIT_Z,
      new Cesium.Cartesian3()
    )

    const offset = Cesium.Cartesian3.multiplyByScalar(forwardZ, -coneLength / 2, new Cesium.Cartesian3())
    const conePosition = Cesium.Cartesian3.add(cameraPosition, offset, new Cesium.Cartesian3())

    const bottomRadius = coneLength * Math.tan(halfFovRad)

    // Create cone once, then just update target values for smooth animation
    if (!viewConeEntity) {
      currentPosition = conePosition.clone()
      currentOrientation = orientation.clone()
      targetPosition = conePosition.clone()
      targetOrientation = orientation.clone()

      viewConeEntity = viewer.entities.add({
        position: smoothPosition,
        orientation: smoothOrientation,
        cylinder: {
          length: coneLength,
          topRadius: 0,
          bottomRadius: bottomRadius,
          material: Cesium.Color.TEAL.withAlpha(0.6),
          outline: true,
          outlineColor: Cesium.Color.TEAL.withAlpha(1),
          outlineWidth: 2.0
        }
      })
    } else {
      // Update animation targets
      currentPosition = targetPosition?.clone() || conePosition.clone()
      currentOrientation = targetOrientation?.clone() || orientation.clone()
      targetPosition = conePosition.clone()
      targetOrientation = orientation.clone()
      animationStartTime = Date.now()
    }
  }).catch(() => {
    if (!viewer) return

    const streetLevelHeight = 0.5
    const cameraPosition = Cesium.Cartesian3.fromDegrees(
      props.longitude,
      props.latitude,
      streetLevelHeight
    )

    const cesiumHeading = Cesium.Math.toRadians(props.streetViewHeading + 90)
    const cesiumPitch = Cesium.Math.toRadians(-90)

    const hpr = new Cesium.HeadingPitchRoll(cesiumHeading, cesiumPitch, 0)
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(cameraPosition, hpr)

    const rotationMatrix = Cesium.Matrix3.fromQuaternion(orientation, new Cesium.Matrix3())
    const forwardZ = Cesium.Matrix3.multiplyByVector(
      rotationMatrix,
      Cesium.Cartesian3.UNIT_Z,
      new Cesium.Cartesian3()
    )

    const offset = Cesium.Cartesian3.multiplyByScalar(forwardZ, -coneLength / 2, new Cesium.Cartesian3())
    const conePosition = Cesium.Cartesian3.add(cameraPosition, offset, new Cesium.Cartesian3())

    const halfFovRad = Cesium.Math.toRadians(90)
    const bottomRadius = coneLength * Math.tan(halfFovRad)

    // Create cone once, then just update target values for smooth animation
    if (!viewConeEntity) {
      currentPosition = conePosition.clone()
      currentOrientation = orientation.clone()
      targetPosition = conePosition.clone()
      targetOrientation = orientation.clone()

      viewConeEntity = viewer.entities.add({
        position: smoothPosition,
        orientation: smoothOrientation,
        cylinder: {
          length: coneLength,
          topRadius: 0,
          bottomRadius: bottomRadius,
          material: Cesium.Color.TEAL.withAlpha(0.6),
          outline: true,
          outlineColor: Cesium.Color.TEAL.withAlpha(1),
          outlineWidth: 2.0
        }
      })
    } else {
      // Update animation targets
      currentPosition = targetPosition?.clone() || conePosition.clone()
      currentOrientation = targetOrientation?.clone() || orientation.clone()
      targetPosition = conePosition.clone()
      targetOrientation = orientation.clone()
      animationStartTime = Date.now()
    }
  })
}

// Watch for Street View POV changes
watch(() => [props.streetViewHeading, props.streetViewPitch], () => {
  updateViewCone()
}, { deep: true })

// Capture screenshot
const captureScreenshot = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!viewer) {
      reject(new Error('Viewer not initialized'))
      return
    }

    try {
      // Render the scene to ensure it's up to date
      viewer.render()

      // Get the canvas and convert to data URL
      const canvas = viewer.scene.canvas as HTMLCanvasElement
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      resolve(dataUrl)
    } catch (error) {
      reject(error)
    }
  })
}

// Expose methods to parent
defineExpose({
  flyToLocation,
  toggleViewMode,
  viewer,
  captureScreenshot
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

  // Create initial view cone after viewer is ready
  await nextTick()
  updateViewCone()
})

onUnmounted(() => {
  if (viewConeEntity && viewer) {
    viewer.entities.remove(viewConeEntity)
    viewConeEntity = null
  }
  if (viewer) {
    viewer.destroy()
    viewer = null
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
