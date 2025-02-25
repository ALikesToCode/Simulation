// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  ssr: false,

  app: {
    head: {
      title: 'Multi-Agent Simulation',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      script: [
        {
          src: `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places,geometry`,
          defer: true
        }
      ]
    }
  },

  typescript: {
    strict: true,
    typeCheck: true
  },

  vite: {
    optimizeDeps: {
      include: [
        'three',
        'pathfinding',
        '@googlemaps/google-maps-services-js'
      ],
      exclude: ['@anthropic-ai/sdk', 'openai', 'formdata-node']
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 600
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }
  },

  nitro: {
    preset: 'vercel',
    output: {
      dir: 'dist',
      serverDir: 'dist/server',
      publicDir: 'dist/public'
    }
  },

  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    pineconeApiKey: process.env.PINECONE_API_KEY || '',
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
    nycOpenDataToken: process.env.NYC_OPEN_DATA_TOKEN || '',
    osmUserAgent: process.env.OSM_USER_AGENT || '',
    public: {
      apiUrl: process.env.VITE_API_URL || 'http://localhost:3002',
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      nycOpenDataToken: process.env.NYC_OPEN_DATA_TOKEN || '',
      simulationSettings: {
        cityCenterLat: Number(process.env.SIMULATION_CITY_CENTER_LAT) || 40.7580,
        cityCenterLng: Number(process.env.SIMULATION_CITY_CENTER_LNG) || -73.9855,
        radius: Number(process.env.SIMULATION_RADIUS) || 1000,
        gridSize: Number(process.env.SIMULATION_GRID_SIZE) || 5,
        blueAgentsCount: Number(process.env.BLUE_AGENTS_COUNT) || 5,
        redAgentsCount: Number(process.env.RED_AGENTS_COUNT) || 3
      },
      visualSettings: {
        enableShadows: process.env.ENABLE_SHADOWS === 'true',
        enablePathVisualization: process.env.ENABLE_PATH_VISUALIZATION === 'true',
        enableInteractionIndicators: process.env.ENABLE_INTERACTION_INDICATORS === 'true',
        enableTerrain: process.env.ENABLE_TERRAIN === 'true',
        enableWaterFeatures: process.env.ENABLE_WATER_FEATURES === 'true',
        mapDetailLevel: process.env.MAP_DETAIL_LEVEL || 'high'
      },
      performanceSettings: {
        maxVisibleBuildings: Number(process.env.MAX_VISIBLE_BUILDINGS) || 1000,
        lodDistances: JSON.parse(process.env.LOD_DISTANCES || '[100,500,1000]'),
        enableFrustumCulling: process.env.ENABLE_FRUSTUM_CULLING === 'true',
        enableOcclusionCulling: process.env.ENABLE_OCCLUSION_CULLING === 'true',
        enableGeometryInstancing: process.env.ENABLE_GEOMETRY_INSTANCING === 'true',
        chunkSize: Number(process.env.CHUNK_SIZE) || 100,
        workerCount: Number(process.env.WORKER_COUNT) || 4,
        geometryCacheSize: Number(process.env.GEOMETRY_CACHE_SIZE) || 500
      },
      mapSettings: {
        style: process.env.MAP_STYLE || 'dark',
        enableBuildingTextures: process.env.ENABLE_BUILDING_TEXTURES === 'true',
        enableRoadLabels: process.env.ENABLE_ROAD_LABELS === 'true'
      }
    }
  },

  compatibilityDate: '2025-02-24'
})