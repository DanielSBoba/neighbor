import { z } from 'zod'

// Geolocation schema
export const geolocationSchema = z.object({
  lat: z.number(),
  lng: z.number()
})

// POI (Point of Interest) item schema
export const poiItemSchema = z.object({
  name: z.string(),
  distance_m: z.number().nullable(),
  geolocation: geolocationSchema.nullable()
})

// Highlights schema - categories of nearby amenities
export const highlightsSchema = z.object({
  bus_stops: z.array(poiItemSchema),
  subway_stations: z.array(poiItemSchema),
  schools: z.array(poiItemSchema),
  groceries: z.array(poiItemSchema),
  parks: z.array(poiItemSchema),
  churches: z.array(poiItemSchema)
})

// Location info schema
export const locationInfoSchema = z.object({
  display_name: z.string().nullable(),
  city: z.string().nullable(),
  county: z.string().nullable(),
  state: z.string().nullable(),
  postcode: z.string().nullable()
})

// OSM data response schema
export const osmDataSchema = z.object({
  input: z.object({
    lat: z.number(),
    lng: z.number(),
    radius_m: z.number()
  }),
  location: locationInfoSchema,
  highlights: highlightsSchema,
  fetched_at: z.string()
})

// API request schema
export const fetchOsmDataRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().optional()
})

// API response schema
export const fetchOsmDataResponseSchema = z.object({
  success: z.boolean(),
  data: osmDataSchema.nullable(),
  error: z.string().optional()
})

