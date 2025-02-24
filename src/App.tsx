import { useEffect, useState } from 'react'
import { SimulationEnvironment } from './components/SimulationEnvironment'
import { AIService } from './services/AIService'

export const App = () => {
  const [aiService] = useState(() => new AIService())
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  const [simulationStats, setSimulationStats] = useState({
    blueAgentsSuccess: 0,
    redAgentsSuccess: 0,
    totalInteractions: 0,
    averageTrustScore: 0
  })

  useEffect(() => {
    const initializeAI = async () => {
      try {
        await aiService.init()
      } catch (error) {
        console.error('Failed to initialize AI service:', error)
      }
    }

    initializeAI()
  }, [aiService])

  const startSimulation = () => {
    setIsSimulationRunning(true)
  }

  const pauseSimulation = () => {
    setIsSimulationRunning(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Control Panel */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          padding: 20,
          borderRadius: 8,
          color: 'white',
          zIndex: 1000
        }}
      >
        <h2>Simulation Controls</h2>
        <button
          onClick={isSimulationRunning ? pauseSimulation : startSimulation}
          style={{
            padding: '8px 16px',
            margin: '8px 0',
            background: isSimulationRunning ? '#f44336' : '#4CAF50',
            border: 'none',
            borderRadius: 4,
            color: 'white',
            cursor: 'pointer'
          }}
        >
          {isSimulationRunning ? 'Pause Simulation' : 'Start Simulation'}
        </button>

        <div style={{ marginTop: 20 }}>
          <h3>Statistics</h3>
          <p>Blue Agents Success: {simulationStats.blueAgentsSuccess}</p>
          <p>Red Agents Success: {simulationStats.redAgentsSuccess}</p>
          <p>Total Interactions: {simulationStats.totalInteractions}</p>
          <p>
            Average Trust Score:{' '}
            {simulationStats.averageTrustScore.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 3D Environment */}
      <SimulationEnvironment />
    </div>
  )
} 