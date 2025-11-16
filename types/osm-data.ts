import type { z } from 'zod'
import type {
  geolocationSchema,
  poiItemSchema,
  highlightsSchema,
  locationInfoSchema,
  osmDataSchema,
  fetchOsmDataRequestSchema,
  fetchOsmDataResponseSchema
} from './schemas/osm-data.schema'

// Export types inferred from Zod schemas
export type Geolocation = z.infer<typeof geolocationSchema>
export type POIItem = z.infer<typeof poiItemSchema>
export type Highlights = z.infer<typeof highlightsSchema>
export type LocationInfo = z.infer<typeof locationInfoSchema>
export type OSMData = z.infer<typeof osmDataSchema>
export type FetchOsmDataRequest = z.infer<typeof fetchOsmDataRequestSchema>
export type FetchOsmDataResponse = z.infer<typeof fetchOsmDataResponseSchema>

