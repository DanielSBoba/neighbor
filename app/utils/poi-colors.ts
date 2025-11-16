// Shared POI color scheme for consistent styling across the app
export const POI_COLORS = {
  subway_stations: '#3b82f6', // Blue
  bus_stops: '#10b981', // Green
  schools: '#f59e0b', // Amber
  groceries: '#8b5cf6', // Purple
  parks: '#22c55e', // Lime Green
  churches: '#ef4444' // Red
} as const

export type POICategory = keyof typeof POI_COLORS

export const getPOIColor = (category: string): string => {
  return POI_COLORS[category as POICategory] || '#ffffff'
}

export const formatPOICategoryName = (category: string): string => {
  return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

