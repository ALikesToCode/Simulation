import { defineStore } from 'pinia'
import * as THREE from 'three'

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

interface CityData {
  buildings: {
    id: string
    geometry: THREE.BufferGeometry
    height: number
    type: string
    properties: Record<string, any>
  }[]
  roads: {
    id: string
    path: { x: number; y: number; z: number }[]
    width: number
    type: string
  }[]
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
    cityData: null,
    stats: {
      blueAgentsSuccess: 0,
      redAgentsSuccess: 0,
      totalInteractions: 0,
      averageTrustScore: 0
    }
  }),

  actions: {
    async initializeSimulation() {
      const config = useRuntimeConfig()
      const { cityCenterLat, cityCenterLng, radius } = config.public.simulationSettings
      
      try {
        // Load city data
        const response = await fetch('/api/city/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            center: [cityCenterLat, cityCenterLng],
            radius
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch city data: ${response.statusText}`)
        }
        
        const data = await response.json()
        this.cityData = data

        // Initialize agents
        this.initializeAgents()
      } catch (error) {
        console.error('Failed to initialize simulation:', error)
        throw error
      }
    },

    initializeAgents() {
      const config = useRuntimeConfig()
      const { blueAgentsCount, redAgentsCount } = config.public.simulationSettings

      // Get random starting positions from walkable areas (roads)
      const walkablePositions = this.cityData?.roads.flatMap(road => 
        road.path.map(point => new THREE.Vector3(point.x, point.y || 2, point.z))
      ) || []
      
      const getRandomPosition = () => {
        if (walkablePositions.length === 0) {
          return new THREE.Vector3(
            Math.random() * 100 - 50,
            2,
            Math.random() * 100 - 50
          )
        }
        return walkablePositions[
          Math.floor(Math.random() * walkablePositions.length)
        ].clone()
      }

      const initialAgents: Agent[] = [
        // Blue agents (cooperative)
        ...Array.from({ length: blueAgentsCount }, (_, i) => {
          const position = getRandomPosition()
          return {
            id: `blue-${i}`,
            position,
            target: getRandomPosition(),
            type: 'blue' as const,
            speed: 0.5,
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
                reasoning: [],
                confidence: 1.0
              }
            }
          }
        }),
        // Red agents (adversarial)
        ...Array.from({ length: redAgentsCount }, (_, i) => {
          const position = getRandomPosition()
          return {
            id: `red-${i}`,
            position,
            target: getRandomPosition(),
            type: 'red' as const,
            speed: 0.6,
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
                reasoning: [],
                confidence: 1.0
              }
            }
          }
        })
      ]

      this.agents = initialAgents
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