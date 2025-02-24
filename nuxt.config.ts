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
      ]
    }
  },

  typescript: {
    strict: true,
    typeCheck: {
      eslint: {
        files: './**/*.{ts,js,vue}'
      }
    },
    tsConfig: {
      compilerOptions: {
        moduleResolution: "Bundler",
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        allowJs: true
      }
    }
  },

  vite: {
    optimizeDeps: {
      include: ['three', 'pathfinding'],
      exclude: ['@anthropic-ai/sdk', 'openai', 'formdata-node']
    },
    build: {
      rollupOptions: {
        output: {
          format: 'es'
        }
      }
    },
    esbuild: {
      supported: {
        'top-level-await': true
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }
  },

  nitro: {
    preset: 'node-server'
  },

  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    pineconeApiKey: process.env.PINECONE_API_KEY || '',
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
    public: {
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
        enableInteractionIndicators: process.env.ENABLE_INTERACTION_INDICATORS === 'true'
      },
      performanceSettings: {
        maxVisibleBuildings: Number(process.env.MAX_VISIBLE_BUILDINGS) || 1000,
        lodDistances: JSON.parse(process.env.LOD_DISTANCES || '[100,500,1000]'),
        enableFrustumCulling: process.env.ENABLE_FRUSTUM_CULLING === 'true'
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