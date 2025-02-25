<template>
  <div class="map3d-advanced-page">
    <h1>Advanced 3D Map Features</h1>
    <div class="intro-message" v-if="showIntro">
      <h2>Experimental Map3DElement API</h2>
      <p>This page demonstrates the newer <span class="highlight">Map3DElement API</span> for creating immersive 3D experiences.</p>
      <ul>
        <li><strong>Camera Animation</strong>: Fly around the city with smooth transitions</li>
        <li><strong>Altitude Control</strong>: Adjust viewing height with the slider</li>
        <li><strong>Photorealistic 3D</strong>: Experience high-quality 3D imagery</li>
        <li><strong>Points of Interest</strong>: Discover landmarks and buildings</li>
        <li><strong>3D Models</strong>: Add custom 3D models to the map</li>
        <li><strong>Building Information</strong>: Click on buildings to see details</li>
      </ul>
      <button @click="dismissIntro" class="dismiss-button">Got it!</button>
    </div>
    
    <div class="map-container" ref="mapContainer"></div>
    
    <template v-if="mapReady && mapInstance">
      <div class="elevation-panel" :class="{ 'panel-hidden': !showElevationPanel }">
        <ElevationProfile v-if="showElevationPanel" :map="mapInstance" />
      </div>
      
      <button @click="toggleElevationPanel" class="elevation-toggle">
        {{ showElevationPanel ? 'Hide Elevation' : 'Show Elevation' }}
      </button>
      
      <Buildings3DOverlay v-if="showBuildingsInfo" :map="mapInstance" />
      
      <button @click="toggleBuildingsInfo" class="buildings-toggle">
        {{ showBuildingsInfo ? 'Hide Buildings Info' : 'Show Buildings Info' }}
      </button>
    </template>
    
    <div class="controls" :class="{ 'controls-hidden': !controlsVisible }">
      <div class="controls-header">Advanced Map Controls</div>
      <button @click="flyAround" class="control-button" :disabled="!mapReady">Fly Around City</button>
      <button @click="toggleCameraMode" class="control-button" :disabled="!mapReady">
        {{ isOrbitMode ? 'Switch to Free Camera' : 'Switch to Orbit Mode' }}
      </button>
      <button @click="resetCamera" class="control-button" :disabled="!mapReady">Reset Camera</button>
      <div class="altitude-control">
        <label>Altitude: {{ altitude }}m</label>
        <input type="range" min="200" max="2000" step="100" v-model="altitude" @input="updateAltitude" :disabled="!mapReady" />
      </div>
      <button @click="togglePOI" class="control-button" :disabled="!mapReady">
        {{ showPOI ? 'Hide Points of Interest' : 'Show Points of Interest' }}
      </button>
      
      <!-- New 3D Model Controls -->
      <div class="model-controls">
        <h4>Add 3D Models</h4>
        <div class="model-selector">
          <select v-model="selectedModel" class="model-dropdown" :disabled="!mapReady">
            <option value="">Select a model...</option>
            <option value="https://storage.googleapis.com/geo-devrel-public-buckets/3d-models/car.glb">Car</option>
            <option value="https://storage.googleapis.com/geo-devrel-public-buckets/3d-models/tree.glb">Tree</option>
            <option value="https://storage.googleapis.com/geo-devrel-public-buckets/3d-models/pin.glb">Pin</option>
          </select>
          <button @click="addSelectedModel" class="control-button" :disabled="!selectedModel || !mapReady">Add Model</button>
        </div>
        <p class="model-instruction" v-if="modelPlacementMode">
          Click on the map to place the model
        </p>
      </div>
    </div>
    
    <button @click="toggleControls" class="controls-toggle">
      {{ controlsVisible ? '✕' : '⚙️' }}
    </button>
    
    <div v-if="!mapReady" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading 3D map...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRuntimeConfig } from '#app'
import ElevationProfile from '~/components/ElevationProfile.vue'
import Buildings3DOverlay from '~/components/Buildings3DOverlay.vue'

// Refs
const mapContainer = ref<HTMLDivElement | null>(null)
const map3DElement = ref<google.maps.Map | any>(null) // Will hold the Map3DElement instance
const showIntro = ref(true)
const controlsVisible = ref(true)
const isOrbitMode = ref(false)
const altitude = ref(500)
const showPOI = ref(false)
const showElevationPanel = ref(false)
const showBuildingsInfo = ref(false)
const config = useRuntimeConfig()
const animationId = ref<number | null>(null)
const mapReady = ref(false)

// 3D Model refs
const selectedModel = ref('')
const modelPlacementMode = ref(false)
const placedModels = ref<any[]>([])

// Computed property to safely access the map instance
const mapInstance = computed(() => map3DElement.value)

// Toggle controls visibility
const toggleControls = () => {
  controlsVisible.value = !controlsVisible.value
}

// Dismiss intro message
const dismissIntro = () => {
  showIntro.value = false
  localStorage.setItem('map3d_advanced_intro_seen', 'true')
}

// Initialize the Map3DElement
const initMap3D = async () => {
  if (!mapContainer.value) return
  
  try {
    // Check if the Map3DElement API is available
    if (window.google && window.google.maps && 'importLibrary' in window.google.maps) {
      // Import the maps3d library
      const maps3dLib = await window.google.maps.importLibrary("maps3d") as any
      const Map3DElement = maps3dLib.Map3DElement
      const MapMode = maps3dLib.MapMode
      const Model3DElement = maps3dLib.Model3DElement
      
      if (Map3DElement) {
        // Create the Map3DElement instance
        const mapElement = new Map3DElement({
          center: { 
            lat: config.public.simulationSettings.cityCenterLat, 
            lng: config.public.simulationSettings.cityCenterLng,
            altitude: altitude.value
          },
          range: 1000,
          tilt: 60,
          heading: 0,
          mode: MapMode ? MapMode.SATELLITE : undefined, // Use MapMode if available
          mapId: '6ff586e93e18149e' // Photorealistic mapId
        })
        
        // Append to the container
        mapContainer.value.appendChild(mapElement)
        
        // Add event listeners
        mapElement.addEventListener('click', handleMapClick)
        
        // Store references for later use
        map3DElement.value = mapElement
        window.map3DElement = mapElement
        window.Model3DElement = Model3DElement
        
        // Mark map as ready
        mapReady.value = true
      } else {
        // Fallback if Map3DElement is not available
        console.warn('Map3DElement not available. Falling back to standard Google Maps.')
        initFallbackMap()
      }
    } else {
      // Fallback to standard Google Maps
      console.warn('Advanced Maps3D library not available. Falling back to standard Google Maps.')
      initFallbackMap()
    }
  } catch (error) {
    console.error('Error initializing Map3DElement:', error)
    initFallbackMap()
  }
}

// Fallback to standard Google Maps
const initFallbackMap = () => {
  if (!mapContainer.value) return
  
  const mapOptions = {
    center: { 
      lat: config.public.simulationSettings.cityCenterLat, 
      lng: config.public.simulationSettings.cityCenterLng 
    },
    zoom: 18,
    mapTypeId: 'satellite',
    tilt: 45,
    mapId: '6ff586e93e18149e' // Photorealistic mapId
  }
  
  const map = new google.maps.Map(mapContainer.value, mapOptions)
  
  // Store reference for cleanup
  map3DElement.value = map
  
  // Mark map as ready
  mapReady.value = true
}

// Handle map click events
const handleMapClick = (event: any) => {
  console.log('Map clicked:', event)
  
  // If in model placement mode, add the model at the clicked location
  if (modelPlacementMode.value && selectedModel.value) {
    const position = event.latLng || {
      lat: event.detail?.lat || config.public.simulationSettings.cityCenterLat,
      lng: event.detail?.lng || config.public.simulationSettings.cityCenterLng,
      altitude: 0
    }
    
    const model = add3DModel(selectedModel.value, position)
    if (model) {
      placedModels.value.push(model)
      modelPlacementMode.value = false
      selectedModel.value = ''
    }
  }
}

// Fly around the city
const flyAround = () => {
  if (!map3DElement.value) return
  
  try {
    // Check if we're using Map3DElement
    if (map3DElement.value.flyCameraAround) {
      // Use the flyCameraAround method
      map3DElement.value.flyCameraAround({
        duration: 10000, // 10 seconds
        radius: 1000,
        cycles: 1
      })
    } else if (map3DElement.value.panBy) {
      // Fallback for standard Google Maps
      // Simulate a fly-around with a series of pans
      let angle = 0
      const radius = 0.001 // Approximately 100 meters
      const center = map3DElement.value.getCenter()
      
      if (animationId.value) {
        cancelAnimationFrame(animationId.value)
      }
      
      const animate = () => {
        angle += 0.01
        if (angle >= Math.PI * 2) {
          cancelAnimationFrame(animationId.value!)
          animationId.value = null
          return
        }
        
        const lat = center.lat() + radius * Math.cos(angle)
        const lng = center.lng() + radius * Math.sin(angle)
        map3DElement.value.panTo({ lat, lng })
        
        animationId.value = requestAnimationFrame(animate)
      }
      
      animationId.value = requestAnimationFrame(animate)
    }
  } catch (error) {
    console.error('Error during fly around:', error)
  }
}

// Toggle between orbit and free camera modes
const toggleCameraMode = () => {
  isOrbitMode.value = !isOrbitMode.value
  
  try {
    if (map3DElement.value && map3DElement.value.setCameraMode) {
      map3DElement.value.setCameraMode(isOrbitMode.value ? 'orbit' : 'free')
    }
  } catch (error) {
    console.error('Error toggling camera mode:', error)
  }
}

// Reset camera to initial position
const resetCamera = () => {
  try {
    if (map3DElement.value) {
      if (map3DElement.value.flyCameraTo) {
        // Map3DElement API
        map3DElement.value.flyCameraTo({
          center: { 
            lat: config.public.simulationSettings.cityCenterLat, 
            lng: config.public.simulationSettings.cityCenterLng,
            altitude: altitude.value
          },
          range: 1000,
          tilt: 60,
          heading: 0,
          duration: 1000
        })
      } else if (map3DElement.value.setCenter) {
        // Standard Google Maps API
        map3DElement.value.setCenter({ 
          lat: config.public.simulationSettings.cityCenterLat, 
          lng: config.public.simulationSettings.cityCenterLng 
        })
        map3DElement.value.setZoom(18)
        map3DElement.value.setTilt(45)
        map3DElement.value.setHeading(0)
      }
    }
  } catch (error) {
    console.error('Error resetting camera:', error)
  }
}

// Update altitude
const updateAltitude = () => {
  try {
    if (map3DElement.value) {
      if (map3DElement.value.flyCameraTo) {
        // Map3DElement API
        map3DElement.value.flyCameraTo({
          center: { 
            lat: map3DElement.value.getCenter().lat,
            lng: map3DElement.value.getCenter().lng,
            altitude: altitude.value
          },
          duration: 500
        })
      } else if (map3DElement.value.setZoom) {
        // Approximate altitude with zoom for standard maps
        // Convert altitude to zoom (rough approximation)
        const zoom = Math.max(10, Math.min(22, 22 - Math.log2(altitude.value / 100)))
        map3DElement.value.setZoom(zoom)
      }
    }
  } catch (error) {
    console.error('Error updating altitude:', error)
  }
}

// Toggle Points of Interest
const togglePOI = () => {
  showPOI.value = !showPOI.value
  
  try {
    if (map3DElement.value) {
      if (map3DElement.value.setFeatureVisibility) {
        // Map3DElement API
        map3DElement.value.setFeatureVisibility('poi', showPOI.value)
      } else if (map3DElement.value.setOptions) {
        // Standard Google Maps API
        map3DElement.value.setOptions({
          styles: showPOI.value ? [] : [
            {
              featureType: 'poi',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })
      }
    }
  } catch (error) {
    console.error('Error toggling POI:', error)
  }
}

// Toggle Elevation Panel
const toggleElevationPanel = () => {
  showElevationPanel.value = !showElevationPanel.value
}

// Toggle Buildings Info
const toggleBuildingsInfo = () => {
  showBuildingsInfo.value = !showBuildingsInfo.value
}

// Load Google Maps API
const loadGoogleMapsAPI = () => {
  return new Promise<void>((resolve, reject) => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      resolve()
      return
    }
    
    const apiKey = config.public.googleMapsApiKey
    if (!apiKey) {
      reject(new Error('Google Maps API key is not set'))
      return
    }
    
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,visualization&v=beta&callback=initMap3DAdvanced`
    script.async = true
    
    // Define global callback
    window.initMap3DAdvanced = () => {
      resolve()
    }
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'))
    }
    
    document.head.appendChild(script)
  })
}

// Add a new method to add a 3D model to the map
const add3DModel = (modelUrl: string, position: { lat: number, lng: number, altitude?: number }, orientation?: { heading?: number, tilt?: number, roll?: number }) => {
  try {
    if (window.Model3DElement && map3DElement.value) {
      // Create a new 3D model element
      const model = new window.Model3DElement({
        src: modelUrl,
        position: position,
        orientation: orientation || { tilt: 0, heading: 0, roll: 0 },
        scale: 1
      })
      
      // Add the model to the map
      map3DElement.value.appendChild(model)
      
      console.log('3D model added to map:', modelUrl)
      return model
    } else {
      console.warn('Model3DElement not available or map not initialized')
      return null
    }
  } catch (error) {
    console.error('Error adding 3D model:', error)
    return null
  }
}

// Add the selected 3D model
const addSelectedModel = () => {
  if (!selectedModel.value) return
  
  modelPlacementMode.value = true
}

// Lifecycle hooks
onMounted(async () => {
  // Check if the user has already seen the intro
  const hasSeenIntro = localStorage.getItem('map3d_advanced_intro_seen')
  if (hasSeenIntro === 'true') {
    showIntro.value = false
  }
  
  try {
    // Load Google Maps API
    await loadGoogleMapsAPI()
    
    // Initialize Map3D
    await initMap3D()
    
    // Add a small delay to ensure the map is fully initialized
    setTimeout(() => {
      if (map3DElement.value) {
        console.log('Map is ready:', map3DElement.value)
        mapReady.value = true
      } else {
        console.error('Map initialization failed')
      }
    }, 1000)
  } catch (error) {
    console.error('Error initializing map:', error)
  }
})

onBeforeUnmount(() => {
  // Clean up
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  
  // Remove placed models
  placedModels.value.forEach(model => {
    if (model && model.remove) {
      model.remove()
    }
  })
  
  if (map3DElement.value) {
    // Remove event listeners
    if (map3DElement.value.removeEventListener) {
      map3DElement.value.removeEventListener('click', handleMapClick)
    } else if (map3DElement.value.clearInstanceListeners) {
      google.maps.event.clearInstanceListeners(map3DElement.value)
    }
  }
})

// Fix the Window interface declaration
declare global {
  interface Window {
    // Use optional chaining to avoid conflicts
    initMap3DAdvanced?: () => void;
    map3DElement?: any;
    Model3DElement?: any;
  }
}
</script>

<style scoped>
.map3d-advanced-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}

h1 {
  position: absolute;
  top: 10px;
  left: 10px;
  margin: 0;
  color: white;
  font-size: 24px;
  z-index: 10;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.map-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.intro-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(42, 42, 42, 0.95);
  border-radius: 8px;
  padding: 20px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  max-width: 400px;
  text-align: center;
}

.intro-message h2 {
  margin-top: 0;
  color: #4285F4;
  font-size: 20px;
}

.highlight {
  color: #4CAF50;
  font-weight: bold;
}

.intro-message ul {
  text-align: left;
  margin: 15px 0;
  padding-left: 20px;
}

.intro-message li {
  margin-bottom: 8px;
}

.dismiss-button {
  background-color: #4285F4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dismiss-button:hover {
  background-color: #3367D6;
}

.controls-toggle {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(42, 42, 42, 0.9);
  color: white;
  border: none;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.controls {
  position: absolute;
  top: 60px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1;
  background-color: rgba(42, 42, 42, 0.9);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, opacity 0.3s ease;
  max-width: 200px;
}

.controls-hidden {
  transform: translateX(220px);
  opacity: 0;
  pointer-events: none;
}

.controls-header {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  color: white;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.control-button {
  background-color: rgba(68, 68, 68, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:hover {
  background-color: rgba(85, 85, 85, 0.9);
}

.altitude-control {
  background-color: rgba(68, 68, 68, 0.8);
  color: white;
  border-radius: 4px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.altitude-control label {
  font-size: 14px;
}

.altitude-control input {
  width: 100%;
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  h1 {
    font-size: 20px;
  }
  
  .controls {
    max-width: 180px;
  }
  
  .control-button {
    font-size: 12px;
    padding: 6px 10px;
  }
  
  .intro-message {
    max-width: 320px;
    padding: 15px;
  }
}

@media (max-width: 480px) {
  h1 {
    font-size: 18px;
  }
  
  .controls-toggle {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .controls {
    max-width: 160px;
    padding: 8px;
  }
  
  .control-button {
    font-size: 11px;
    padding: 5px 8px;
  }
  
  .intro-message {
    max-width: 280px;
    padding: 12px;
  }
}

.elevation-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.panel-hidden {
  transform: translateY(100%);
  opacity: 0;
  pointer-events: none;
}

.elevation-toggle {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background-color: rgba(42, 42, 42, 0.9);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  z-index: 5;
  transition: background-color 0.2s;
}

.elevation-toggle:hover {
  background-color: rgba(85, 85, 85, 0.9);
}

.model-controls {
  background-color: rgba(68, 68, 68, 0.8);
  color: white;
  border-radius: 4px;
  padding: 8px 12px;
  margin-top: 10px;
}

.model-controls h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #4CAF50;
}

.model-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.model-dropdown {
  flex: 1;
  background-color: rgba(42, 42, 42, 0.9);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 6px;
  font-size: 14px;
}

.model-instruction {
  font-size: 12px;
  margin: 5px 0 0 0;
  color: #FFC107;
  text-align: center;
}

.buildings-toggle {
  position: absolute;
  bottom: 60px;
  left: 20px;
  background-color: rgba(42, 42, 42, 0.9);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  z-index: 5;
  transition: background-color 0.2s;
}

.buildings-toggle:hover {
  background-color: rgba(85, 85, 85, 0.9);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(42, 42, 42, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #4285F4;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.model-dropdown:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 