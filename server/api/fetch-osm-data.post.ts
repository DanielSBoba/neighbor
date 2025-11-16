import { fetchOsmDataRequestSchema, osmDataSchema } from '../../types/schemas/osm-data.schema'

const NOMINATIM_BASE = process.env.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org'
const OVERPASS_BASE = process.env.OVERPASS_BASE || 'https://overpass-api.de/api/interpreter'
const DEFAULT_RADIUS_M = 600

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event)
    const validationResult = fetchOsmDataRequestSchema.safeParse(body)

    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request parameters',
        data: validationResult.error.format()
      })
    }

    const { latitude, longitude, radius = DEFAULT_RADIUS_M } = validationResult.data

    // Fetch reverse geocoding data from Nominatim
    const reverseData = await fetchOsmReverse(latitude, longitude)

    // Fetch nearby POIs from Overpass API
    const overpassData = await fetchOverpassRadius(latitude, longitude, radius)

    // Extract and categorize highlights
    const highlights = extractOverpassHighlights(overpassData?.elements || [], { lat: latitude, lng: longitude })

    // Build response payload
    const payload = {
      input: { lat: latitude, lng: longitude, radius_m: radius },
      location: {
        display_name: reverseData?.display_name || null,
        city: reverseData?.address?.city || reverseData?.address?.town || reverseData?.address?.village || null,
        county: reverseData?.address?.county || null,
        state: reverseData?.address?.state || null,
        postcode: reverseData?.address?.postcode || null
      },
      highlights,
      fetched_at: new Date().toISOString()
    }

    // Validate response structure
    const responseValidation = osmDataSchema.safeParse(payload)

    if (!responseValidation.success) {
      console.error('Response validation error:', responseValidation.error.format())
      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid response structure',
        data: responseValidation.error.format()
      })
    }

    return {
      success: true,
      data: responseValidation.data
    }
  } catch (error: unknown) {
    // If it's already a createError, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('OSM data fetch error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch OSM data',
      data: error
    })
  }
})

// Helper: Fetch JSON with timeout
async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Neighbor-App/1.0' }
    })

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
    }

    return await resp.json()
  } finally {
    clearTimeout(timeout)
  }
}

// Helper: Reverse geocode using Nominatim
async function fetchOsmReverse(lat: number, lng: number) {
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&extratags=1`

  const data = await fetchJson(url)
  const { display_name, category, type, extratags = {}, address = {} } = data || {}

  return {
    display_name,
    category,
    type,
    address,
    extratags,
    source: url
  }
}

// Helper: Fetch nearby POIs using Overpass API
async function fetchOverpassRadius(lat: number, lng: number, radius: number) {
  const query = `[out:json][timeout:25];
    (
      node(around:${radius},${lat},${lng});
      way(around:${radius},${lat},${lng});
      relation(around:${radius},${lat},${lng});
    );
    out tags center;`

  const url = `${OVERPASS_BASE}?data=${encodeURIComponent(query)}`
  return fetchJson(url, 25000)
}

// Helper: Calculate distance using Haversine formula
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000 // Earth radius in meters

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(a))
}

// Helper: Extract and categorize POI highlights from Overpass data
function extractOverpassHighlights(elements: any[], origin: { lat: number, lng: number }) {
  interface POIItem {
    name: string
    distance_m: number | null
    geolocation: { lat: number, lng: number } | null
  }

  interface Buckets {
    bus_stops: POIItem[]
    subway_stations: POIItem[]
    schools: POIItem[]
    groceries: POIItem[]
    parks: POIItem[]
    churches: POIItem[]
  }

  const makeCoords = (el: any) => {
    if (el.lat != null && el.lon != null) {
      return { lat: el.lat, lng: el.lon }
    }
    if (el.center && el.center.lat != null && el.center.lon != null) {
      return { lat: el.center.lat, lng: el.center.lon }
    }
    return null
  }

  const mkItem = (el: any, nameFallback: string): POIItem => {
    const coords = makeCoords(el)
    const distance_m = coords
      ? Math.round(haversine(origin.lat, origin.lng, coords.lat, coords.lng))
      : null

    return {
      name: nameFallback,
      distance_m,
      geolocation: coords
    }
  }

  const buckets: Buckets = {
    bus_stops: [],
    subway_stations: [],
    schools: [],
    groceries: [],
    parks: [],
    churches: []
  }

  for (const el of elements) {
    const t = el.tags || {}

    // Bus stops
    if (t.highway === 'bus_stop' || t.bus === 'yes' || t.public_transport === 'platform') {
      const name = t.name || 'Bus stop'
      buckets.bus_stops.push(mkItem(el, name))
    }

    // Subway/metro stations
    if (t.railway === 'station' || t.railway === 'stop') {
      const name = t.name || 'Subway station'
      buckets.subway_stations.push(mkItem(el, name))
    }

    // Schools
    if (t.amenity === 'school') {
      buckets.schools.push(mkItem(el, t.name || 'School'))
    }

    // Parks and recreational areas
    if (t.leisure === 'park' || t.leisure === 'playground' || t.landuse === 'recreation_ground') {
      buckets.parks.push(mkItem(el, t.name || 'Park'))
    }

    // Grocery stores and markets
    if (
      t.shop === 'supermarket' ||
      t.shop === 'convenience' ||
      t.shop === 'greengrocer' ||
      t.shop === 'organic' ||
      t.amenity === 'marketplace'
    ) {
      buckets.groceries.push(mkItem(el, t.name || t.brand || 'Grocery'))
    }

    // Places of worship
    if (t.amenity === 'place_of_worship' || t.building === 'church') {
      buckets.churches.push(mkItem(el, t.name || 'Church'))
    }
  }

  // Deduplicate items based on name and location
  const dedupe = (arr: POIItem[]): POIItem[] => {
    const seen = new Set<string>()
    const out: POIItem[] = []

    for (const item of arr) {
      const key = `${item.name}|${item.geolocation ? item.geolocation.lat : ''}|${item.geolocation ? item.geolocation.lng : ''}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }

    return out
  }

  return {
    bus_stops: dedupe(buckets.bus_stops),
    subway_stations: dedupe(buckets.subway_stations),
    schools: dedupe(buckets.schools),
    groceries: dedupe(buckets.groceries),
    parks: dedupe(buckets.parks),
    churches: dedupe(buckets.churches)
  }
}

