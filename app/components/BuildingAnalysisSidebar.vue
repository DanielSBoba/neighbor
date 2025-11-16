<template>
  <USlideover
    v-model:open="isOpen"
    side="right"
    :overlay="false"
    class="max-w-2xl"
  >
    <template #header>
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-highlighted">
            Building Analysis
          </h2>
          <p class="mt-1 text-sm text-muted">
            AI-powered architectural analysis
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="analysis" class="divide-y divide-default p-0">
        <!-- Address Section -->
        <div class="p-6 bg-primary/5">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary mt-0.5" />
            <div class="flex-1">
              <h3 class="text-sm font-medium text-muted">
                Address
              </h3>
              <p class="mt-1 text-base font-medium text-highlighted">
                {{ analysis.address }}
              </p>
            </div>
          </div>
        </div>

        <!-- Quick Stats Grid -->
        <div class="grid grid-cols-2 gap-4 p-6 bg-default">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="w-4 h-4 text-muted" />
              <span class="text-sm text-muted">Floors</span>
            </div>
            <p class="text-2xl font-semibold text-highlighted">
              {{ analysis.num_floors }}
            </p>
            <UProgress
              :model-value="analysis.confidence_scores.num_floors * 100"
              :max="100"
              size="sm"
              color="primary"
            >
              <template #status>
                <span class="text-xs text-muted">{{ Math.round(analysis.confidence_scores.num_floors * 100) }}% confident</span>
              </template>
            </UProgress>
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-grid-2x2" class="w-4 h-4 text-muted" />
              <span class="text-sm text-muted">Window/Wall Ratio</span>
            </div>
            <p class="text-2xl font-semibold text-highlighted">
              {{ Math.round(analysis.window_to_wall_ratio * 100) }}%
            </p>
            <UProgress
              :model-value="analysis.confidence_scores.window_to_wall_ratio * 100"
              :max="100"
              size="sm"
              color="primary"
            >
              <template #status>
                <span class="text-xs text-muted">{{ Math.round(analysis.confidence_scores.window_to_wall_ratio * 100) }}% confident</span>
              </template>
            </UProgress>
          </div>
        </div>

        <!-- Architectural Style -->
        <div class="p-6">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-palette" class="w-5 h-5 text-primary mt-0.5" />
            <div class="flex-1">
              <h3 class="text-sm font-medium text-muted mb-2">
                Architectural Style
              </h3>
              <div class="flex items-center gap-2 mb-2">
                <UBadge color="primary" variant="subtle" size="lg">
                  {{ formatArchitecturalStyle(analysis.architectural_style) }}
                </UBadge>
                <span class="text-xs text-muted">
                  {{ Math.round(analysis.confidence_scores.architectural_style * 100) }}% confidence
                </span>
              </div>
              <p class="text-sm text-muted">
                {{ analysis.architectural_style_add }}
              </p>
            </div>
          </div>
        </div>

        <!-- Building Age -->
        <div class="p-6 bg-default">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-calendar" class="w-5 h-5 text-primary mt-0.5" />
            <div class="flex-1">
              <h3 class="text-sm font-medium text-muted mb-2">
                Estimated Building Age
              </h3>
              <div class="flex items-center gap-2">
                <p class="text-lg font-semibold text-highlighted">
                  {{ analysis.estimated_building_age }}
                </p>
                <span class="text-xs text-muted">
                  {{ Math.round(analysis.confidence_scores.estimated_building_age * 100) }}% confidence
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Facade Materials -->
        <div class="p-6">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-box" class="w-5 h-5 text-primary mt-0.5" />
            <div class="flex-1">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-muted">
                  Facade Materials
                </h3>
                <span class="text-xs text-muted">
                  {{ Math.round(analysis.confidence_scores.facade_material_mix * 100) }}% confidence
                </span>
              </div>
              <div class="space-y-3">
                <div
                  v-for="item in sortedFacadeMaterials"
                  :key="item.material"
                  class="space-y-1"
                >
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-highlighted">{{ formatMaterial(item.material) }}</span>
                    <span class="text-muted">{{ item.percent }}%</span>
                  </div>
                  <UProgress
                    :model-value="item.percent"
                    :max="100"
                    size="sm"
                    :color="getMaterialColor(item.material)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Program Mix -->
        <div class="p-6 bg-default">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-layers" class="w-5 h-5 text-primary mt-0.5" />
            <div class="flex-1">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-muted">
                  Program Mix
                </h3>
                <span class="text-xs text-muted">
                  {{ Math.round(analysis.confidence_scores.program_mix * 100) }}% confidence
                </span>
              </div>
              <div class="space-y-3">
                <div
                  v-for="item in sortedProgramMix"
                  :key="item.program"
                  class="space-y-1"
                >
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-highlighted">{{ formatProgram(item.program) }}</span>
                    <span class="text-muted">{{ item.percent }}%</span>
                  </div>
                  <UProgress
                    :model-value="item.percent"
                    :max="100"
                    size="sm"
                    :color="getProgramColor(item.program)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes Section -->
        <div class="p-6">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary mt-0.5" />
            <div class="flex-1">
              <h3 class="text-sm font-medium text-muted mb-2">
                Analysis Notes
              </h3>
              <p class="text-sm text-muted leading-relaxed">
                {{ analysis.notes }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { BuildingAnalysis } from '../../types/building-analysis'

const props = defineProps<{
  analysis: BuildingAnalysis | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })

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

