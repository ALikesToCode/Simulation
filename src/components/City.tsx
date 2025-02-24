import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface Building {
  position: [number, number, number]
  scale: [number, number, number]
}

export const City = () => {
  const cityRef = useRef<THREE.Group>(null)
  
  // Generate random buildings
  const buildings: Building[] = Array.from({ length: 100 }, () => ({
    position: [
      (Math.random() - 0.5) * 200,
      (Math.random() * 20) + 10,
      (Math.random() - 0.5) * 200
    ],
    scale: [
      Math.random() * 10 + 5,
      Math.random() * 50 + 10,
      Math.random() * 10 + 5
    ]
  }))

  // Ground plane geometry
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x404040,
    roughness: 0.8,
    metalness: 0.2
  })

  return (
    <group ref={cityRef}>
      {/* Ground */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color={0x404040} />
      </mesh>

      {/* Buildings */}
      {buildings.map((building, index) => (
        <mesh
          key={index}
          position={new THREE.Vector3(...building.position)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={building.scale} />
          <meshStandardMaterial 
            color={new THREE.Color().setHSL(Math.random(), 0.5, 0.5)} 
          />
        </mesh>
      ))}
    </group>
  )
} 