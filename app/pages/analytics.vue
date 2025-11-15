<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2">Neighborhood Analytics</h1>
      <p class="text-lg text-muted">
        Comprehensive data insights and analytics for neighborhoods worldwide
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted mb-1">Demographics</p>
            <p class="text-2xl font-bold">Coming Soon</p>
          </div>
          <UIcon name="i-lucide-users" class="w-8 h-8 text-primary opacity-50" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted mb-1">Housing Market</p>
            <p class="text-2xl font-bold">Coming Soon</p>
          </div>
          <UIcon name="i-lucide-home" class="w-8 h-8 text-primary opacity-50" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted mb-1">Safety Score</p>
            <p class="text-2xl font-bold">Coming Soon</p>
          </div>
          <UIcon name="i-lucide-shield-check" class="w-8 h-8 text-primary opacity-50" />
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted mb-1">Walkability</p>
            <p class="text-2xl font-bold">Coming Soon</p>
          </div>
          <UIcon name="i-lucide-footprints" class="w-8 h-8 text-primary opacity-50" />
        </div>
      </UCard>
    </div>

    <UCard class="mb-8">
      <template #header>
        <h2 class="text-xl font-semibold">Analytics Features</h2>
      </template>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-bar-chart-3" class="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 class="font-medium mb-1">Demographic Analysis</h3>
              <p class="text-sm text-muted">
                Population density, age distribution, income levels, education, and household composition
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-trending-up" class="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 class="font-medium mb-1">Market Trends</h3>
              <p class="text-sm text-muted">
                Historical data, growth patterns, and predictive analytics for neighborhood evolution
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-map" class="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 class="font-medium mb-1">Spatial Analysis</h3>
              <p class="text-sm text-muted">
                Geographic data overlays, proximity analysis, and spatial relationships
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-layers" class="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 class="font-medium mb-1">Multi-Layer Data</h3>
              <p class="text-sm text-muted">
                Combine multiple data sources including transportation, amenities, and environmental factors
              </p>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">Get Started</h2>
      </template>
      <div class="space-y-4">
        <p class="text-muted">
          Start exploring neighborhoods with our 3D visualization tool to see detailed analytics in action.
        </p>
        <UButton
          to="/explore"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
        >
          Explore Neighborhoods
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Analytics - Neighbor'
})
</script>

