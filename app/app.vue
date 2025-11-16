<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Neighbor - Neighborhood Analytics Platform'
const description = 'Explore and analyze neighborhoods with powerful 3D visualization, demographic insights, and comprehensive neighborhood data.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image'
})

const { toggle: toggleAnalysisSidebar, isOpen: isAnalysisSidebarOpen, analysisData } = useBuildingAnalysisSidebar()
const { toggle: toggleLocationSlideover, isOpen: isLocationSlideoverOpen } = useLocationSlideover()
</script>

<template>
  <UApp>
    <UHeader :toggle="false">
      <template #left>
        <NuxtLink to="/">
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>

        <UButton
          to="/explore"
          variant="ghost"
          color="neutral"
          size="sm"
          class="ml-2"
        >
          Explore
        </UButton>
        <UButton
          to="/analytics"
          variant="ghost"
          color="neutral"
          size="sm"
        >
          Analytics
        </UButton>
      </template>

      <template #right>
        <UButton
          v-if="$route.path === '/explore'"
          :icon="isLocationSlideoverOpen ? 'i-lucide-x' : 'i-lucide-settings'"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="toggleLocationSlideover"
        />
        <UButton
          v-if="$route.path === '/explore' && analysisData"
          :icon="isAnalysisSidebarOpen ? 'i-lucide-x' : 'i-lucide-menu'"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="toggleAnalysisSidebar"
        />
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
