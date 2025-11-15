import type { z } from 'zod'
import type {
  architecturalStyleSchema,
  facadeMaterialSchema,
  programTypeSchema,
  facadeMaterialMixSchema,
  programMixSchema,
  confidenceScoresSchema,
  buildingAnalysisSchema,
  buildingAnalysisResponseSchema,
  analyzeBuildingResponseSchema
} from './building-analysis.schema'

// Export types inferred from Zod schemas
export type ArchitecturalStyle = z.infer<typeof architecturalStyleSchema>
export type FacadeMaterial = z.infer<typeof facadeMaterialSchema>
export type ProgramType = z.infer<typeof programTypeSchema>
export type FacadeMaterialMix = z.infer<typeof facadeMaterialMixSchema>
export type ProgramMix = z.infer<typeof programMixSchema>
export type ConfidenceScores = z.infer<typeof confidenceScoresSchema>
export type BuildingAnalysis = z.infer<typeof buildingAnalysisSchema>
export type BuildingAnalysisResponse = z.infer<typeof buildingAnalysisResponseSchema>
export type AnalyzeBuildingResponse = z.infer<typeof analyzeBuildingResponseSchema>

// Additional types not covered by schemas
export interface AnalyzeBuildingRequest {
  address?: string
  images: Array<string | { url: string, detail?: 'auto' | 'low' | 'high' }>
}
