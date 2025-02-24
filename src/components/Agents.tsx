import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { NavigationService } from '../services/NavigationService'
import { AIService } from '../services/AIService'
import { ConfigService } from '../services/ConfigService'

interface AgentState {
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

interface Agent {
  id: string
  position: THREE.Vector3
  target: THREE.Vector3
  type: 'blue' | 'red'
  speed: number
  state: AgentState
}

export const Agents = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const agentsRef = useRef<THREE.Group>(null)
  const navigationService = useRef<NavigationService>()
  const aiService = useRef(new AIService())
  const worldSize = new THREE.Vector2(5000, 5000)

  useEffect(() => {
    // Initialize navigation service
    navigationService.current = new NavigationService(
      worldSize,
      ConfigService.gridSize
    )

    // Initialize agents
    const initialAgents: Agent[] = [
      // Blue agents (cooperative)
      ...Array.from({ length: ConfigService.blueAgentsCount }, (_, i) => ({
        id: `blue-${i}`,
        position: new THREE.Vector3(
          Math.random() * 100 - 50,
          2,
          Math.random() * 100 - 50
        ),
        target: new THREE.Vector3(
          Math.random() * 100 - 50,
          2,
          Math.random() * 100 - 50
        ),
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
      })),
      // Red agents (adversarial)
      ...Array.from({ length: ConfigService.redAgentsCount }, (_, i) => ({
        id: `red-${i}`,
        position: new THREE.Vector3(
          Math.random() * 100 - 50,
          2,
          Math.random() * 100 - 50
        ),
        target: new THREE.Vector3(
          Math.random() * 100 - 50,
          2,
          Math.random() * 100 - 50
        ),
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
      }))
    ]
    setAgents(initialAgents)
  }, [])

  const updateAgentBehavior = async (agent: Agent): Promise<Agent> => {
    const nav = navigationService.current!
    const now = Date.now()

    // Check for nearby agents to interact with
    const nearbyAgents = agents.filter(other => 
      other.id !== agent.id &&
      other.position.distanceTo(agent.position) < 10 &&
      now - agent.state.lastInteractionTime > 5000 // 5 second cooldown
    )

    if (nearbyAgents.length > 0 && Math.random() < 0.3) {
      // Interact with nearby agent
      const target = nearbyAgents[0]
      const prompt = `
        You are a ${agent.type} agent in a multi-agent simulation.
        Your current state: ${JSON.stringify(agent.state)}
        You encounter agent ${target.id} of type ${target.type}.
        What do you do? Consider your objectives and past interactions.
      `

      const response = await aiService.current.getAgentResponse(
        'anthropic',
        prompt,
        { agent, target }
      )

      // Update agent state based on interaction
      return {
        ...agent,
        state: {
          ...agent.state,
          currentTask: 'interacting',
          interactionTarget: target.id,
          lastInteractionTime: now,
          lastDecision: {
            reasoning: response.reasoning,
            confidence: response.confidence
          },
          knowledge: {
            ...agent.state.knowledge,
            knownAgents: [
              ...new Set([...agent.state.knowledge.knownAgents, target.id])
            ],
            trustScores: {
              ...agent.state.knowledge.trustScores,
              [target.id]: (agent.state.knowledge.trustScores[target.id] || 0.5) +
                (response.confidence > 0.7 ? 0.1 : -0.1)
            }
          }
        }
      }
    }

    // Update path if needed
    if (
      agent.state.path.length === 0 ||
      agent.state.pathIndex >= agent.state.path.length
    ) {
      const newTarget = nav.getRandomNavigablePosition()
      const path = nav.findPath(agent.position, newTarget, agent.type)
      
      return {
        ...agent,
        target: newTarget,
        state: {
          ...agent.state,
          currentTask: 'navigating',
          path,
          pathIndex: 0
        }
      }
    }

    return agent
  }

  useFrame((state, delta) => {
    // Update agent positions and behaviors
    setAgents(prevAgents => 
      prevAgents.map(async agent => {
        // Update behavior
        const updatedAgent = await updateAgentBehavior(agent)
        
        // Move agent along path
        if (
          updatedAgent.state.path.length > 0 &&
          updatedAgent.state.pathIndex < updatedAgent.state.path.length
        ) {
          const targetPos = updatedAgent.state.path[updatedAgent.state.pathIndex]
          const newPosition = agent.position.clone()
          const direction = targetPos.clone().sub(agent.position).normalize()
          newPosition.add(direction.multiplyScalar(agent.speed * delta))

          // Check if reached current path point
          if (newPosition.distanceTo(targetPos) < 1) {
            return {
              ...updatedAgent,
              position: newPosition,
              state: {
                ...updatedAgent.state,
                pathIndex: updatedAgent.state.pathIndex + 1,
                knowledge: {
                  ...updatedAgent.state.knowledge,
                  visitedLocations: [
                    ...updatedAgent.state.knowledge.visitedLocations,
                    newPosition.clone()
                  ]
                }
              }
            }
          }

          return {
            ...updatedAgent,
            position: newPosition
          }
        }

        return updatedAgent
      })
    )
  })

  return (
    <group ref={agentsRef}>
      {agents.map(agent => (
        <group key={agent.id}>
          {/* Agent Body */}
          <mesh
            position={agent.position}
            castShadow={ConfigService.enableShadows}
          >
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial 
              color={agent.type === 'blue' ? '#2196F3' : '#f44336'} 
              emissive={agent.type === 'blue' ? '#1976D2' : '#D32F2F'}
              emissiveIntensity={0.5}
            />
          </mesh>

          {/* Path Visualization */}
          {ConfigService.enablePathVisualization && agent.state.path.length > 0 && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={agent.state.path.length}
                  array={new Float32Array(
                    agent.state.path.flatMap(v => [v.x, v.y + 0.1, v.z])
                  )}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={agent.type === 'blue' ? '#90CAF9' : '#FFCDD2'}
                opacity={0.5}
                transparent
              />
            </line>
          )}

          {/* Interaction Indicator */}
          {ConfigService.enableInteractionIndicators && 
           agent.state.currentTask === 'interacting' && (
            <mesh
              position={agent.position.clone().add(new THREE.Vector3(0, 2, 0))}
            >
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshBasicMaterial color="#FFD700" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
} 