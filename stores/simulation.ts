import { defineStore } from 'pinia'
import * as THREE from 'three'
import { useRuntimeConfig } from '#app'
import { NavigationService } from '~/services/NavigationService'

interface BuildingData {
  id: string
  position: {
    x: number
    y: number
    z: number
  }
  dimensions: {
    width: number
    height: number
    depth: number
  }
  type: string
  color: string
  name?: string
}

interface RoadData {
  id: string
  path: {
    x: number
    y: number
    z: number
  }[]
  width: number
  type: string
  name?: string
}

interface CityData {
  buildings: BuildingData[]
  roads: RoadData[]
  pois: any[]
  center?: { lat: number, lng: number }
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
    thoughts: {
      timestamp: number
      content: string
    }[]
    isHighlighted: boolean
    pathVisible: boolean
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
      roads: [],
      pois: [],
      center: { lat: 40.7831, lng: -73.9712 } // Default to Central Park, NYC
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
          },
          thoughts: [] as { timestamp: number, content: string }[],
          isHighlighted: false,
          pathVisible: false
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
          },
          thoughts: [] as { timestamp: number, content: string }[],
          isHighlighted: false,
          pathVisible: false
        }
      }))

      this.agents = [...blueAgents, ...redAgents]
    },

    async initializeSimulation() {
      try {
        // Check if we already have city data
        if (this.cityData && this.cityData.buildings && this.cityData.buildings.length > 0) {
          console.log('Simulation already initialized with city data')
          return
        }
        
        const config = useRuntimeConfig()
        const cityCenter = {
          lat: config.public.simulationSettings.cityCenterLat,
          lng: config.public.simulationSettings.cityCenterLng
        }
        
        // Fetch city data from the API
        const response = await fetch('/api/city/google-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            center: cityCenter,
            radius: config.public.simulationSettings.radius
          })
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch city data: ${response.statusText}`)
        }
        
        const data = await response.json()
        this.cityData = data
        
        console.log('Simulation initialized with city data:', data)
        return data
      } catch (error) {
        console.error('Failed to initialize simulation:', error)
        // Create some default city data if the API call fails
        this.createDefaultCityData()
        return this.cityData
      }
    },

    createDefaultCityData() {
      const config = useRuntimeConfig()
      const centerLat = config.public.simulationSettings.cityCenterLat
      const centerLng = config.public.simulationSettings.cityCenterLng
      
      // Create a simple grid of buildings
      const buildings: BuildingData[] = []
      const gridSize = 5
      const spacing = 50
      
      for (let i = -gridSize; i <= gridSize; i++) {
        for (let j = -gridSize; j <= gridSize; j++) {
          // Skip some buildings to create roads
          if (i === 0 || j === 0) continue
          
          const building: BuildingData = {
            id: `building_${buildings.length}`,
            name: `Building ${buildings.length}`,
            position: {
              x: i * spacing,
              y: 0,
              z: j * spacing
            },
            dimensions: {
              width: 20 + Math.random() * 20,
              height: 20 + Math.random() * 40,
              depth: 20 + Math.random() * 20
            },
            type: Math.random() > 0.7 ? 'commercial' : 'residential',
            color: Math.random() > 0.5 ? '#8899AA' : '#99AABB'
          }
          
          buildings.push(building)
        }
      }
      
      // Create some roads
      const roads: RoadData[] = [
        {
          id: 'road_0',
          name: 'Main Street',
          path: [
            { x: -gridSize * spacing, y: 0, z: 0 },
            { x: gridSize * spacing, y: 0, z: 0 }
          ],
          width: 10,
          type: 'road'
        },
        {
          id: 'road_1',
          name: 'Cross Street',
          path: [
            { x: 0, y: 0, z: -gridSize * spacing },
            { x: 0, y: 0, z: gridSize * spacing }
          ],
          width: 10,
          type: 'road'
        }
      ]
      
      this.cityData = {
        center: { lat: centerLat, lng: centerLng },
        buildings,
        roads,
        pois: []
      }
      
      console.log('Created default city data')
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
    },

    updateAgentPosition(agentId: string, position: THREE.Vector3) {
      const agent = this.agents.find(a => a.id === agentId)
      if (!agent) return
      
      // Update the agent's position
      agent.position.copy(position)
      
      // Reset the path since we're directly setting the position
      agent.state.path = []
      agent.state.pathIndex = 0
    },
    
    navigateAgentTo(agentId: string, targetPosition: THREE.Vector3) {
      const agent = this.agents.find(a => a.id === agentId)
      if (!agent) return
      
      // Set the target position
      agent.target.copy(targetPosition)
      
      // Calculate path using the navigation service
      const navigationService = new NavigationService(
        new THREE.Vector2(5000, 5000), // World size
        5 // Grid size
      )
      
      // Build navigation mesh if needed
      if (this.cityData && this.cityData.roads && this.cityData.buildings) {
        navigationService.buildNavigationMesh(this.cityData.roads, this.cityData.buildings)
        
        // Find path
        const path = navigationService.findPath(agent.position, targetPosition, agent.type)
        
        // Update agent's path
        agent.state.path = path
        agent.state.pathIndex = 0
        agent.state.currentTask = 'navigating'
      }
    },
    
    resetSimulation() {
      // Reset agents to initial positions
      this.agents.forEach(agent => {
        agent.position = new THREE.Vector3(
          Math.random() * 1000 - 500,
          0,
          Math.random() * 1000 - 500
        )
        agent.target = new THREE.Vector3().copy(agent.position)
        agent.state.path = []
        agent.state.pathIndex = 0
        agent.state.currentTask = 'exploring'
        agent.state.knowledge.visitedLocations = []
        agent.state.knowledge.knownAgents = []
        agent.state.knowledge.trustScores = {}
        agent.state.lastInteractionTime = 0
      })
      
      // Reset stats
      this.stats.blueAgentsSuccess = 0
      this.stats.redAgentsSuccess = 0
      this.stats.totalInteractions = 0
      this.stats.averageTrustScore = 0
      
      // Pause simulation
      this.isRunning = false
    },

    // Add a thought to an agent's chain of thoughts
    addAgentThought(agentId: string, content: string) {
      const agent = this.agents.find(a => a.id === agentId)
      if (!agent) return
      
      agent.state.thoughts.push({
        timestamp: Date.now(),
        content
      })
      
      // Limit the number of thoughts to keep memory usage reasonable
      if (agent.state.thoughts.length > 50) {
        agent.state.thoughts.shift() // Remove oldest thought
      }
    },
    
    // Highlight or unhighlight an agent
    toggleAgentHighlight(agentId: string, highlight?: boolean) {
      const agent = this.agents.find(a => a.id === agentId)
      if (!agent) return
      
      if (highlight !== undefined) {
        agent.state.isHighlighted = highlight
      } else {
        agent.state.isHighlighted = !agent.state.isHighlighted
      }
    },
    
    // Toggle the visibility of an agent's path
    toggleAgentPath(agentId: string, visible?: boolean) {
      const agent = this.agents.find(a => a.id === agentId)
      if (!agent) return
      
      if (visible !== undefined) {
        agent.state.pathVisible = visible
      } else {
        agent.state.pathVisible = !agent.state.pathVisible
      }
    },
    
    // Reset all highlights and path visibility
    resetAllHighlightsAndPaths() {
      this.agents.forEach(agent => {
        agent.state.isHighlighted = false
        agent.state.pathVisible = false
      })
    },

    // Convert world coordinates to latitude/longitude
    worldToLatLng(position: THREE.Vector3): google.maps.LatLngLiteral {
      const center = this.cityData?.center || { lat: 40.7831, lng: -73.9712 };
      
      // Scale factor (meters per world unit)
      const scale = 10;
      
      // Earth's radius in meters
      const earthRadius = 6378137;
      
      // Calculate offsets in meters
      const xOffset = position.x * scale;
      const zOffset = position.z * scale;
      
      // Convert to lat/lng
      const latOffset = (zOffset / earthRadius) * (180 / Math.PI);
      const lngOffset = (xOffset / (earthRadius * Math.cos(center.lat * Math.PI / 180))) * (180 / Math.PI);
      
      return {
        lat: center.lat + latOffset,
        lng: center.lng + lngOffset
      };
    },
    
    // Convert latitude/longitude to world coordinates
    latLngToWorld(latLng: google.maps.LatLngLiteral): THREE.Vector3 {
      const center = this.cityData?.center || { lat: 40.7831, lng: -73.9712 };
      
      // Scale factor (world units per meter)
      const scale = 0.1;
      
      // Earth's radius in meters
      const earthRadius = 6378137;
      
      // Calculate offsets in lat/lng
      const latOffset = latLng.lat - center.lat;
      const lngOffset = latLng.lng - center.lng;
      
      // Convert to meters
      const zOffset = latOffset * (Math.PI / 180) * earthRadius;
      const xOffset = lngOffset * (Math.PI / 180) * earthRadius * Math.cos(center.lat * Math.PI / 180);
      
      // Convert to world units
      return new THREE.Vector3(
        xOffset * scale,
        0, // y is always 0 (ground level)
        zOffset * scale
      );
    },
    
    // Setup simulation with start and end locations
    async setupSimulation(options: { startLocation: string, endLocation: string }) {
      try {
        // Initialize the simulation
        await this.initializeSimulation();
        
        let startLatLng, endLatLng;
        
        try {
          // Create a geocoder if needed
          const geocoder = new google.maps.Geocoder();
          
          // Geocode start location
          const startResult = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
            geocoder.geocode({ address: options.startLocation }, (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                resolve(results[0]);
              } else {
                reject(new Error(`Geocoding failed for ${options.startLocation}: ${status}`));
              }
            });
          });
          
          // Geocode end location
          const endResult = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
            geocoder.geocode({ address: options.endLocation }, (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                resolve(results[0]);
              } else {
                reject(new Error(`Geocoding failed for ${options.endLocation}: ${status}`));
              }
            });
          });
          
          // Get coordinates
          startLatLng = startResult.geometry.location.toJSON();
          endLatLng = endResult.geometry.location.toJSON();
        } catch (error) {
          console.warn('Geocoding failed, using default coordinates:', error);
          // Use default coordinates if geocoding fails
          startLatLng = { lat: 40.7580, lng: -73.9855 };
          endLatLng = { lat: 40.7680, lng: -73.9755 };
        }
        
        // Ensure cityData is initialized
        if (!this.cityData) {
          this.cityData = {
            buildings: [],
            roads: [],
            pois: [],
            center: { lat: 40.7831, lng: -73.9712 } // Default to Central Park, NYC
          };
        }
        
        // Set city center based on midpoint between start and end
        this.cityData.center = {
          lat: (startLatLng.lat + endLatLng.lat) / 2,
          lng: (startLatLng.lng + endLatLng.lng) / 2
        };
        
        // Convert to world coordinates
        const startPosition = this.latLngToWorld(startLatLng);
        const endPosition = this.latLngToWorld(endLatLng);
        
        // Create agents at start position
        this.agents = [];
        
        // Add a blue agent (player/friendly)
        this.agents.push({
          id: 'blue-agent-1',
          position: new THREE.Vector3(startPosition.x, 0, startPosition.z),
          target: new THREE.Vector3(endPosition.x, 0, endPosition.z),
          type: 'blue',
          speed: 0.5,
          state: {
            currentTask: 'navigating',
            knowledge: {
              visitedLocations: [],
              knownAgents: [],
              trustScores: {}
            },
            path: [new THREE.Vector3(endPosition.x, 0, endPosition.z)],
            pathIndex: 0,
            lastInteractionTime: 0,
            lastDecision: {
              reasoning: ['Initial navigation to target'],
              confidence: 1.0
            },
            thoughts: [{
              timestamp: Date.now(),
              content: `Starting my journey from ${options.startLocation} to ${options.endLocation}.`
            }],
            isHighlighted: false,
            pathVisible: false
          }
        });
        
        // Add a few red agents (adversaries)
        for (let i = 0; i < 3; i++) {
          // Random position near the path
          const t = Math.random();
          const randomOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 50,
            0,
            (Math.random() - 0.5) * 50
          );
          
          const basePosition = new THREE.Vector3().lerpVectors(
            startPosition,
            endPosition,
            t
          );
          
          const position = basePosition.clone().add(randomOffset);
          
          this.agents.push({
            id: `red-agent-${i+1}`,
            position: position,
            target: new THREE.Vector3(
              startPosition.x + (Math.random() - 0.5) * 100,
              0,
              startPosition.z + (Math.random() - 0.5) * 100
            ),
            type: 'red',
            speed: 0.3 + Math.random() * 0.4,
            state: {
              currentTask: 'exploring',
              knowledge: {
                visitedLocations: [],
                knownAgents: [],
                trustScores: {}
              },
              path: [],
              pathIndex: 0,
              lastInteractionTime: 0,
              lastDecision: {
                reasoning: ['Initial exploration'],
                confidence: 0.8
              },
              thoughts: [{
                timestamp: Date.now(),
                content: 'Searching for targets in the area.'
              }],
              isHighlighted: false,
              pathVisible: false
            }
          });
        }
        
        return true;
      } catch (error) {
        console.error('Error setting up simulation:', error);
        throw error;
      }
    }
  }
}) 