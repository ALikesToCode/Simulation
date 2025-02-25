<template>
  <div class="integrated-simulation" :class="{ 'split': isSplitView }">
    <div class="view-container">
      <div class="map-view" :class="{ 'active': activeView === 'map' }">
        <GoogleMap3D ref="mapRef" @map-click="handleMapClick" />
      </div>
      <div class="simulation-view" :class="{ 'active': activeView === 'simulation' }">
        <SimulationEnvironment ref="simulationRef" @simulation-click="handleSimulationClick" />
      </div>
    </div>
    
    <button class="controls-toggle" @click="toggleControlsPanel">
      ⚙️
    </button>
    
    <div class="controls-panel" :class="{ 'mobile-open': controlsPanelOpen }">
      <div class="view-controls">
        <button @click="setActiveView('map')" :class="{ 'active': activeView === 'map' }">Map View</button>
        <button @click="setActiveView('simulation')" :class="{ 'active': activeView === 'simulation' }">Simulation View</button>
        <button @click="toggleSplit">{{ isSplitView ? 'Single View' : 'Split View' }}</button>
      </div>
      
      <div class="agents-section">
        <div class="agents-list-container">
          <AgentList 
            :agents="agents" 
            :selectedAgentId="selectedAgentId"
            @select="selectAgent"
          />
        </div>
        
        <div class="agent-details-container">
          <AgentDetails 
            :agent="selectedAgent" 
            :showingPath="isShowingPath"
            @focus="focusOnAgent"
            @show-path="toggleAgentPath"
          />
        </div>
      </div>
      
      <div class="movement-controls" v-if="selectedAgentId">
        <h4>Movement</h4>
        <div class="movement-buttons">
          <button @click="moveAgent('up')">↑</button>
          <div class="horizontal-buttons">
            <button @click="moveAgent('left')">←</button>
            <button @click="moveAgent('right')">→</button>
          </div>
          <button @click="moveAgent('down')">↓</button>
        </div>
        <div class="movement-mode">
          <label>
            <input type="checkbox" v-model="freeMovement" />
            Free Movement
          </label>
        </div>
        
        <!-- Location input for blue agents -->
        <div class="location-input" v-if="selectedAgent?.type === 'blue'">
          <h4>Enter Location</h4>
          <div class="coordinate-inputs">
            <div class="input-group">
              <label for="location-x">X:</label>
              <input 
                type="number" 
                id="location-x" 
                v-model="locationInput.x" 
                placeholder="X coordinate"
              />
            </div>
            <div class="input-group">
              <label for="location-z">Z:</label>
              <input 
                type="number" 
                id="location-z" 
                v-model="locationInput.z" 
                placeholder="Z coordinate"
              />
            </div>
          </div>
          <button @click="moveToLocation" class="move-button">Move to Location</button>
        </div>
        
        <!-- Address search for blue agents -->
        <div class="address-search" v-if="selectedAgent?.type === 'blue'">
          <h4>Search Address</h4>
          <div class="search-input">
            <input 
              type="text" 
              v-model="addressInput" 
              placeholder="Enter address or place"
              @keyup.enter="searchAddress"
            />
            <button @click="searchAddress" class="search-button">Search</button>
          </div>
        </div>
      </div>
      
      <div class="simulation-controls">
        <button @click="startSimulation" :disabled="isRunning">Start</button>
        <button @click="pauseSimulation" :disabled="!isRunning">Pause</button>
        <button @click="resetSimulation">Reset</button>
      </div>
      
      <!-- Movement visualization -->
      <div class="movement-visualization" v-if="selectedAgent && selectedAgent.state && selectedAgent.state.path && selectedAgent.state.path.length > 0">
        <h3>Agent Path</h3>
        <div class="path-info">
          <div>Current position: ({{ selectedAgent.position ? Math.round(selectedAgent.position.x) : 0 }}, {{ selectedAgent.position ? Math.round(selectedAgent.position.z) : 0 }})</div>
          <div>Target: ({{ selectedAgent.target ? Math.round(selectedAgent.target.x) : 0 }}, {{ selectedAgent.target ? Math.round(selectedAgent.target.z) : 0 }})</div>
          <div>Path points: {{ selectedAgent.state.path.length }}</div>
          <div>Progress: {{ selectedAgent.state.pathIndex || 0 }} / {{ selectedAgent.state.path.length }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulationStore } from '~/stores/simulation'
import GoogleMap3D from './GoogleMap3D.vue'
import SimulationEnvironment from './SimulationEnvironment.vue'
import AgentList from './AgentList.vue'
import AgentDetails from './AgentDetails.vue'
import * as THREE from 'three'

// References to child components
const mapRef = ref<InstanceType<typeof GoogleMap3D> | null>(null)
const simulationRef = ref<InstanceType<typeof SimulationEnvironment> | null>(null)

// View state
const activeView = ref<'map' | 'simulation'>('simulation')
const isSplitView = ref(false)
const controlsPanelOpen = ref(false)

// Agent selection and movement
const selectedAgentId = ref<string | null>(null)
const freeMovement = ref(false)
const movementSpeed = 5 // Units per movement
const isShowingPath = ref(false)

// Location input
const locationInput = ref({ x: 0, z: 0 })
const addressInput = ref('')
const geocoder = ref<google.maps.Geocoder | null>(null)

// Store
const simulationStore = useSimulationStore()
const { agents, isRunning, cityData } = storeToRefs(simulationStore)

// Computed properties
const selectedAgent = computed(() => {
  if (!selectedAgentId.value) return null
  return agents.value.find(a => a.id === selectedAgentId.value) || null
})

// Methods
const setActiveView = (view: 'map' | 'simulation') => {
  activeView.value = view
}

const toggleSplit = () => {
  isSplitView.value = !isSplitView.value
}

const toggleControlsPanel = () => {
  controlsPanelOpen.value = !controlsPanelOpen.value
}

const selectAgent = (agentId: string) => {
  // If selecting the same agent, deselect it
  if (selectedAgentId.value === agentId) {
    selectedAgentId.value = null
    simulationStore.resetAllHighlightsAndPaths()
    isShowingPath.value = false
    return
  }
  
  // Reset previous agent highlights and paths
  simulationStore.resetAllHighlightsAndPaths()
  
  // Set new selection
  selectedAgentId.value = agentId
  isShowingPath.value = false
  
  const agent = agents.value.find(a => a.id === agentId)
  if (agent) {
    // Highlight the selected agent
    simulationStore.toggleAgentHighlight(agentId, true)
    
    // Set initial location input values to agent's current position
    locationInput.value.x = Math.round(agent.position.x)
    locationInput.value.z = Math.round(agent.position.z)
    
    // Focus camera on selected agent in both views
    focusOnAgent(agentId)
    
    // Add a thought about being selected
    simulationStore.addAgentThought(
      agentId, 
      `I've been selected by the user. My current task is ${agent.state.currentTask}.`
    )
  }
}

// Focus on an agent in both views
const focusOnAgent = (agentId: string) => {
  const agent = agents.value.find(a => a.id === agentId)
  if (!agent) return
  
  // Focus map view
  if (mapRef.value?.map) {
    const latLng = worldToLatLng(agent.position)
    mapRef.value.map.panTo(latLng)
  }
  
  // Focus simulation view
  if (simulationRef.value) {
    simulationRef.value.focusOnAgent(agentId)
  }
}

// Toggle agent path visibility
const toggleAgentPath = (agentId: string) => {
  isShowingPath.value = !isShowingPath.value
  simulationStore.toggleAgentPath(agentId, isShowingPath.value)
  
  if (isShowingPath.value) {
    simulationStore.addAgentThought(agentId, "My path is now visible. I'm following this route to reach my destination.")
  }
}

// Handle map click
const handleMapClick = (event: google.maps.MapMouseEvent) => {
  if (!selectedAgentId.value || !event.latLng) return
  
  const position = latLngToWorld(event.latLng)
  moveAgentTo(selectedAgentId.value, position)
}

// Handle simulation click
const handleSimulationClick = (position: THREE.Vector3) => {
  if (!selectedAgentId.value) return
  
  moveAgentTo(selectedAgentId.value, position)
}

// Move agent in a direction
const moveAgent = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (!selectedAgentId.value) return
  
  const agent = agents.value.find(a => a.id === selectedAgentId.value)
  if (!agent) return
  
  const newPosition = new THREE.Vector3().copy(agent.position)
  
  switch (direction) {
    case 'up':
      newPosition.z -= movementSpeed
      break
    case 'down':
      newPosition.z += movementSpeed
      break
    case 'left':
      newPosition.x -= movementSpeed
      break
    case 'right':
      newPosition.x += movementSpeed
      break
  }
  
  moveAgentTo(agent.id, newPosition)
}

// Move agent to a specific position
const moveAgentTo = (agentId: string, position: THREE.Vector3) => {
  const agent = agents.value.find(a => a.id === agentId)
  if (!agent) return
  
  if (freeMovement.value) {
    // Directly set the agent's position
    simulationStore.updateAgentPosition(agentId, position)
    simulationStore.addAgentThought(agentId, `Moving directly to position (${Math.round(position.x)}, ${Math.round(position.z)}).`)
  } else {
    // Use pathfinding to navigate to the position
    simulationStore.navigateAgentTo(agentId, position)
    simulationStore.addAgentThought(agentId, `Calculating path to position (${Math.round(position.x)}, ${Math.round(position.z)}).`)
    
    // Show the path when navigating
    isShowingPath.value = true
    simulationStore.toggleAgentPath(agentId, true)
  }
}

// Convert world coordinates to LatLng
const worldToLatLng = (position: THREE.Vector3): google.maps.LatLng => {
  const config = useRuntimeConfig()
  const centerLat = config.public.simulationSettings.cityCenterLat
  const centerLng = config.public.simulationSettings.cityCenterLng
  
  // Convert from world units to lat/lng (approximate conversion)
  const lat = centerLat + (position.z / 111000)
  const lng = centerLng + (position.x / (111000 * Math.cos(centerLat * Math.PI / 180)))
  
  return new google.maps.LatLng(lat, lng)
}

// Convert LatLng to world coordinates
const latLngToWorld = (latLng: google.maps.LatLng): THREE.Vector3 => {
  const config = useRuntimeConfig()
  const centerLat = config.public.simulationSettings.cityCenterLat
  const centerLng = config.public.simulationSettings.cityCenterLng
  
  // Convert from lat/lng to world units
  const x = (latLng.lng() - centerLng) * 111000 * Math.cos(centerLat * Math.PI / 180)
  const z = (latLng.lat() - centerLat) * 111000
  
  return new THREE.Vector3(x, 0, z)
}

// Move to typed location
const moveToLocation = () => {
  if (!selectedAgentId.value) return
  
  const position = new THREE.Vector3(
    Number(locationInput.value.x),
    0,
    Number(locationInput.value.z)
  )
  
  moveAgentTo(selectedAgentId.value, position)
}

// Search address and move agent there
const searchAddress = async () => {
  if (!selectedAgentId.value || !addressInput.value || !mapRef.value?.map) return
  
  try {
    // Initialize geocoder if not already done
    if (!geocoder.value) {
      geocoder.value = new google.maps.Geocoder()
    }
    
    const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
      geocoder.value!.geocode(
        { address: addressInput.value },
        (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
            resolve(results)
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        }
      )
    })
    
    if (result.length > 0) {
      const location = result[0].geometry.location
      
      // Convert to world coordinates
      const worldPos = latLngToWorld(location)
      
      // Update location input
      locationInput.value.x = Math.round(worldPos.x)
      locationInput.value.z = Math.round(worldPos.z)
      
      // Add a thought about the address search
      simulationStore.addAgentThought(
        selectedAgentId.value, 
        `Searching for address: "${addressInput.value}". Found location at (${Math.round(worldPos.x)}, ${Math.round(worldPos.z)}).`
      )
      
      // Move agent to location
      moveAgentTo(selectedAgentId.value, worldPos)
      
      // Pan map to location
      mapRef.value.map.panTo(location)
      mapRef.value.map.setZoom(18)
    }
  } catch (error) {
    console.error('Address search failed:', error)
    alert('Could not find the specified address. Please try again.')
    
    if (selectedAgentId.value) {
      simulationStore.addAgentThought(
        selectedAgentId.value, 
        `Failed to find address: "${addressInput.value}". The location could not be found.`
      )
    }
  }
}

// Simulation controls
const startSimulation = () => {
  simulationStore.startSimulation()
}

const pauseSimulation = () => {
  simulationStore.pauseSimulation()
}

const resetSimulation = () => {
  simulationStore.resetSimulation()
  simulationStore.resetAllHighlightsAndPaths()
  selectedAgentId.value = null
  isShowingPath.value = false
}

onMounted(async () => {
  try {
    // Initialize the simulation if not already initialized
    if (!cityData.value || !cityData.value.buildings || cityData.value.buildings.length === 0) {
      await simulationStore.initializeSimulation()
    }
    
    if (agents.value.length === 0) {
      simulationStore.initializeAgents()
    }
    
    // Start the agent movement update loop
    startAgentMovementLoop()
  } catch (error) {
    console.error('Error initializing simulation:', error)
  }
})

// Function to update agent positions in real-time
const startAgentMovementLoop = () => {
  const updateInterval = 100 // milliseconds
  
  const updateAgentPositions = () => {
    if (isRunning.value) {
      // Update all agents with paths
      agents.value.forEach(agent => {
        if (agent.state.path.length > 0 && agent.state.pathIndex < agent.state.path.length) {
          const targetPos = agent.state.path[agent.state.pathIndex]
          const direction = new THREE.Vector3().subVectors(targetPos, agent.position).normalize()
          
          // Calculate movement distance based on speed
          const distance = agent.speed * (updateInterval / 1000)
          
          // Move agent towards target
          agent.position.add(direction.multiplyScalar(distance))
          
          // Check if reached current path point
          if (agent.position.distanceTo(targetPos) < 1) {
            agent.state.pathIndex++
            
            // Add a thought about reaching a waypoint
            if (agent.state.pathIndex < agent.state.path.length) {
              simulationStore.addAgentThought(
                agent.id, 
                `Reached waypoint ${agent.state.pathIndex} of ${agent.state.path.length}. Continuing to next point.`
              )
            }
            
            // If reached the end of the path
            if (agent.state.pathIndex >= agent.state.path.length) {
              agent.state.currentTask = 'exploring'
              
              // Add a thought about reaching the destination
              simulationStore.addAgentThought(
                agent.id, 
                `Reached destination at (${Math.round(agent.position.x)}, ${Math.round(agent.position.z)}). Switching to exploring mode.`
              )
            }
          }
        }
      })
    }
    
    // Schedule next update
    setTimeout(updateAgentPositions, updateInterval)
  }
  
  // Start the update loop
  updateAgentPositions()
}
</script>

<style scoped>
.integrated-simulation {
  display: flex;
  height: 100vh;
  width: 100%;
}

.view-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-view, .simulation-view {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
}

.map-view.active, .simulation-view.active {
  z-index: 10;
}

/* Split view styles */
.integrated-simulation.split .map-view {
  width: 50%;
  height: 100%;
  left: 0;
}

.integrated-simulation.split .simulation-view {
  width: 50%;
  height: 100%;
  left: 50%;
}

.controls-panel {
  width: 350px;
  background-color: #2a2a2a;
  color: white;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.view-controls, .agent-controls, .simulation-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

button {
  background-color: #444;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #555;
}

button.active {
  background-color: #007bff;
}

button:disabled {
  background-color: #333;
  color: #777;
  cursor: not-allowed;
}

.agents-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.agents-list-container {
  height: 300px;
}

.agent-details-container {
  margin-top: 10px;
}

.movement-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.movement-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.horizontal-buttons {
  display: flex;
  gap: 5px;
}

.movement-mode {
  margin-top: 10px;
}

/* Location input styles */
.location-input, .address-search {
  width: 100%;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #444;
}

.coordinate-inputs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.input-group label {
  font-size: 14px;
  color: #aaa;
}

.input-group input {
  padding: 8px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: white;
}

.move-button, .search-button {
  width: 100%;
  margin-top: 10px;
  background-color: #2c5282;
}

.move-button:hover, .search-button:hover {
  background-color: #3a689c;
}

.search-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-input input {
  padding: 8px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: white;
}

.movement-visualization {
  margin-top: 20px;
  padding: 15px;
  background-color: #333;
  border-radius: 6px;
}

.movement-visualization h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
}

.path-info {
  font-size: 14px;
  line-height: 1.5;
}

/* Toggle button for mobile controls panel */
.controls-toggle {
  display: none;
  position: absolute;
  top: 70px;
  right: 10px;
  z-index: 100;
  background-color: rgba(42, 42, 42, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

/* Media queries for responsive design */
@media (max-width: 1200px) {
  .controls-panel {
    width: 300px;
  }
}

@media (max-width: 992px) {
  .integrated-simulation.split .map-view,
  .integrated-simulation.split .simulation-view {
    width: 100%;
    height: 50%;
    left: 0;
  }
  
  .integrated-simulation.split .map-view {
    top: 0;
  }
  
  .integrated-simulation.split .simulation-view {
    top: 50%;
  }
}

@media (max-width: 768px) {
  .integrated-simulation {
    flex-direction: column;
  }
  
  .controls-panel {
    position: fixed;
    top: 0;
    right: -350px;
    height: 100vh;
    width: 80%;
    max-width: 350px;
    z-index: 1000;
    transition: right 0.3s ease;
  }
  
  .controls-panel.mobile-open {
    right: 0;
  }
  
  .controls-toggle {
    display: block;
  }
  
  .view-container {
    height: 100vh;
  }
  
  .agents-list-container {
    height: 200px;
  }
}

@media (max-width: 480px) {
  .coordinate-inputs {
    flex-direction: column;
    gap: 15px;
  }
  
  .movement-buttons button {
    min-width: 50px;
    min-height: 50px;
  }
}
</style> 