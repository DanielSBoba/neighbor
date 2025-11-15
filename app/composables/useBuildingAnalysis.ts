import type { AnalyzeBuildingRequest, AnalyzeBuildingResponse } from '../../types/building-analysis'

export const useBuildingAnalysis = () => {
  const analyzeBuilding = async (
    address: string,
    images: Array<string | { url: string, detail?: 'auto' | 'low' | 'high' }>
  ) => {
    const { data, error } = await useFetch<AnalyzeBuildingResponse>(
      '/api/analyze-building',
      {
        method: 'POST',
        body: {
          address,
          images
        } as AnalyzeBuildingRequest
      }
    )

    if (error.value) {
      throw new Error(error.value.message || 'Failed to analyze building')
    }

    return data.value
  }

  return {
    analyzeBuilding
  }
}
