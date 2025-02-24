import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface Agent {
  id: string
  position: THREE.Vector3
  target: THREE.Vector3
  type: 'blue' | 'red'
  speed: number
  state: {
    currentTask: string
    knowledge: any[]
    trustScore: number
  }
}

export const Agents = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const agentsRef = useRef<THREE.Group>(null)

  useEffect(() => {
    // Initialize agents
    const initialAgents: Agent[] = [
      // Blue agents (cooperative)
      ...Array.from({ length: 5 }, (_, i) => ({
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
          knowledge: [],
          trustScore: 1.0
        }
      })),
      // Red agents (adversarial)
      ...Array.from({ length: 3 }, (_, i) => ({
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
          currentTask: 'deceiving',
          knowledge: [],
          trustScore: 0.3
        }
      }))
    ]
    setAgents(initialAgents)
  }, [])

  useFrame((state, delta) => {
    // Update agent positions and behaviors
    setAgents(prevAgents => 
      prevAgents.map(agent => {
        const newPosition = agent.position.clone()
        const direction = agent.target.clone().sub(agent.position).normalize()
        newPosition.add(direction.multiplyScalar(agent.speed * delta))
        
        // If agent reached target, set new random target
        if (newPosition.distanceTo(agent.target) < 1) {
          return {
            ...agent,
            position: newPosition,
            target: new THREE.Vector3(
              Math.random() * 100 - 50,
              2,
              Math.random() * 100 - 50
            )
          }
        }
        
        return {
          ...agent,
          position: newPosition
        }
      })
    )
  })

  return (
    <group ref={agentsRef}>
      {agents.map(agent => (
        <mesh
          key={agent.id}
          position={agent.position}
        >
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial 
            color={agent.type === 'blue' ? '#2196F3' : '#f44336'} 
            emissive={agent.type === 'blue' ? '#1976D2' : '#D32F2F'}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
} 