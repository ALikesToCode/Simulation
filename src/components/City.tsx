import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MapService } from '../services/MapService'
import { ConfigService } from '../services/ConfigService'

interface CityData {
  buildings: any[]
  roads: any[]
}

export const City = () => {
  const cityRef = useRef<THREE.Group>(null)
  const mapService = useRef(new MapService())
  const [cityData, setCityData] = useState<CityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCity = async () => {
      try {
        setIsLoading(true)
        const data = await mapService.current.loadMapData(
          ConfigService.cityCenter,
          ConfigService.simulationRadius
        )
        setCityData(data)
      } catch (error) {
        console.error('Failed to load city data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCity()
  }, [])

  // Create road meshes
  const createRoadMesh = (road: any) => {
    const points = road.path
    const roadGeometry = new THREE.BufferGeometry()
    
    // Create road surface
    const curve = new THREE.CatmullRomCurve3(points)
    const segments = Math.floor(curve.getLength() / 5) // One segment every 5 meters
    const positions = new Float32Array(segments * 3)
    const roadWidth = road.width / 2

    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1)
      const point = curve.getPoint(t)
      positions[i * 3] = point.x
      positions[i * 3 + 1] = 0.1 // Slightly above ground
      positions[i * 3 + 2] = point.z
    }

    roadGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    return (
      <mesh key={road.id}>
        <meshStandardMaterial 
          color="#333333"
          roughness={0.8}
          metalness={0.2}
        />
        {roadGeometry}
      </mesh>
    )
  }

  return (
    <group ref={cityRef}>
      {/* Ground */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow={ConfigService.enableShadows}
      >
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial 
          color="#4a4a4a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Buildings */}
      {cityData?.buildings.slice(0, ConfigService.maxVisibleBuildings).map((building) => (
        <mesh
          key={building.id}
          geometry={building.geometry}
          castShadow={ConfigService.enableShadows}
          receiveShadow={ConfigService.enableShadows}
        >
          <meshStandardMaterial 
            color={new THREE.Color().setHSL(Math.random(), 0.5, 0.5)}
            roughness={0.7}
            metalness={0.3}
          >
            {ConfigService.enableBuildingTextures && (
              <textureLoader url="/textures/building_facade.jpg" />
            )}
          </meshStandardMaterial>
        </mesh>
      ))}

      {/* Roads */}
      {cityData?.roads.map((road) => createRoadMesh(road))}

      {/* Loading Indicator */}
      {isLoading && (
        <mesh position={[0, 50, 0]}>
          <sphereGeometry args={[5, 32, 32]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
      )}
    </group>
  )
} 