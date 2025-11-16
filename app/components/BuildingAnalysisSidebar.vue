<template>
  <USlideover
    v-model:open="isOpen"
    side="bottom"
    :overlay="false"
    class="h-[50vh] max-h-[600px]"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              Building Analysis
            </h2>
            <p class="mt-1 text-sm text-muted">
              AI-powered architectural analysis and neighborhood context
            </p>
          </div>
          <!-- Address inline in header if available -->
          <div v-if="analysis" class="pl-4 border-l border-default">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-primary" />
              <p class="text-sm font-medium text-highlighted">
                {{ analysis.address }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #body>
      <UTabs v-model:selected="selectedTab" :items="tabs" class="w-full h-full flex flex-col">
        <template #building>
          <div v-if="analysis" class="overflow-y-auto h-full flex justify-center">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 w-full max-w-7xl">
              <!-- Column 1 -->
              <div class="space-y-4">
                <!-- Quick Stats Grid -->
                <div class="grid grid-cols-2 gap-3 p-4 bg-default rounded-lg border border-default">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-building-2" class="w-4 h-4 text-muted" />
                      <span class="text-xs text-muted">Floors</span>
                    </div>
                    <p class="text-xl font-semibold text-highlighted">
                      {{ analysis.num_floors }}
                    </p>
                    <span class="text-xs text-muted">{{ Math.round(analysis.confidence_scores.num_floors * 100) }}% confident</span>
                  </div>

                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-grid-2x2" class="w-4 h-4 text-muted" />
                      <span class="text-xs text-muted">Window/Wall</span>
                    </div>
                    <p class="text-xl font-semibold text-highlighted">
                      {{ Math.round(analysis.window_to_wall_ratio * 100) }}%
                    </p>
                    <span class="text-xs text-muted">{{ Math.round(analysis.confidence_scores.window_to_wall_ratio * 100) }}% confident</span>
                  </div>
                </div>

                <!-- Architectural Style -->
                <div class="p-4 bg-default rounded-lg border border-default">
                  <div class="flex items-start gap-3">
                    <UIcon name="i-lucide-palette" class="w-4 h-4 text-primary mt-0.5" />
                    <div class="flex-1">
                      <h3 class="text-xs font-medium text-muted mb-2">
                        Architectural Style
                      </h3>
                      <div class="flex items-center gap-2 mb-2">
                        <UBadge color="primary" variant="subtle" size="sm">
                          {{ formatArchitecturalStyle(analysis.architectural_style) }}
                        </UBadge>
                        <span class="text-xs text-muted">
                          {{ Math.round(analysis.confidence_scores.architectural_style * 100) }}%
                        </span>
                      </div>
                      <p class="text-xs text-muted">
                        {{ analysis.architectural_style_add }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Building Age -->
                <div class="p-4 bg-default rounded-lg border border-default">
                  <div class="flex items-start gap-3">
                    <UIcon name="i-lucide-calendar" class="w-4 h-4 text-primary mt-0.5" />
                    <div class="flex-1">
                      <h3 class="text-xs font-medium text-muted mb-1">
                        Estimated Building Age
                      </h3>
                      <div class="flex items-center gap-2">
                        <p class="text-base font-semibold text-highlighted">
                          {{ analysis.estimated_building_age }}
                        </p>
                        <span class="text-xs text-muted">
                          {{ Math.round(analysis.confidence_scores.estimated_building_age * 100) }}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Column 2 -->
              <div class="space-y-4">
                <!-- Facade Materials -->
                <div class="p-4 bg-default rounded-lg border border-default">
                  <div class="flex items-start gap-3">
                    <UIcon name="i-lucide-box" class="w-4 h-4 text-primary mt-0.5" />
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-2">
                        <h3 class="text-xs font-medium text-muted">
                          Facade Materials
                        </h3>
                        <span class="text-xs text-muted">
                          {{ Math.round(analysis.confidence_scores.facade_material_mix * 100) }}%
                        </span>
                      </div>
                      <div class="space-y-2">
                        <div
                          v-for="item in sortedFacadeMaterials"
                          :key="item.material"
                          class="space-y-1"
                        >
                          <div class="flex items-center justify-between text-xs">
                            <span class="font-medium text-highlighted">{{ formatMaterial(item.material) }}</span>
                            <span class="text-muted">{{ item.percent }}%</span>
                          </div>
                          <UProgress
                            :model-value="item.percent"
                            :max="100"
                            size="xs"
                            :color="getMaterialColor(item.material)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Program Mix -->
                <div class="p-4 bg-default rounded-lg border border-default">
                  <div class="flex items-start gap-3">
                    <UIcon name="i-lucide-layers" class="w-4 h-4 text-primary mt-0.5" />
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-2">
                        <h3 class="text-xs font-medium text-muted">
                          Program Mix
                        </h3>
                        <span class="text-xs text-muted">
                          {{ Math.round(analysis.confidence_scores.program_mix * 100) }}%
                        </span>
                      </div>
                      <div class="space-y-2">
                        <div
                          v-for="item in sortedProgramMix"
                          :key="item.program"
                          class="space-y-1"
                        >
                          <div class="flex items-center justify-between text-xs">
                            <span class="font-medium text-highlighted">{{ formatProgram(item.program) }}</span>
                            <span class="text-muted">{{ item.percent }}%</span>
                          </div>
                          <UProgress
                            :model-value="item.percent"
                            :max="100"
                            size="xs"
                            :color="getProgramColor(item.program)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Notes Section -->
                <div class="p-4 bg-default rounded-lg border border-default">
                  <div class="flex items-start gap-3">
                    <UIcon name="i-lucide-file-text" class="w-4 h-4 text-primary mt-0.5" />
                    <div class="flex-1">
                      <h3 class="text-xs font-medium text-muted mb-2">
                        Analysis Notes
                      </h3>
                      <p class="text-xs text-muted leading-relaxed">
                        {{ analysis.notes }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #context>
          <div v-if="osmData" class="overflow-y-auto h-full flex justify-center">
            <div class="p-4 w-full max-w-7xl">
              <!-- Nearby Amenities using Accordion -->
              <UAccordion
                :items="amenityAccordionItems"
                :default-open="true"
                multiple
              >
                <template #subway_stations>
                  <div class="space-y-1 pb-2">
                    <div
                      v-for="(station, idx) in osmData.highlights.subway_stations.slice(0, 10)"
                      :key="idx"
                      class="flex items-center justify-between text-xs py-1"
                    >
                      <span class="text-highlighted">{{ station.name }}</span>
                      <span v-if="station.distance_m" class="text-muted">{{ formatDistanceInFeet(station.distance_m) }}</span>
                    </div>
                  </div>
                </template>

                <template #bus_stops>
                  <div class="space-y-1 pb-2">
                    <div
                      v-for="(stop, idx) in osmData.highlights.bus_stops.slice(0, 10)"
                      :key="idx"
                      class="flex items-center justify-between text-xs py-1"
                    >
                      <span class="text-highlighted">{{ stop.name }}</span>
                      <span v-if="stop.distance_m" class="text-muted">{{ formatDistanceInFeet(stop.distance_m) }}</span>
                    </div>
                  </div>
                </template>

                <template #schools>
                  <div class="space-y-1 pb-2">
                    <div
                      v-for="(school, idx) in osmData.highlights.schools.slice(0, 10)"
                      :key="idx"
                      class="flex items-center justify-between text-xs py-1"
                    >
                      <span class="text-highlighted">{{ school.name }}</span>
                      <span v-if="school.distance_m" class="text-muted">{{ formatDistanceInFeet(school.distance_m) }}</span>
                    </div>
                  </div>
                </template>

                <template #groceries>
                  <div class="space-y-1 pb-2">
                    <div
                      v-for="(grocery, idx) in osmData.highlights.groceries.slice(0, 10)"
                      :key="idx"
                      class="flex items-center justify-between text-xs py-1"
                    >
                      <span class="text-highlighted">{{ grocery.name }}</span>
                      <span v-if="grocery.distance_m" class="text-muted">{{ formatDistanceInFeet(grocery.distance_m) }}</span>
                    </div>
                  </div>
                </template>

                <template #parks>
                  <div class="space-y-1 pb-2">
                    <div
                      v-for="(park, idx) in osmData.highlights.parks.slice(0, 10)"
                      :key="idx"
                      class="flex items-center justify-between text-xs py-1"
                    >
                      <span class="text-highlighted">{{ park.name }}</span>
                      <span v-if="park.distance_m" class="text-muted">{{ formatDistanceInFeet(park.distance_m) }}</span>
                    </div>
                  </div>
                </template>

                <template #churches>
                  <div class="space-y-1 pb-2">
                    <div
                      v-for="(church, idx) in osmData.highlights.churches.slice(0, 10)"
                      :key="idx"
                      class="flex items-center justify-between text-xs py-1"
                    >
                      <span class="text-highlighted">{{ church.name }}</span>
                      <span v-if="church.distance_m" class="text-muted">{{ formatDistanceInFeet(church.distance_m) }}</span>
                    </div>
                  </div>
                </template>
              </UAccordion>
            </div>
          </div>

          <div v-else class="p-6 text-center text-muted">
            <p>No context data available</p>
          </div>
        </template>
      </UTabs>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { BuildingAnalysis } from '../../types/building-analysis'
import type { OSMData } from '../../types/osm-data'

const props = defineProps<{
  analysis: BuildingAnalysis | null
  osmData: OSMData | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })

// Tab management
const selectedTab = ref(0)
const tabs = [
  {
    label: 'Building',
    slot: 'building',
    icon: 'i-lucide-building-2'
  },
  {
    label: 'Context',
    slot: 'context',
    icon: 'i-lucide-map-pin'
  }
]

// Format distance in feet
const formatDistanceInFeet = (meters: number): string => {
  const feet = meters * 3.28084
  if (feet < 1000) {
    return `${Math.round(feet)} ft`
  }
  return `${(feet / 5280).toFixed(2)} mi`
}

// Create accordion items for amenities
const amenityAccordionItems = computed(() => {
  if (!props.osmData) return []

  const items = []

  if (props.osmData.highlights.subway_stations.length > 0) {
    items.push({
      label: 'Subway Stations',
      slot: 'subway_stations',
      icon: 'i-lucide-train',
      defaultOpen: true,
      content: `${props.osmData.highlights.subway_stations.length} stations nearby`
    })
  }

  if (props.osmData.highlights.bus_stops.length > 0) {
    items.push({
      label: 'Bus Stops',
      slot: 'bus_stops',
      icon: 'i-lucide-bus',
      defaultOpen: true,
      content: `${props.osmData.highlights.bus_stops.length} stops nearby`
    })
  }

  if (props.osmData.highlights.schools.length > 0) {
    items.push({
      label: 'Schools',
      slot: 'schools',
      icon: 'i-lucide-school',
      defaultOpen: true,
      content: `${props.osmData.highlights.schools.length} schools nearby`
    })
  }

  if (props.osmData.highlights.groceries.length > 0) {
    items.push({
      label: 'Groceries & Markets',
      slot: 'groceries',
      icon: 'i-lucide-shopping-cart',
      defaultOpen: true,
      content: `${props.osmData.highlights.groceries.length} stores nearby`
    })
  }

  if (props.osmData.highlights.parks.length > 0) {
    items.push({
      label: 'Parks & Recreation',
      slot: 'parks',
      icon: 'i-lucide-trees',
      defaultOpen: true,
      content: `${props.osmData.highlights.parks.length} parks nearby`
    })
  }

  if (props.osmData.highlights.churches.length > 0) {
    items.push({
      label: 'Places of Worship',
      slot: 'churches',
      icon: 'i-lucide-church',
      defaultOpen: true,
      content: `${props.osmData.highlights.churches.length} places nearby`
    })
  }

  return items
})

// Sort facade materials by percentage (descending)
const sortedFacadeMaterials = computed(() => {
  if (!props.analysis) return []
  return [...props.analysis.facade_material_mix].sort((a, b) => b.percent - a.percent)
})

// Sort program mix by percentage (descending)
const sortedProgramMix = computed(() => {
  if (!props.analysis) return []
  return [...props.analysis.program_mix].sort((a, b) => b.percent - a.percent)
})

// Format architectural style
const formatArchitecturalStyle = (style: string) => {
  return style.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

// Format material name
const formatMaterial = (material: string) => {
  return material.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

// Format program name
const formatProgram = (program: string) => {
  return program.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

// Get color for material
const getMaterialColor = (material: string): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
  const colors: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
    glass: 'info',
    brick: 'error',
    stone: 'neutral',
    concrete: 'secondary',
    metal_panel: 'neutral',
    composite_panel: 'warning',
    stucco: 'warning',
    wood: 'warning',
    terracotta: 'error',
    other: 'neutral'
  }
  return colors[material] || 'primary'
}

// Get color for program
const getProgramColor = (program: string): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
  const colors: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
    residential: 'success',
    office: 'info',
    retail: 'secondary',
    hotel: 'primary',
    industrial: 'neutral',
    parking: 'secondary',
    institutional: 'info',
    civic: 'info',
    community: 'success',
    mechanical_other: 'neutral',
    unknown: 'neutral'
  }
  return colors[program] || 'primary'
}
</script>

