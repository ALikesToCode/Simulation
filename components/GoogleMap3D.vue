<template>
  <div class="map-container">
    <div ref="mapContainer" class="map"></div>
    <button @click="toggleControls" class="controls-toggle">
      {{ controlsVisible ? '✕' : '⚙️' }}
    </button>
    <div class="controls" :class="{ 'controls-hidden': !controlsVisible }">
      <div class="controls-header">Map Controls</div>
      <button @click="togglePhotoRealistic" class="control-button photo-realistic-button">
        {{ isPhotoRealistic ? 'Standard View' : 'Photorealistic 3D' }}
      </button>
      <button @click="toggleTilt" class="control-button">
        {{ is3DMode ? 'Switch to 2D' : 'Switch to 3D' }}
      </button>
      <button @click="rotateMap" class="control-button" v-if="is3DMode">
        Rotate Map
      </button>
      <button @click="toggleBuildingLayer" class="control-button" v-if="!isPhotoRealistic">
        {{ buildingsVisible ? 'Hide Buildings' : 'Show Buildings' }}
      </button>
      <button @click="toggleTerrainLayer" class="control-button" v-if="!isPhotoRealistic">
        {{ terrainVisible ? 'Hide Terrain' : 'Show Terrain' }}
      </button>
      <button @click="toggleAgentMarkers" class="control-button">
        {{ agentsVisible ? 'Hide Agents' : 'Show Agents' }}
      </button>
      <button @click="toggleFirstPersonView" class="control-button first-person-button">
        {{ isFirstPerson ? 'Exit First Person' : 'Enter First Person' }}
      </button>
      <div class="tilt-control" v-if="is3DMode">
        <label>Tilt: {{ currentTilt }}°</label>
        <input type="range" min="0" max="60" step="5" v-model="currentTilt" @input="setTiltAngle" />
      </div>
      <div class="zoom-control">
        <label>Zoom: {{ currentZoom }}</label>
        <input type="range" min="15" max="22" step="1" v-model="currentZoom" @input="setZoomLevel" />
      </div>
    </div>
    
    <!-- Player Avatar Component -->
    <PlayerAvatar 
      ref="playerAvatarRef"
      :map="map" 
      @position-update="onPlayerPositionUpdate" 
    />
  </div>
</template>

<script setup lang="ts">
/// <reference path="../types/google-maps.d.ts" />
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRuntimeConfig } from '#app'
import { storeToRefs } from 'pinia'
import { useSimulationStore } from '~/stores/simulation'
import PlayerAvatar from './PlayerAvatar.vue'
import * as THREE from 'three'

const mapContainer = ref<HTMLDivElement | null>(null)
const map = ref<google.maps.Map | null>(null)
const is3DMode = ref(false)
const buildingsVisible = ref(true)
const terrainVisible = ref(false)
const agentsVisible = ref(true)
const currentTilt = ref(0)
const currentZoom = ref(18)
const controlsVisible = ref(window.innerWidth > 768)
const isFirstPerson = ref(false)
const isPhotoRealistic = ref(false)
const playerAvatarRef = ref<InstanceType<typeof PlayerAvatar> | null>(null)
const config = useRuntimeConfig()
const mapInitialized = ref(false)

// Get agents from the simulation store
const simulationStore = useSimulationStore()
const { agents } = storeToRefs(simulationStore)

// Map layers
let buildingLayer: google.maps.WebGLOverlayView | null = null

// Agent markers
const agentMarkers = new Map<string, google.maps.marker.AdvancedMarkerElement | google.maps.Marker>()

// Define events
const emit = defineEmits<{
  (e: 'map-click', event: google.maps.MapMouseEvent): void
}>()

// Toggle controls visibility
const toggleControls = () => {
  controlsVisible.value = !controlsVisible.value
}

// Define global callback for Google Maps API
if (typeof window !== 'undefined') {
  // Remove the global initMap function since we're not using the callback parameter anymore
  // Instead, we'll check if the API is loaded in onMounted
}

// Function to initialize the map
const initMap = () => {
  if (!mapContainer.value) return
  
  const mapOptions: google.maps.MapOptions = {
    center: { 
      lat: config.public.simulationSettings.cityCenterLat, 
      lng: config.public.simulationSettings.cityCenterLng 
    },
    zoom: currentZoom.value,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
    // Use a default map ID for standard view
    mapId: '8e0a97af9386fef'
  }
  
  map.value = new google.maps.Map(mapContainer.value, mapOptions)
  
  // Add event listener for when the map is idle (fully loaded)
  google.maps.event.addListenerOnce(map.value, 'idle', () => {
    initBuildingLayer()
    initMapClickListener()
  })
}

// Initialize map click listener
const initMapClickListener = () => {
  if (!map.value) return
  
  map.value.addListener('click', (event: google.maps.MapMouseEvent) => {
    emit('map-click', event)
  })
}

// Initialize 3D building layer
const initBuildingLayer = () => {
  if (!map.value) return
  
  // Enable the buildings layer by default
  if (buildingsVisible.value && !isPhotoRealistic.value) {
    // When using mapId, we should avoid setting mapTypeId directly
    // as it can conflict with the styles defined in the cloud console
    const mapTypeId = map.value.getMapTypeId()
    if (mapTypeId && !mapTypeId.includes('mapId')) {
      map.value.setMapTypeId(google.maps.MapTypeId.SATELLITE)
    }
    
    // Enable 3D buildings
    const webglOverlayOptions = {
      map: map.value
    }
    
    // Check if WebGLOverlayView is available (newer versions of Google Maps)
    if (google.maps.WebGLOverlayView) {
      buildingLayer = new google.maps.WebGLOverlayView()
      buildingLayer.setMap(map.value)
    }
  }
}

// Toggle between photorealistic and standard view
const togglePhotoRealistic = () => {
  if (!map.value || !mapContainer.value) return
  
  isPhotoRealistic.value = !isPhotoRealistic.value
  
  try {
    // Store current position and zoom
    const currentCenter = map.value.getCenter();
    const currentZoom = map.value.getZoom();
    
    // Clear instance listeners before recreating the map
    google.maps.event.clearInstanceListeners(map.value);
    
    // Create new map options
    const mapOptions: google.maps.MapOptions = {
      center: currentCenter,
      zoom: currentZoom,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      // Set mapId based on view type
      mapId: isPhotoRealistic.value ? '6ff586e93e18149e' : '8e0a97af9386fef'
    };
    
    // If in 3D mode, set tilt
    if (is3DMode.value) {
      mapOptions.tilt = currentTilt.value;
    }
    
    // Recreate the map with new options
    map.value = new google.maps.Map(mapContainer.value, mapOptions);
    
    // Set 3D mode when in photorealistic view
    if (isPhotoRealistic.value) {
      is3DMode.value = true;
      currentTilt.value = 45;
      map.value.setTilt(45);
    } else {
      // Set appropriate map type for standard view
      setTimeout(() => {
        if (map.value) {
          if (buildingsVisible.value) {
            map.value.setMapTypeId(google.maps.MapTypeId.SATELLITE);
          } else if (terrainVisible.value) {
            map.value.setMapTypeId(google.maps.MapTypeId.TERRAIN);
          } else {
            map.value.setMapTypeId(google.maps.MapTypeId.ROADMAP);
          }
        }
      }, 100);
    }
    
    // Reinitialize map components
    initMapClickListener();
    
    // Handle building layer
    if (!isPhotoRealistic.value && buildingsVisible.value) {
      initBuildingLayer();
    } else if (buildingLayer) {
      buildingLayer.setMap(null);
    }
    
    // Update agent markers with new map
    updateAgentMarkers();
    
    // Update player avatar with new map
    if (playerAvatarRef.value) {
      if (typeof playerAvatarRef.value.updateMapReference === 'function') {
        playerAvatarRef.value.updateMapReference(map.value);
      }
    }
  } catch (error) {
    console.error('Error toggling photorealistic view:', error);
    // Revert the state if there was an error
    isPhotoRealistic.value = !isPhotoRealistic.value;
  }
}

// Function to toggle between 2D and 3D views
const toggleTilt = () => {
  if (!map.value) return
  
  is3DMode.value = !is3DMode.value
  
  if (is3DMode.value) {
    // Switch to 3D mode
    currentTilt.value = 45
    map.value.setTilt(currentTilt.value)
    
    // Switch to satellite view for better 3D visualization if not in photorealistic mode
    if (!isPhotoRealistic.value) {
      map.value.setMapTypeId(google.maps.MapTypeId.SATELLITE)
    }
  } else {
    // Switch back to 2D mode
    currentTilt.value = 0
    map.value.setTilt(0)
    
    // Optionally switch back to roadmap view if not in photorealistic mode
    if (!isPhotoRealistic.value && !buildingsVisible.value) {
      map.value.setMapTypeId(google.maps.MapTypeId.ROADMAP)
    }
  }
}

// Function to set tilt angle
const setTiltAngle = () => {
  if (!map.value || !is3DMode.value) return
  map.value.setTilt(currentTilt.value)
}

// Function to set zoom level
const setZoomLevel = () => {
  if (!map.value) return
  map.value.setZoom(Number(currentZoom.value))
}

// Function to rotate the map (only works in 3D mode)
const rotateMap = () => {
  if (!map.value || !is3DMode.value) return
  
  // Get current heading
  const currentHeading = map.value.getHeading() || 0
  
  // Rotate by 45 degrees
  map.value.setHeading((currentHeading + 45) % 360)
}

// Toggle first-person view
const toggleFirstPersonView = () => {
  isFirstPerson.value = !isFirstPerson.value
  
  if (playerAvatarRef.value) {
    playerAvatarRef.value.toggleFirstPersonView()
  }
}

// Handle player position updates
const onPlayerPositionUpdate = (position: { lat: number, lng: number }) => {
  // Position update handling without logging
}

// Toggle building layer
const toggleBuildingLayer = () => {
  if (!map.value || isPhotoRealistic.value) return
  
  buildingsVisible.value = !buildingsVisible.value
  
  if (buildingsVisible.value) {
    // Show buildings
    // Use setTimeout to ensure mapId is processed first
    setTimeout(() => {
      if (map.value) {
        map.value.setMapTypeId(google.maps.MapTypeId.SATELLITE)
        if (buildingLayer) {
          buildingLayer.setMap(map.value)
        }
      }
    }, 50)
  } else {
    // Hide buildings
    if (!terrainVisible.value) {
      map.value.setMapTypeId(google.maps.MapTypeId.ROADMAP)
    }
    if (buildingLayer) {
      buildingLayer.setMap(null)
    }
  }
}

// Toggle terrain layer
const toggleTerrainLayer = () => {
  if (!map.value || isPhotoRealistic.value) return
  
  terrainVisible.value = !terrainVisible.value
  
  // Use setTimeout to ensure mapId is processed first
  setTimeout(() => {
    if (!map.value) return
    
    if (terrainVisible.value) {
      // Show terrain
      map.value.setMapTypeId(google.maps.MapTypeId.TERRAIN)
    } else {
      // Hide terrain
      if (buildingsVisible.value) {
        map.value.setMapTypeId(google.maps.MapTypeId.SATELLITE)
      } else {
        map.value.setMapTypeId(google.maps.MapTypeId.ROADMAP)
      }
    }
  }, 50)
}

// Toggle agent markers
const toggleAgentMarkers = () => {
  agentsVisible.value = !agentsVisible.value
  
  // Update marker visibility
  updateAgentMarkers()
}

// Convert world coordinates to LatLng
const worldToLatLng = (position: THREE.Vector3): google.maps.LatLng => {
  const centerLat = config.public.simulationSettings.cityCenterLat
  const centerLng = config.public.simulationSettings.cityCenterLng
  
  // Convert from world units to lat/lng (approximate conversion)
  const lat = centerLat + (position.z / 111000)
  const lng = centerLng + (position.x / (111000 * Math.cos(centerLat * Math.PI / 180)))
  
  return new google.maps.LatLng(lat, lng)
}

// Update agent markers on the map
const updateAgentMarkers = () => {
  if (!map.value) return
  
  // Remove old markers
  const currentIds = new Set(agents.value.map(a => a.id))
  for (const [id, marker] of agentMarkers) {
    if (!currentIds.has(id)) {
      try {
        if (google.maps.marker && google.maps.marker.AdvancedMarkerElement && marker instanceof google.maps.marker.AdvancedMarkerElement) {
          marker.map = null
        } else if (marker instanceof google.maps.Marker) {
          marker.setMap(null)
        }
      } catch (error) {
        console.error('Error removing marker:', error)
      }
      agentMarkers.delete(id)
    }
  }
  
  // Skip if agents are not visible
  if (!agentsVisible.value) {
    for (const marker of agentMarkers.values()) {
      try {
        if (google.maps.marker && google.maps.marker.AdvancedMarkerElement && marker instanceof google.maps.marker.AdvancedMarkerElement) {
          marker.map = null
        } else if (marker instanceof google.maps.Marker) {
          marker.setMap(null)
        }
      } catch (error) {
        console.error('Error hiding marker:', error)
      }
    }
    return
  }
  
  // Update or create new markers
  for (const agent of agents.value) {
    try {
      const latLng = worldToLatLng(agent.position)
      let marker = agentMarkers.get(agent.id)
      
      if (!marker) {
        createAgentMarker(agent, latLng)
      } else {
        // Update existing marker
        try {
          if (google.maps.marker && google.maps.marker.AdvancedMarkerElement && marker instanceof google.maps.marker.AdvancedMarkerElement) {
            marker.position = latLng;
            marker.map = map.value;
          } else if (marker instanceof google.maps.Marker) {
            marker.setPosition(latLng);
            marker.setMap(map.value);
          }
        } catch (error) {
          console.error('Error updating marker position:', error)
          // If updating fails, try recreating the marker
          agentMarkers.delete(agent.id)
          createAgentMarker(agent, latLng)
        }
      }
    } catch (error) {
      console.error(`Error processing agent ${agent.id}:`, error)
    }
  }
}

// Helper function to create a new agent marker
const createAgentMarker = (agent: any, latLng: google.maps.LatLng) => {
  try {
    // Check if AdvancedMarkerElement is available
    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
      // Create marker content
      const markerContent = document.createElement('div');
      markerContent.className = 'agent-marker';
      markerContent.style.width = '16px';
      markerContent.style.height = '16px';
      markerContent.style.borderRadius = '50%';
      markerContent.style.backgroundColor = agent.type === 'blue' ? '#4444ff' : '#ff4444';
      markerContent.style.border = '2px solid white';
      markerContent.style.display = 'flex';
      markerContent.style.alignItems = 'center';
      markerContent.style.justifyContent = 'center';
      
      // Add label
      const label = document.createElement('span');
      label.textContent = agent.id.split('_')[1] || '';
      label.style.color = 'white';
      label.style.fontSize = '10px';
      markerContent.appendChild(label);
      
      // Create advanced marker
      const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        position: latLng,
        map: map.value,
        title: agent.id,
        content: markerContent
      });
      
      // Add click listener
      advancedMarker.addListener('click', () => {
        const customEvent = {
          latLng: latLng
        } as google.maps.MapMouseEvent;
        
        emit('map-click', customEvent);
      });
      
      agentMarkers.set(agent.id, advancedMarker);
    } else {
      // Fallback to regular marker
      console.warn('Falling back to deprecated google.maps.Marker for agent markers. Consider updating your Google Maps API version.')
      
      const marker = new google.maps.Marker({
        position: latLng,
        map: map.value,
        title: agent.id,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: agent.type === 'blue' ? '#4444ff' : '#ff4444',
          fillOpacity: 0.8,
          strokeColor: 'white',
          strokeWeight: 2,
          scale: 8
        },
        label: {
          text: agent.id.split('_')[1] || '',
          color: 'white',
          fontSize: '10px'
        },
        optimized: true
      })
      
      // Add click listener to marker
      marker.addListener('click', () => {
        const customEvent = {
          latLng: marker.getPosition()
        } as google.maps.MapMouseEvent
        
        emit('map-click', customEvent)
      })
      
      agentMarkers.set(agent.id, marker)
    }
  } catch (error) {
    console.error('Error creating marker for agent:', agent.id, error)
  }
}

// Load Google Maps API dynamically if not already loaded by Nuxt
const loadGoogleMapsScript = () => {
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,visualization&v=beta&callback=initMap`
    script.async = true
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'))
    }
    
    document.head.appendChild(script)
  })
}

// Watch for tilt changes
watch(currentTilt, (newTilt) => {
  if (map.value && is3DMode.value) {
    map.value.setTilt(newTilt)
  }
})

// Watch for zoom changes
watch(currentZoom, (newZoom) => {
  if (map.value) {
    map.value.setZoom(Number(newZoom))
  }
})

// Watch for agent changes
watch(agents, () => {
  updateAgentMarkers()
}, { deep: true })

onMounted(async () => {
  try {
    // Check if Google Maps API is loaded
    if (typeof google !== 'undefined' && google.maps) {
      // API is already loaded, initialize the map
      initMap()
      mapInitialized.value = true
    } else {
      // API is not loaded yet, wait for it
      const checkGoogleMapsLoaded = () => {
        if (typeof google !== 'undefined' && google.maps) {
          // API is now loaded
          initMap()
          mapInitialized.value = true
        } else {
          // Check again in 100ms
          setTimeout(checkGoogleMapsLoaded, 100)
        }
      }
      
      checkGoogleMapsLoaded()
    }
  } catch (error) {
    console.error('Error initializing Google Maps:', error)
  }
})

onBeforeUnmount(() => {
  // Clean up event listeners if needed
  if (map.value) {
    google.maps.event.clearInstanceListeners(map.value)
  }
  
  // Clean up layers
  if (buildingLayer) {
    buildingLayer.setMap(null)
  }
  
  // Clean up markers
  for (const marker of agentMarkers.values()) {
    try {
      if (google.maps && google.maps.marker && google.maps.marker.AdvancedMarkerElement && 
          marker instanceof google.maps.marker.AdvancedMarkerElement) {
        marker.map = null
      } else if (marker instanceof google.maps.Marker) {
        marker.setMap(null)
      }
    } catch (error) {
      console.error('Error cleaning up marker:', error)
    }
  }
  agentMarkers.clear()
})

// Expose map instance and methods for parent components
defineExpose({
  map,
  is3DMode,
  buildingsVisible,
  terrainVisible,
  agentsVisible,
  currentTilt,
  currentZoom,
  controlsVisible,
  isFirstPerson,
  isPhotoRealistic,
  toggleTilt,
  rotateMap,
  toggleBuildingLayer,
  toggleTerrainLayer,
  toggleAgentMarkers,
  toggleControls,
  toggleFirstPersonView,
  togglePhotoRealistic,
  setTiltAngle,
  setZoomLevel,
  worldToLatLng
})

// Add to the interface declaration
declare global {
  interface Window {
    initMap: () => void;
  }
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.map {
  width: 100%;
  height: 100%;
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

.first-person-button {
  background-color: rgba(66, 133, 244, 0.8);
}

.first-person-button:hover {
  background-color: rgba(66, 133, 244, 0.9);
}

.photo-realistic-button {
  background-color: rgba(76, 175, 80, 0.8);
}

.photo-realistic-button:hover {
  background-color: rgba(76, 175, 80, 0.9);
}

.tilt-control, .zoom-control {
  background-color: rgba(68, 68, 68, 0.8);
  color: white;
  border-radius: 4px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tilt-control label, .zoom-control label {
  font-size: 14px;
}

.tilt-control input, .zoom-control input {
  width: 100%;
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .controls {
    max-width: 180px;
  }
  
  .control-button {
    font-size: 12px;
    padding: 6px 10px;
  }
}

@media (max-width: 480px) {
  .controls-toggle {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .controls {
    top: 56px;
    max-width: 160px;
    padding: 8px;
  }
  
  .control-button {
    font-size: 11px;
    padding: 5px 8px;
  }
}
</style> 