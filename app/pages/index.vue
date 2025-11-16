<template>
  <div>
    <UPageHero
      title="Neighbor"
      description="Explore and analyze neighborhoods with powerful 3D visualization, comprehensive building insights, and real-time street views. Make informed decisions about your next location."
      :links="[{
        label: 'Start Exploring',
        to: '/explore',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'xl'
      }, {
        label: 'View Analytics',
        to: '/analytics',
        size: 'xl',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />

    <UPageSection
      id="features"
      title="Everything you need to explore neighborhoods"
      description="Neighbor combines cutting-edge 3D mapping technology with comprehensive building analysis to help you understand any neighborhood in detail."
      :features="[{
        icon: 'i-lucide-globe',
        title: '3D Interactive Maps',
        description: 'Navigate neighborhoods with stunning 3D visualization powered by Cesium. Explore terrain, buildings, and landmarks in immersive detail.'
      }, {
        icon: 'i-lucide-building-2',
        title: 'Building Analysis',
        description: 'Click any building to get instant insights including height, area, construction details, and comprehensive property information.'
      }, {
        icon: 'i-lucide-camera',
        title: 'Street View Integration',
        description: 'Seamlessly switch to Google Street View to see real photos of any location. Get a true feel for the neighborhood at ground level.'
      }, {
        icon: 'i-lucide-map-pin',
        title: 'Location Search',
        description: 'Quickly find any address or place. Jump to neighborhoods, buildings, and points of interest with powerful search capabilities.'
      }, {
        icon: 'i-lucide-layers',
        title: 'Rich Data Layers',
        description: 'Overlay demographic data, zoning information, and neighborhood statistics. See the complete picture of any area.'
      }, {
        icon: 'i-lucide-bar-chart-3',
        title: 'Analytics Dashboard',
        description: 'Access detailed analytics and trends for neighborhoods. Compare areas and track changes over time with powerful visualizations.'
      }]"
    />

    <UPageSection>
      <UPageCTA
        title="Ready to explore your neighborhood?"
        description="Discover insights about your current neighborhood or find your next perfect location with Neighbor's powerful analytics platform."
        variant="subtle"
        :links="[{
          label: 'Launch Explorer',
          to: '/explore',
          trailingIcon: 'i-lucide-map',
          color: 'neutral'
        }]"
      />
    </UPageSection>
  </div>
</template>
