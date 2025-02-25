<template>
  <div class="map-container">
    <div ref="mapContainer" class="map"></div>
    <div class="controls">
      <button @click="toggleTilt" class="control-button">
        {{ is3DMode ? 'Switch to 2D' : 'Switch to 3D' }}
      </button>
      <button @click="rotateMap" class="control-button" v-if="is3DMode">
        Rotate Map
      </button>
      <button @click="toggleBuildingLayer" class="control-button">
        {{ buildingsVisible ? 'Hide Buildings' : 'Show Buildings' }}
      </button>
      <button @click="toggleTerrainLayer" class="control-button">
        {{ terrainVisible ? 'Hide Terrain' : 'Show Terrain' }}
      </button>
      <div class="tilt-control" v-if="is3DMode">
        <label>Tilt: {{ currentTilt }}°</label>
        <input type="range" min="0" max="60" step="5" v-model="currentTilt" @input="setTiltAngle" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/// <reference path="../types/google-maps.d.ts" />
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRuntimeConfig } from '#app'

const mapContainer = ref<HTMLDivElement | null>(null)
const map = ref<google.maps.Map | null>(null)
const is3DMode = ref(false)
const buildingsVisible = ref(true)
const terrainVisible = ref(false)
const currentTilt = ref(0)
const config = useRuntimeConfig()

// Map layers
let buildingLayer: google.maps.WebGLOverlayView | null = null

// Function to initialize the map
const initMap = () => {
  if (!mapContainer.value) return
  
  const mapOptions: google.maps.MapOptions = {
    center: { 
      lat: config.public.simulationSettings.cityCenterLat, 
      lng: config.public.simulationSettings.cityCenterLng 
    },
    zoom: 18,
    mapTypeId: 'roadmap',
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    mapId: 'YOUR_MAP_ID' // Optional: If you have a custom map style
  }
  
  map.value = new google.maps.Map(mapContainer.value, mapOptions)
  
  // Add event listener for when the map is idle (fully loaded)
  google.maps.event.addListenerOnce(map.value, 'idle', () => {
    console.log('Map loaded successfully')
    initBuildingLayer()
  })
}

// Initialize 3D building layer
const initBuildingLayer = () => {
  if (!map.value) return
  
  // Enable the buildings layer by default
  if (buildingsVisible.value) {
    map.value.setOptions({
      mapTypeId: google.maps.MapTypeId.SATELLITE
    })
    
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

// Function to toggle between 2D and 3D views
const toggleTilt = () => {
  if (!map.value) return
  
  is3DMode.value = !is3DMode.value
  
  if (is3DMode.value) {
    // Switch to 3D mode
    currentTilt.value = 45
    map.value.setTilt(currentTilt.value)
    
    // Switch to satellite view for better 3D visualization
    map.value.setMapTypeId(google.maps.MapTypeId.SATELLITE)
  } else {
    // Switch back to 2D mode
    currentTilt.value = 0
    map.value.setTilt(0)
    
    // Optionally switch back to roadmap view
    if (!buildingsVisible.value) {
      map.value.setMapTypeId(google.maps.MapTypeId.ROADMAP)
    }
  }
}

// Function to set tilt angle
const setTiltAngle = () => {
  if (!map.value || !is3DMode.value) return
  map.value.setTilt(currentTilt.value)
}

// Function to rotate the map (only works in 3D mode)
const rotateMap = () => {
  if (!map.value || !is3DMode.value) return
  
  // Get current heading
  const currentHeading = map.value.getHeading() || 0
  
  // Rotate by 45 degrees
  map.value.setHeading((currentHeading + 45) % 360)
}

// Toggle building layer
const toggleBuildingLayer = () => {
  if (!map.value) return
  
  buildingsVisible.value = !buildingsVisible.value
  
  if (buildingsVisible.value) {
    // Show buildings
    map.value.setMapTypeId(google.maps.MapTypeId.SATELLITE)
    if (buildingLayer) {
      buildingLayer.setMap(map.value)
    }
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
  if (!map.value) return
  
  terrainVisible.value = !terrainVisible.value
  
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
}

// Load Google Maps API dynamically
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,visualization&v=weekly&callback=initGoogleMaps`
    script.async = true
    script.defer = true
    
    // Define global callback function
    window.initGoogleMaps = () => {
      resolve()
    }
    
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

onMounted(async () => {
  try {
    await loadGoogleMapsScript()
    initMap()
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
})

// Expose map instance and methods for parent components
defineExpose({
  map,
  is3DMode,
  buildingsVisible,
  terrainVisible,
  currentTilt,
  toggleTilt,
  rotateMap,
  toggleBuildingLayer,
  toggleTerrainLayer,
  setTiltAngle
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.control-button {
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;
}

.control-button:hover {
  background-color: #f0f0f0;
}

.tilt-control {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tilt-control label {
  font-size: 14px;
}

.tilt-control input {
  width: 100%;
}
</style> 