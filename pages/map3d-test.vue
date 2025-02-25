<template>
  <div class="map-test-page">
    <h1>Google Maps 3D Test</h1>
    <div class="map-container" ref="mapContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRuntimeConfig } from '#app'

const mapContainer = ref<HTMLDivElement | null>(null)
const config = useRuntimeConfig()

// Function to initialize the map
const initMap = () => {
  if (!mapContainer.value || !window.google) return
  
  const mapOptions = {
    center: { 
      lat: config.public.simulationSettings.cityCenterLat, 
      lng: config.public.simulationSettings.cityCenterLng 
    },
    zoom: 18,
    mapTypeId: 'satellite',
    tilt: 45
  }
  
  const map = new window.google.maps.Map(mapContainer.value, mapOptions)
  
  // Add event listener for when the map is idle (fully loaded)
  window.google.maps.event.addListenerOnce(map, 'idle', () => {
    console.log('Map loaded successfully')
  })
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMaps`
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

onMounted(async () => {
  try {
    await loadGoogleMapsScript()
    initMap()
  } catch (error) {
    console.error('Error initializing Google Maps:', error)
  }
})

onBeforeUnmount(() => {
  // Clean up if needed
})
</script>

<style scoped>
.map-test-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

h1 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #fff;
}

.map-container {
  flex: 1;
  min-height: 500px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style> 