import { z } from 'zod'

// Architectural style enum
export const architecturalStyleSchema = z.enum([
  'prewar_masonry',
  'art_deco',
  'modernist',
  'brutalist',
  'postmodern',
  'postwar_commercial',
  'contemporary_glass',
  'industrial_loft',
  'townhouse_rowhouse',
  'vernacular_other',
  'unknown'
])

// Facade material enum
export const facadeMaterialSchema = z.enum([
  'glass',
  'brick',
  'stone',
  'concrete',
  'metal_panel',
  'composite_panel',
  'stucco',
  'wood',
  'terracotta',
  'other'
])

// Program type enum
export const programTypeSchema = z.enum([
  'residential',
  'office',
  'retail',
  'hotel',
  'industrial',
  'parking',
  'institutional',
  'civic',
  'community',
  'mechanical_other',
  'unknown'
])

// Facade material mix item
export const facadeMaterialMixSchema = z.object({
  material: facadeMaterialSchema,
  percent: z.number().min(0).max(100)
})

// Program mix item
export const programMixSchema = z.object({
  program: programTypeSchema,
  percent: z.number().min(0).max(100)
})

// Confidence scores
export const confidenceScoresSchema = z.object({
  num_floors: z.number().min(0).max(1),
  window_to_wall_ratio: z.number().min(0).max(1),
  architectural_style: z.number().min(0).max(1),
  estimated_building_age: z.number().min(0).max(1),
  facade_material_mix: z.number().min(0).max(1),
  program_mix: z.number().min(0).max(1)
})

// Building analysis main schema
export const buildingAnalysisSchema = z.object({
  address: z.string(),
  num_floors: z.number().int().positive(),
  window_to_wall_ratio: z.number().min(0).max(1),
  architectural_style: architecturalStyleSchema,
  architectural_style_add: z.string(),
  estimated_building_age: z.string(),
  facade_material_mix: z.array(facadeMaterialMixSchema).min(1),
  program_mix: z.array(programMixSchema).min(1),
  confidence_scores: confidenceScoresSchema,
  notes: z.string()
})

// Building analysis response schema (handles both direct and wrapped responses)
export const buildingAnalysisResponseSchema = z.union([
  // Direct format: { combined_matrix: {...} }
  z.object({
    combined_matrix: buildingAnalysisSchema
  }),
  // Wrapped format from OpenAI: { schema: { combined_matrix: {...} } }
  z.object({
    version: z.string().optional(),
    description: z.string().optional(),
    schema: z.object({
      combined_matrix: buildingAnalysisSchema
    })
  })
])

// API response schema
export const analyzeBuildingResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    combined_matrix: buildingAnalysisSchema
  }).nullable(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  }).optional()
})

