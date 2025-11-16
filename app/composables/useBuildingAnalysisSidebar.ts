import type { BuildingAnalysis } from '../../types/building-analysis'
import type { OSMData } from '../../types/osm-data'

export const useBuildingAnalysisSidebar = () => {
  const isOpen = useState<boolean>('building-analysis-sidebar-open', () => false)
  const analysisData = useState<BuildingAnalysis | null>('building-analysis-data', () => null)
  const osmData = useState<OSMData | null>('building-analysis-osm-data', () => null)

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

  const setOsmData = (data: OSMData | null) => {
    osmData.value = data
  }

  return {
    isOpen,
    analysisData,
    osmData,
    open,
    close,
    toggle,
    setAnalysisData,
    setOsmData
  }
}

