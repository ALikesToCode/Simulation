import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { City } from './City'
import { Agents } from './Agents'

export const SimulationEnvironment = () => {
  return (
    <Canvas
      camera={{ position: [0, 100, 100], fov: 75 }}
      style={{ height: '100vh' }}
    >
      <Suspense fallback={null}>
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {/* City Model */}
        <City />
        
        {/* Agents */}
        <Agents />
        
        {/* Controls */}
        <OrbitControls />
      </Suspense>
    </Canvas>
  )
} 