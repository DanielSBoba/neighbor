import type { BuildingAnalysis } from '../../types/building-analysis'

export const useBuildingAnalysisSidebar = () => {
  const isOpen = useState<boolean>('building-analysis-sidebar-open', () => false)
  const analysisData = useState<BuildingAnalysis | null>('building-analysis-data', () => null)

  const open = () => {
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  const setAnalysisData = (data: BuildingAnalysis | null) => {
    analysisData.value = data
  }

  return {
    isOpen,
    analysisData,
    open,
    close,
    toggle,
    setAnalysisData
  }
}

