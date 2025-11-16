<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isVisible && poi"
        :style="{ left: `${position.x}px`, top: `${position.y}px` }"
        class="fixed z-[9999] pointer-events-none"
      >
        <div class="relative">
          <!-- Tooltip content -->
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[240px] max-w-[320px]">
            <div class="flex items-start gap-3">
              <!-- Color indicator -->
              <div
                class="w-3 h-3 rounded-full flex-shrink-0 mt-1 ring-2 ring-white dark:ring-gray-800 shadow-md"
                :style="{ backgroundColor: color }"
              />
              
              <div class="flex-1 min-w-0">
                <!-- POI name -->
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {{ poi.name }}
                </h3>
                
                <!-- Category -->
                <p class="text-xs text-gray-600 dark:text-gray-400 mb-2 capitalize">
                  {{ category }}
                </p>
                
                <!-- Distance -->
                <div v-if="poi.distance_m" class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                  <UIcon name="i-lucide-map-pin" class="w-3 h-3" />
                  <span>{{ formatDistance(poi.distance_m) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { POIItem } from '../../types/osm-data'

interface Props {
  poi: POIItem | null
  category: string
  color: string
  position: { x: number, y: number }
  isVisible: boolean
}

const props = defineProps<Props>()

const formatDistance = (meters: number): string => {
  const feet = meters * 3.28084
  if (feet < 1000) {
    return `${Math.round(feet)} ft away`
  }
  return `${(feet / 5280).toFixed(2)} mi away`
}
</script>

