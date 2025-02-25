<template>
  <div class="elevation-profile-container">
    <div class="controls">
      <h3>Elevation Profile</h3>
      <p v-if="!path.length">Click on the map to add points to the path.</p>
      <p v-else>Path with {{ path.length }} points. Total distance: {{ totalDistance.toFixed(2) }} km</p>
      <div class="buttons">
        <button @click="clearPath" :disabled="!path.length" class="control-button">Clear Path</button>
        <button @click="getElevationData" :disabled="path.length < 2" class="control-button primary">
          Get Elevation Profile
        </button>
      </div>
    </div>
    
    <div class="chart-container" v-if="elevationData.length">
      <canvas ref="chartCanvas"></canvas>
    </div>
    
    <div class="loading-overlay" v-if="loading">
      <div class="spinner"></div>
      <p>Loading elevation data...</p>
    </div>
    
    <div class="error-message" v-if="error">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRuntimeConfig } from '#app'

// Define props and emits
const props = defineProps<{
  map?: google.maps.Map | null
}>()

const emit = defineEmits<{
  (e: 'path-updated', path: google.maps.LatLng[]): void
}>()

// State
const path = ref<google.maps.LatLng[]>([])
const elevationData = ref<{ location: google.maps.LatLng, elevation: number, distance: number }[]>([])
const loading = ref(false)
const error = ref('')
const chartCanvas = ref<HTMLCanvasElement | null>(null)
const chart = ref<any>(null)
const pathPolyline = ref<google.maps.Polyline | null>(null)
const pathMarkers = ref<google.maps.Marker[]>([])
const clickListener = ref<google.maps.MapsEventListener | null>(null)
const totalDistance = ref(0)

// Initialize the component
onMounted(() => {
  if (props.map) {
    initializeMap()
  }
  
  // Load Chart.js dynamically
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
  script.async = true
  script.onload = () => {
    console.log('Chart.js loaded')
  }
  document.head.appendChild(script)
})

// Watch for map changes
watch(() => props.map, (newMap) => {
  if (newMap) {
    initializeMap()
  }
})

// Initialize map components
const initializeMap = () => {
  if (!props.map) return
  
  // Create polyline for the path
  pathPolyline.value = new google.maps.Polyline({
    map: props.map,
    path: path.value,
    strokeColor: '#4285F4',
    strokeOpacity: 0.8,
    strokeWeight: 3
  })
  
  // Add click listener to the map
  clickListener.value = google.maps.event.addListener(props.map, 'click', (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return
    
    // Add point to the path
    path.value.push(event.latLng)
    
    // Update polyline
    if (pathPolyline.value) {
      pathPolyline.value.setPath(path.value)
    }
    
    // Add marker for the point
    const marker = new google.maps.Marker({
      position: event.latLng,
      map: props.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      }
    })
    
    pathMarkers.value.push(marker)
    
    // Calculate total distance
    if (path.value.length > 1) {
      const lastIndex = path.value.length - 1
      const lastPoint = path.value[lastIndex]
      const prevPoint = path.value[lastIndex - 1]
      
      totalDistance.value += calculateDistance(
        prevPoint.lat(), prevPoint.lng(),
        lastPoint.lat(), lastPoint.lng()
      )
    }
    
    // Emit path updated event
    emit('path-updated', path.value)
  })
}

// Clear the path
const clearPath = () => {
  path.value = []
  elevationData.value = []
  totalDistance.value = 0
  error.value = ''
  
  // Clear polyline
  if (pathPolyline.value) {
    pathPolyline.value.setPath([])
  }
  
  // Clear markers
  pathMarkers.value.forEach(marker => {
    marker.setMap(null)
  })
  pathMarkers.value = []
  
  // Clear chart
  if (chart.value) {
    chart.value.destroy()
    chart.value = null
  }
  
  // Emit path updated event
  emit('path-updated', path.value)
}

// Get elevation data for the path
const getElevationData = () => {
  if (!window.google || !window.google.maps || path.value.length < 2) {
    error.value = 'Invalid path or Google Maps API not loaded'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    // Create the elevation service
    const elevator = new google.maps.ElevationService()
    
    // Create a path request
    const pathRequest: google.maps.PathElevationRequest = {
      path: path.value,
      samples: 100 // Number of elevation samples along the path
    }
    
    // Get the elevation data
    elevator.getElevationAlongPath(
      pathRequest,
      (results: google.maps.ElevationResult[] | null, status: google.maps.ElevationStatus) => {
        loading.value = false
        
        if (status === google.maps.ElevationStatus.OK && results) {
          // Process the elevation data
          processElevationData(results)
        } else {
          error.value = `Elevation request failed: ${status}`
        }
      }
    )
  } catch (err) {
    loading.value = false
    error.value = `Error getting elevation data: ${err}`
    console.error('Error getting elevation data:', err)
  }
}

// Process elevation data and create chart
const processElevationData = (results: google.maps.ElevationResult[]) => {
  // Calculate distances between points
  let distance = 0
  const processedData = results.map((result, index) => {
    if (index > 0) {
      const prevLocation = results[index - 1].location
      const currentLocation = result.location
      
      // Add null checks to prevent TypeScript errors
      if (prevLocation && currentLocation) {
        distance += calculateDistance(
          prevLocation.lat(), prevLocation.lng(),
          currentLocation.lat(), currentLocation.lng()
        )
      }
    }
    
    return {
      location: result.location,
      elevation: result.elevation,
      distance: distance
    }
  })
  
  // Type assertion to satisfy TypeScript
  elevationData.value = processedData as {
    location: google.maps.LatLng;
    elevation: number;
    distance: number;
  }[]
  
  // Create chart
  createElevationChart()
}

// Create elevation chart
const createElevationChart = () => {
  if (!chartCanvas.value || !window.Chart) return
  
  // Destroy existing chart if it exists
  if (chart.value) {
    chart.value.destroy()
  }
  
  // Prepare data for the chart
  const labels = elevationData.value.map(point => point.distance.toFixed(2))
  const data = elevationData.value.map(point => point.elevation)
  
  // Calculate min and max elevation for better visualization
  const minElevation = Math.min(...data) * 0.95
  const maxElevation = Math.max(...data) * 1.05
  
  // Create the chart
  chart.value = new window.Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Elevation (m)',
        data: data,
        borderColor: '#4285F4',
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Distance (km)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Elevation (m)'
          },
          min: minElevation,
          max: maxElevation
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: any) => {
              return `Elevation: ${context.raw.toFixed(1)} m`
            }
          }
        }
      }
    }
  })
}

// Calculate distance between two points in kilometers (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}

// Clean up on component unmount
onBeforeUnmount(() => {
  // Remove click listener
  if (clickListener.value) {
    google.maps.event.removeListener(clickListener.value)
  }
  
  // Remove polyline
  if (pathPolyline.value) {
    pathPolyline.value.setMap(null)
  }
  
  // Remove markers
  pathMarkers.value.forEach(marker => {
    marker.setMap(null)
  })
  
  // Destroy chart
  if (chart.value) {
    chart.value.destroy()
  }
})

// Extend Window interface for Chart.js
declare global {
  interface Window {
    Chart: any;
  }
}
</script>

<style scoped>
.elevation-profile-container {
  background-color: rgba(42, 42, 42, 0.9);
  border-radius: 8px;
  padding: 15px;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 600px;
  position: relative;
}

.controls {
  margin-bottom: 15px;
}

h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
  color: #4285F4;
}

.buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
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
  flex: 1;
}

.control-button:hover:not(:disabled) {
  background-color: rgba(85, 85, 85, 0.9);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-button.primary {
  background-color: #4285F4;
}

.control-button.primary:hover:not(:disabled) {
  background-color: #3367D6;
}

.chart-container {
  height: 200px;
  margin-top: 15px;
  position: relative;
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
  z-index: 10;
  border-radius: 8px;
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

.error-message {
  color: #ff6b6b;
  margin-top: 10px;
  text-align: center;
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .elevation-profile-container {
    max-width: 100%;
    padding: 12px;
  }
  
  h3 {
    font-size: 16px;
  }
  
  .control-button {
    font-size: 12px;
    padding: 6px 10px;
  }
  
  .chart-container {
    height: 180px;
  }
}

@media (max-width: 480px) {
  .elevation-profile-container {
    padding: 10px;
  }
  
  h3 {
    font-size: 14px;
  }
  
  .buttons {
    flex-direction: column;
    gap: 5px;
  }
  
  .chart-container {
    height: 150px;
  }
}
</style> 