// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true },
    '/cesium': { ssr: false }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            cesium: ['cesium']
          }
        }
      }
    },
    optimizeDeps: {
      include: ['cesium']
    }
  },

  runtimeConfig: {
    public: {
      cesiumIonToken: process.env.CESIUM_ION_TOKEN || '',
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
    }
  }
})
