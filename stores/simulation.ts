import { defineStore } from 'pinia'
import * as THREE from 'three'
import { useRuntimeConfig } from '#app'

interface BuildingData {
  id: string
  geometry: THREE.BufferGeometry
  height: number
  type: string
  properties: Record<string, any>
  source?: string
}

interface RoadData {
  id: string
  path: { x: number; y: number; z: number }[]
  width: number
  type: string
}

interface CityData {
  buildings: BuildingData[]
  roads: RoadData[]
}

interface Agent {
  id: string
  position: THREE.Vector3
  target: THREE.Vector3
  type: 'blue' | 'red'
  speed: number
  state: {
    currentTask: 'exploring' | 'navigating' | 'interacting' | 'deceiving'
    knowledge: {
      visitedLocations: THREE.Vector3[]
      knownAgents: string[]
      trustScores: Record<string, number>
    }
    path: THREE.Vector3[]
    pathIndex: number
    interactionTarget?: string
    lastInteractionTime: number
    lastDecision: {
      reasoning: string[]
      confidence: number
    }
  }
}

interface SimulationState {
  agents: Agent[]
  isRunning: boolean
  cityData: CityData | null
  stats: {
    blueAgentsSuccess: number
    redAgentsSuccess: number
    totalInteractions: number
    averageTrustScore: number
  }
}

export const useSimulationStore = defineStore('simulation', {
  state: (): SimulationState => ({
    agents: [],
    isRunning: false,
    cityData: {
      buildings: [],
      roads: []
    },
    stats: {
      blueAgentsSuccess: 0,
      redAgentsSuccess: 0,
      totalInteractions: 0,
      averageTrustScore: 0
    }
  }),

  actions: {
    initializeAgents() {
      const config = useRuntimeConfig()
      const { blueAgentsCount, redAgentsCount } = config.public.simulationSettings

      const blueAgents = Array.from({ length: blueAgentsCount }, (_, i) => ({
        id: `blue_${i}`,
        position: new THREE.Vector3(0, 0, 0),
        target: new THREE.Vector3(0, 0, 0),
        type: 'blue' as const,
        speed: 1,
        state: {
          currentTask: 'exploring' as const,
          knowledge: {
            visitedLocations: [] as THREE.Vector3[],
            knownAgents: [] as string[],
            trustScores: {} as Record<string, number>
          },
          path: [] as THREE.Vector3[],
          pathIndex: 0,
          lastInteractionTime: 0,
          lastDecision: {
            reasoning: [] as string[],
            confidence: 1
          }
        }
      }))

      const redAgents = Array.from({ length: redAgentsCount }, (_, i) => ({
        id: `red_${i}`,
        position: new THREE.Vector3(0, 0, 0),
        target: new THREE.Vector3(0, 0, 0),
        type: 'red' as const,
        speed: 1,
        state: {
          currentTask: 'exploring' as const,
          knowledge: {
            visitedLocations: [] as THREE.Vector3[],
            knownAgents: [] as string[],
            trustScores: {} as Record<string, number>
          },
          path: [] as THREE.Vector3[],
          pathIndex: 0,
          lastInteractionTime: 0,
          lastDecision: {
            reasoning: [] as string[],
            confidence: 1
          }
        }
      }))

      this.agents = [...blueAgents, ...redAgents]
    },

    async initializeSimulation() {
      const config = useRuntimeConfig()
      const { cityCenterLat, cityCenterLng, radius } = config.public.simulationSettings
      
      try {
        // Load city data from multiple sources in parallel
        const [osmData, nycData, googleData] = await Promise.all([
          // OpenStreetMap data
          fetch('/api/city/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              center: [cityCenterLat, cityCenterLng],
              radius,
              source: 'osm'
            })
          }).then(res => res.json()),

          // NYC Open Data
          fetch('https://data.cityofnewyork.us/resource/nqwf-w8eh.json', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-App-Token': config.public.nycOpenDataToken || ''
            }
          }).then(res => res.json()).catch(() => ({ features: [] })),

          // Google Maps data
          fetch('/api/city/google-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              center: [cityCenterLat, cityCenterLng],
              radius
            })
          }).then(res => res.json()).catch(() => ({ buildings: [], roads: [] }))
        ])

        // Process building geometries with performance optimizations
        const processBuilding = (building: Record<string, any>, source: string): BuildingData | null => {
          try {
            let geometry: THREE.BufferGeometry
            let height = building.height || 10

            if (source === 'osm') {
              // Process OpenStreetMap building
              const shape = new THREE.Shape()
              const coordinates = building.nodes?.map((node: { lon: number; lat: number }) => 
                new THREE.Vector2(
                  (node.lon - cityCenterLng) * 111000,
                  (node.lat - cityCenterLat) * 111000
                )
              ) || []

              if (coordinates.length >= 3) {
                shape.moveTo(coordinates[0].x, coordinates[0].y)
                coordinates.slice(1).forEach((coord: THREE.Vector2) => shape.lineTo(coord.x, coord.y))
                shape.closePath()
                geometry = new THREE.ExtrudeGeometry(shape, {
                  depth: height,
                  bevelEnabled: false
                })
              } else {
                geometry = new THREE.BoxGeometry(10, height, 10)
              }
            } else if (source === 'nyc') {
              // Process NYC Open Data building
              const shape = new THREE.Shape()
              const coordinates = building.the_geom?.coordinates?.[0]?.map((coord: number[]) =>
                new THREE.Vector2(
                  (coord[0] - cityCenterLng) * 111000,
                  (coord[1] - cityCenterLat) * 111000
                )
              ) || []

              if (coordinates.length >= 3) {
                shape.moveTo(coordinates[0].x, coordinates[0].y)
                coordinates.slice(1).forEach((coord: THREE.Vector2) => shape.lineTo(coord.x, coord.y))
                shape.closePath()
                height = building.heightroof || building.heightroof_median || 10
                geometry = new THREE.ExtrudeGeometry(shape, {
                  depth: height,
                  bevelEnabled: false
                })
              } else {
                geometry = new THREE.BoxGeometry(10, height, 10)
              }
            } else {
              // Default or Google Maps building
              geometry = new THREE.BoxGeometry(
                building.width || 10,
                height,
                building.depth || 10
              )
            }

            // Apply performance optimizations
            geometry.computeBoundingSphere()
            geometry.computeVertexNormals()
            
            return {
              id: building.id || Math.random().toString(36).substr(2),
              geometry,
              height,
              type: building.type || 'building',
              properties: building.properties || {},
              source
            }
          } catch (error) {
            console.error('Error processing building:', error)
            return null
          }
        }

        // Process buildings from all sources
        const buildings = (await Promise.all([
          ...osmData.buildings.map((b: Record<string, any>) => processBuilding(b, 'osm')),
          ...nycData.features.map((b: Record<string, any>) => processBuilding(b, 'nyc')),
          ...googleData.buildings.map((b: Record<string, any>) => processBuilding(b, 'google'))
        ])).filter((b): b is BuildingData => b !== null)

        // Process roads with performance optimizations
        const roads = [...osmData.roads, ...googleData.roads].map((road: Record<string, any>): RoadData | null => {
          try {
            return {
              id: road.id,
              path: road.path.map((point: Record<string, any>) => ({
                x: (point.lon || point.x - cityCenterLng) * 111000,
                y: point.y || 0,
                z: (point.lat || point.z - cityCenterLat) * 111000
              })),
              width: road.width || 4,
              type: road.type || 'road'
            }
          } catch (error) {
            console.error('Error processing road:', error)
            return null
          }
        }).filter((r): r is RoadData => r !== null)

        this.cityData = {
          buildings: buildings.slice(0, config.public.performanceSettings.maxVisibleBuildings),
          roads
        }

        // Initialize agents
        this.initializeAgents()
      } catch (error) {
        console.error('Failed to initialize simulation:', error)
        throw error
      }
    },

    startSimulation() {
      this.isRunning = true
    },

    pauseSimulation() {
      this.isRunning = false
    },

    async updateAgents() {
      if (!this.isRunning) return

      for (const agent of this.agents) {
        try {
          // Check for nearby agents to interact with
          const nearbyAgents = this.agents.filter(other => 
            other.id !== agent.id &&
            other.position.distanceTo(agent.position) < 10 &&
            Date.now() - agent.state.lastInteractionTime > 5000
          )

          if (nearbyAgents.length > 0 && Math.random() < 0.3) {
            // Interact with nearby agent
            const target = nearbyAgents[0]
            const response = await fetch('/api/agent/response', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                provider: 'anthropic',
                prompt: `
                  You are a ${agent.type} agent in a multi-agent simulation.
                  Your current state: ${JSON.stringify(agent.state)}
                  You encounter agent ${target.id} of type ${target.type}.
                  What do you do? Consider your objectives and past interactions.
                `,
                context: { agent, target }
              })
            })

            if (!response.ok) {
              throw new Error(`Failed to get agent response: ${response.statusText}`)
            }

            const result = await response.json()

            // Update agent state based on interaction
            agent.state.currentTask = 'interacting'
            agent.state.interactionTarget = target.id
            agent.state.lastInteractionTime = Date.now()
            agent.state.lastDecision = {
              reasoning: result.reasoning,
              confidence: result.confidence
            }
            agent.state.knowledge.knownAgents = [
              ...new Set([...agent.state.knowledge.knownAgents, target.id])
            ]
            agent.state.knowledge.trustScores[target.id] = (
              agent.state.knowledge.trustScores[target.id] || 0.5
            ) + (result.confidence > 0.7 ? 0.1 : -0.1)
          }

          // Update path if needed
          if (
            agent.state.path.length === 0 ||
            agent.state.pathIndex >= agent.state.path.length
          ) {
            const response = await fetch('/api/navigation/path', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                position: agent.position,
                type: agent.type
              })
            })

            if (!response.ok) {
              throw new Error(`Failed to get navigation path: ${response.statusText}`)
            }

            const result = await response.json()
            agent.target = new THREE.Vector3(
              result.target.x,
              result.target.y,
              result.target.z
            )
            agent.state.path = result.path.map((point: any) => 
              new THREE.Vector3(point.x, point.y, point.z)
            )
            agent.state.pathIndex = 0
            agent.state.currentTask = 'navigating'
          }

          // Move agent along path
          if (
            agent.state.path.length > 0 &&
            agent.state.pathIndex < agent.state.path.length
          ) {
            const targetPos = agent.state.path[agent.state.pathIndex]
            const direction = targetPos.clone()
              .sub(agent.position)
              .normalize()
            
            agent.position.add(
              direction.multiplyScalar(agent.speed)
            )

            // Check if reached current path point
            if (agent.position.distanceTo(targetPos) < 1) {
              agent.state.pathIndex++
              agent.state.knowledge.visitedLocations.push(
                agent.position.clone().setY(2) // Ensure consistent Y position
              )
            }
          }
        } catch (error) {
          console.error(`Error updating agent ${agent.id}:`, error)
        }
      }

      // Update statistics
      this.updateStats()
    },

    updateStats() {
      const blueAgents = this.agents.filter(a => a.type === 'blue')
      const redAgents = this.agents.filter(a => a.type === 'red')

      this.stats = {
        blueAgentsSuccess: blueAgents.reduce((sum, agent) => 
          sum + (agent.state.knowledge.visitedLocations.length > 0 ? 1 : 0), 0),
        redAgentsSuccess: redAgents.reduce((sum, agent) =>
          sum + Object.values(agent.state.knowledge.trustScores)
            .filter(score => score < 0.3).length, 0),
        totalInteractions: this.agents.reduce((sum, agent) =>
          sum + agent.state.knowledge.knownAgents.length, 0),
        averageTrustScore: this.agents.reduce((sum, agent) =>
          sum + Object.values(agent.state.knowledge.trustScores)
            .reduce((a, b) => a + b, 0) / 
            Math.max(Object.keys(agent.state.knowledge.trustScores).length, 1), 0) /
          this.agents.length
      }
    }
  }
}) 