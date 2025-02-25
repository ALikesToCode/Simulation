<template>
  <div class="buildings-overlay-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading 3D buildings data...</p>
    </div>
    
    <div v-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-if="buildingInfo" class="building-info">
      <h3>Building Information</h3>
      <div class="info-row">
        <span class="label">Name:</span>
        <span class="value">{{ buildingInfo.name || 'Unknown' }}</span>
      </div>
      <div class="info-row">
        <span class="label">Height:</span>
        <span class="value">{{ buildingInfo.height || 'Unknown' }} m</span>
      </div>
      <div class="info-row">
        <span class="label">Levels:</span>
        <span class="value">{{ buildingInfo.levels || 'Unknown' }}</span>
      </div>
      <div class="info-row">
        <span class="label">Type:</span>
        <span class="value">{{ buildingInfo.type || 'Unknown' }}</span>
      </div>
      <button @click="closeBuildingInfo" class="close-button">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

// Define props
const props = defineProps<{
  map?: google.maps.Map | null
}>()

// State
const loading = ref(false)
const error = ref('')
const buildingInfo = ref<{
  name: string;
  height: number;
  levels: number;
  type: string;
  position: google.maps.LatLng;
} | null>(null)

// WebGL overlay
let webGLOverlay: google.maps.WebGLOverlayView | null = null
let clickListener: google.maps.MapsEventListener | null = null

// Initialize the WebGL overlay
const initWebGLOverlay = () => {
  if (!props.map) return
  
  try {
    // Create WebGL overlay
    webGLOverlay = new google.maps.WebGLOverlayView()
    
    // Set up WebGL overlay methods
    webGLOverlay.onAdd = () => {
      console.log('WebGL overlay added to map')
    }
    
    webGLOverlay.onContextLost = () => {
      console.log('WebGL context lost')
    }
    
    webGLOverlay.onContextRestored = (options: google.maps.WebGLStateOptions) => {
      console.log('WebGL context restored')
    }
    
    webGLOverlay.onDraw = (options: google.maps.WebGLDrawOptions) => {
      const gl = options.gl
      const transformer = options.transformer
      // This is where we would render custom 3D content
      // For now, we're just using this to enable 3D building selection
    }
    
    // Add the overlay to the map
    webGLOverlay.setMap(props.map)
    
    // Add click listener to the map
    clickListener = google.maps.event.addListener(props.map, 'click', handleMapClick)
  } catch (error) {
    console.error('Error initializing WebGL overlay:', error)
  }
}

// Handle map clicks
const handleMapClick = async (event: google.maps.MapMouseEvent) => {
  if (!event.latLng || !props.map) return
  
  try {
    loading.value = true
    error.value = ''
    
    // Use Places API to get information about the clicked location
    const placesService = new google.maps.places.PlacesService(props.map)
    
    const request: google.maps.places.PlaceSearchRequest = {
      location: event.latLng,
      radius: 50,
      type: 'point_of_interest'
    }
    
    placesService.nearbySearch(request, (results, status) => {
      loading.value = false
      
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
        // Get details for the first result
        const placeId = results[0].place_id
        
        if (!placeId) {
          // Handle case where place_id is undefined
          createGenericBuildingInfo(event.latLng!)
          return
        }
        
        const placeRequest: google.maps.places.PlaceDetailsRequest = {
          placeId: placeId,
          fields: ['name', 'types', 'geometry']
        }
        
        placesService.getDetails(placeRequest, (place, detailStatus) => {
          if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
            // Create building info
            buildingInfo.value = {
              name: place.name || 'Unknown Building',
              height: Math.round(Math.random() * 100 + 10), // Simulated height
              levels: Math.round(Math.random() * 20 + 1), // Simulated levels - removed building_levels
              type: place.types && place.types.length > 0 ? place.types[0].replace('_', ' ') : 'building',
              position: place.geometry?.location || event.latLng!
            }
          } else {
            // If no specific place details, create generic building info
            createGenericBuildingInfo(event.latLng!)
          }
        })
      } else {
        // If no places found, create generic building info
        createGenericBuildingInfo(event.latLng!)
      }
    })
  } catch (err) {
    loading.value = false
    error.value = `Error getting building information: ${err}`
    console.error('Error getting building information:', err)
  }
}

// Helper function to create generic building info
const createGenericBuildingInfo = (position: google.maps.LatLng) => {
  buildingInfo.value = {
    name: 'Building',
    height: Math.round(Math.random() * 100 + 10),
    levels: Math.round(Math.random() * 20 + 1),
    type: 'building',
    position: position
  }
}

// Close building info
const closeBuildingInfo = () => {
  buildingInfo.value = null
}

// Watch for map changes
watch(() => props.map, (newMap) => {
  if (newMap) {
    initWebGLOverlay()
  } else {
    // Clean up
    if (webGLOverlay) {
      webGLOverlay.setMap(null)
    }
    
    if (clickListener) {
      google.maps.event.removeListener(clickListener)
    }
  }
})

// Lifecycle hooks
onMounted(() => {
  if (props.map) {
    initWebGLOverlay()
  }
})

onBeforeUnmount(() => {
  // Clean up
  if (webGLOverlay) {
    webGLOverlay.setMap(null)
  }
  
  if (clickListener) {
    google.maps.event.removeListener(clickListener)
  }
})
</script>

<style scoped>
.buildings-overlay-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 10;
  width: 250px;
}

.loading {
  background-color: rgba(42, 42, 42, 0.9);
  border-radius: 8px;
  padding: 15px;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #4285F4;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  background-color: rgba(244, 67, 54, 0.9);
  border-radius: 8px;
  padding: 15px;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.building-info {
  background-color: rgba(42, 42, 42, 0.9);
  border-radius: 8px;
  padding: 15px;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.building-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
  color: #4285F4;
  text-align: center;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label {
  font-weight: bold;
  color: #BBDEFB;
}

.close-button {
  background-color: #4285F4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
  margin-top: 10px;
}

.close-button:hover {
  background-color: #3367D6;
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .buildings-overlay-container {
    width: 220px;
  }
  
  .building-info h3 {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .buildings-overlay-container {
    width: 200px;
    bottom: 10px;
    right: 10px;
  }
  
  .building-info {
    padding: 10px;
  }
  
  .building-info h3 {
    font-size: 14px;
  }
  
  .close-button {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style> 