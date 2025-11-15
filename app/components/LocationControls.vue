<template>
  <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Location</label>
        <div class="flex gap-2">
          <UInput
            :model-value="longitude"
            @update:model-value="updateLongitude"
            type="number"
            placeholder="Longitude"
            step="0.0001"
            class="flex-1"
            icon="i-lucide-navigation"
          />
          <UInput
            :model-value="latitude"
            @update:model-value="updateLatitude"
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
        <div class="flex gap-2 items-end">
          <UInput
            :model-value="heightInFeet"
            @update:model-value="updateHeight"
            type="number"
            placeholder="Height (ft)"
            step="10"
            icon="i-lucide-move-vertical"
            class="flex-1"
          />
          <div class="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <div class="flex flex-col">
              <span class="text-sm font-medium">3D Buildings</span>
              <span class="text-xs text-muted">Photorealistic view</span>
            </div>
            <USwitch
              :model-value="is3DView"
              @update:model-value="update3DView"
            />
          </div>
        </div>
        <p class="text-xs text-muted mt-1">Default: 300 ft - Top-down view</p>
      </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  longitude: number
  latitude: number
  heightInFeet: number
  is3DView: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:longitude': [value: number]
  'update:latitude': [value: number]
  'update:heightInFeet': [value: number]
  'update:is3DView': [value: boolean]
}>()

const updateLongitude = (value: number) => {
  emit('update:longitude', value)
}

const updateLatitude = (value: number) => {
  emit('update:latitude', value)
}

const updateHeight = (value: number) => {
  emit('update:heightInFeet', value)
}

const update3DView = (value: boolean) => {
  emit('update:is3DView', value)
}
</script>

