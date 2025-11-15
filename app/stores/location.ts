import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    longitude: -73.9553126,
    latitude: 40.7200922,
    heightInFeet: 300,
    is3DView: true
  }),

  getters: {
    heightInMeters: (state) => state.heightInFeet * 0.3048
  },

  actions: {
    setLongitude(longitude: number) {
      this.longitude = longitude
    },

    setLatitude(latitude: number) {
      this.latitude = latitude
    },

    setHeightInFeet(heightInFeet: number) {
      this.heightInFeet = heightInFeet
    },

    setIs3DView(is3DView: boolean) {
      this.is3DView = is3DView
    },

    setLocation(longitude: number, latitude: number) {
      this.longitude = longitude
      this.latitude = latitude
    },

    resetView() {
      this.longitude = -73.9553126
      this.latitude = 40.7200922
      this.heightInFeet = 300
      this.is3DView = true
    }
  }
})

