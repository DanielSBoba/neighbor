<template>
  <div class="relative flex-1 h-full">
    <div
      ref="cesiumContainerRef"
      class="flex-1 h-full cesium-viewer"
    />
    <POITooltip
      :poi="selectedPOI"
      :category="selectedCategory"
      :color="selectedColor"
      :position="tooltipPosition"
      :is-visible="showTooltip"
    />
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import type { OSMData, POIItem } from '../../types/osm-data'
import { getPOIColor, formatPOICategoryName } from '../utils/poi-colors'

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
  osmData?: OSMData | null
}

const props = withDefaults(defineProps<Props>(), {
  height: 122, // Default: 400 feet (~121.92m)
  is3DView: true,
  streetViewHeading: 0,
  streetViewPitch: 0,
  osmData: null
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
const poiEntities: Cesium.Entity[] = []

// Tooltip state
const showTooltip = ref(false)
const selectedPOI = ref<POIItem | null>(null)
const selectedCategory = ref('')
const selectedColor = ref('')
const tooltipPosition = ref({ x: 0, y: 0 })

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

// Get Cesium color from hex color
const getCesiumColor = (category: string): Cesium.Color => {
  const hexColor = getPOIColor(category)
  return Cesium.Color.fromCssColorString(hexColor)
}

// Create colored POI pin using the poi.svg file
const createColoredPinSVG = (color: string): string => {
  // Enhanced SVG with proper drop shadow and color
  const svgString = `
    <svg width="800" height="800" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <filter id="shadow-${color.replace('#', '')}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="gradient-${color.replace('#', '')}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.85" />
        </linearGradient>
      </defs>
      <g filter="url(#shadow-${color.replace('#', '')})">
        <path d="M50.002 0C30.763 0 15 15.718 15 34.902c0 7.432 2.374 14.34 6.392 20.019L45.73 96.994c3.409 4.453 5.675 3.607 8.51-.235l26.843-45.683c.542-.981.967-2.026 1.338-3.092A34.446 34.446 0 0 0 85 34.902C85 15.718 69.24 0 50.002 0zm0 16.354c10.359 0 18.597 8.218 18.597 18.548c0 10.33-8.238 18.544-18.597 18.544c-10.36 0-18.601-8.215-18.601-18.544c0-10.33 8.241-18.548 18.6-18.548z" 
              fill="url(#gradient-${color.replace('#', '')})" 
              stroke="white" 
              stroke-width="3"/>
      </g>
    </svg>
  `
  return `data:image/svg+xml;base64,${btoa(svgString)}`
}

// Clear all POI markers
const clearPOIMarkers = () => {
  if (!viewer) return
  
  for (const entity of poiEntities) {
    viewer.entities.remove(entity)
  }
  poiEntities.length = 0
}

// Add POI markers to the map
const addPOIMarkers = () => {
  if (!viewer || !props.osmData) return
  
  clearPOIMarkers()
  
  const categories = [
    { key: 'subway_stations', items: props.osmData.highlights.subway_stations },
    { key: 'bus_stops', items: props.osmData.highlights.bus_stops },
    { key: 'schools', items: props.osmData.highlights.schools },
    { key: 'groceries', items: props.osmData.highlights.groceries },
    { key: 'parks', items: props.osmData.highlights.parks },
    { key: 'churches', items: props.osmData.highlights.churches }
  ]
  
  for (const category of categories) {
    const colorHex = getPOIColor(category.key)
    const categoryName = formatPOICategoryName(category.key)
    
    for (const poi of category.items) {
      if (!poi.geolocation) continue
      
      const position = Cesium.Cartesian3.fromDegrees(
        poi.geolocation.lng,
        poi.geolocation.lat,
        5 // Add 5 meters height to ensure visibility above ground
      )
      
      // Use colored SVG pin for maximum quality
      const svgPin = createColoredPinSVG(colorHex)
      
      const entity = viewer.entities.add({
        position,
        billboard: {
          image: svgPin,
          width: 40,
          height: 40,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 1.0,
          pixelOffset: new Cesium.Cartesian2(0, 0),
          scaleByDistance: new Cesium.NearFarScalar(100, 1.2, 5000, 0.5)
        },
        properties: {
          poiData: poi,
          categoryKey: category.key,
          categoryName: categoryName,
          color: colorHex
        }
      })
      
      poiEntities.push(entity)
    }
  }
  
  // Set up click handler for POI markers
  setupClickHandler()
}

// Set up click handler for POI entities
let clickHandler: Cesium.ScreenSpaceEventHandler | null = null

const setupClickHandler = () => {
  if (!viewer) return
  
  // Remove old handler if exists
  if (clickHandler) {
    clickHandler.destroy()
  }
  
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  
  // Handle left click
  clickHandler.setInputAction((click: any) => {
    const pickedObject = viewer!.scene.pick(click.position)
    
    if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
      const entity = pickedObject.id
      const props = entity.properties
      
      // Check if this is a POI entity
      if (props.poiData && props.categoryName && props.color) {
        const poiData = props.poiData.getValue()
        const categoryName = props.categoryName.getValue()
        const color = props.color.getValue()
        
        // Update tooltip data
        selectedPOI.value = poiData
        selectedCategory.value = categoryName
        selectedColor.value = color
        
        // Calculate screen position for tooltip
        const cartesian = entity.position.getValue(Cesium.JulianDate.now())
        if (cartesian) {
          const canvasPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
            viewer!.scene,
            cartesian
          )
          
          if (canvasPosition) {
            tooltipPosition.value = {
              x: canvasPosition.x,
              y: canvasPosition.y - 50 // Offset above the marker
            }
          }
        }
        
        showTooltip.value = true
      } else {
        // Clicked on something else, hide tooltip
        showTooltip.value = false
      }
    } else {
      // Clicked on empty space, hide tooltip
      showTooltip.value = false
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  
  // Hide tooltip on camera move
  viewer.camera.moveStart.addEventListener(() => {
    showTooltip.value = false
  })
}

// Watch for osmData changes
watch(() => props.osmData, () => {
  addPOIMarkers()
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
    infoBox: false, // Disabled - using custom Vue tooltip instead
    sceneModePicker: true,
    selectionIndicator: false, // Disabled for cleaner look
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
  
  // Add POI markers if data is already available
  addPOIMarkers()
})

onUnmounted(() => {
  clearPOIMarkers()
  
  // Clean up click handler
  if (clickHandler) {
    clickHandler.destroy()
    clickHandler = null
  }
  
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
