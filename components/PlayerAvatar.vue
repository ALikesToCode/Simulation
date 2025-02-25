<template>
  <div class="player-avatar-container">
    <!-- The player avatar will be rendered on the map using Google Maps Marker -->
    <div v-if="showControls" class="controls-info">
      <div class="controls-title">Player Controls</div>
      <div class="control-instruction">
        <span class="key">↑</span> Move Forward
      </div>
      <div class="control-instruction">
        <span class="key">↓</span> Move Backward
      </div>
      <div class="control-instruction">
        <span class="key">←</span> Turn Left
      </div>
      <div class="control-instruction">
        <span class="key">→</span> Turn Right
      </div>
      <div class="control-instruction">
        <span class="key">Shift + ↑↓</span> Move Faster
      </div>
      <button @click="toggleControls" class="close-button">Close</button>
    </div>
    <button v-else @click="toggleControls" class="help-button">?</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRuntimeConfig } from '#app'
import * as THREE from 'three'

const props = defineProps<{
  map: google.maps.Map | null
}>()

const emit = defineEmits<{
  (e: 'position-update', position: { lat: number, lng: number }): void
}>()

// Player state
const playerMarker = ref<google.maps.Marker | google.maps.marker.AdvancedMarkerElement | null>(null)
const playerPosition = ref<google.maps.LatLng | null>(null)
const playerHeading = ref(0) // 0 degrees = North
const playerSpeed = ref(0.00005) // Speed in lat/lng degrees
const showControls = ref(true)
const isFirstPerson = ref(false)
const keysPressed = ref<Record<string, boolean>>({})
const lastUpdateTime = ref(0)
const updateInterval = 16 // ~60fps
const positionChanged = ref(false)

// Toggle controls visibility
const toggleControls = () => {
  showControls.value = !showControls.value
}

// Initialize player marker
const initializePlayerMarker = () => {
  if (!props.map) {
    console.warn('Map not available for player avatar initialization')
    return
  }

  // Get center of the map for initial position
  const center = props.map.getCenter()
  if (!center) return

  playerPosition.value = center

  // Check if AdvancedMarkerElement is available
  if (google.maps.marker?.AdvancedMarkerElement) {
    try {
      // Create marker content
      const markerContent = document.createElement('div')
      markerContent.className = 'player-avatar'
      markerContent.style.width = '24px'
      markerContent.style.height = '24px'
      markerContent.style.borderRadius = '50%'
      markerContent.style.backgroundColor = '#4285F4'
      markerContent.style.border = '3px solid white'
      markerContent.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
      markerContent.style.position = 'relative'
      
      // Add direction indicator
      const directionIndicator = document.createElement('div')
      directionIndicator.style.position = 'absolute'
      directionIndicator.style.top = '-8px'
      directionIndicator.style.left = '8px'
      directionIndicator.style.width = '0'
      directionIndicator.style.height = '0'
      directionIndicator.style.borderLeft = '4px solid transparent'
      directionIndicator.style.borderRight = '4px solid transparent'
      directionIndicator.style.borderBottom = '8px solid white'
      directionIndicator.style.transform = 'translateX(-50%)'
      markerContent.appendChild(directionIndicator)
      
      // Create advanced marker
      playerMarker.value = new google.maps.marker.AdvancedMarkerElement({
        position: playerPosition.value,
        map: props.map,
        content: markerContent,
        zIndex: 1000
      })
    } catch (error) {
      console.error('Error creating advanced marker:', error)
      createFallbackMarker()
    }
  } else {
    createFallbackMarker()
  }

  // Emit initial position
  emit('position-update', {
    lat: playerPosition.value.lat(),
    lng: playerPosition.value.lng()
  })
}

// Create a fallback standard marker
const createFallbackMarker = () => {
  if (!props.map || !playerPosition.value) return
  
  // Fallback to regular marker
  playerMarker.value = new google.maps.Marker({
    position: playerPosition.value,
    map: props.map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWeight: 2,
      scale: 10,
      rotation: playerHeading.value
    },
    zIndex: 1000
  })
}

// Handle key down events
const handleKeyDown = (event: KeyboardEvent) => {
  // Prevent default behavior for arrow keys to avoid page scrolling
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()
  }
  
  keysPressed.value[event.key] = true
}

// Handle key up events
const handleKeyUp = (event: KeyboardEvent) => {
  keysPressed.value[event.key] = false
}

// Update player position based on keys pressed
const updatePlayerPosition = () => {
  if (!playerPosition.value || !props.map) return
  
  const now = performance.now()
  const deltaTime = now - lastUpdateTime.value
  
  // Throttle updates to the specified interval
  if (deltaTime < updateInterval) return
  
  lastUpdateTime.value = now
  positionChanged.value = false
  
  const speedMultiplier = keysPressed.value['Shift'] ? 2 : 1
  // Calculate speed based on delta time for consistent movement regardless of frame rate
  const currentSpeed = playerSpeed.value * speedMultiplier * (deltaTime / 16.67) // Normalize to 60fps
  
  // Convert heading to radians
  const headingRad = (playerHeading.value * Math.PI) / 180
  
  let newLat = playerPosition.value.lat()
  let newLng = playerPosition.value.lng()
  let headingChanged = false
  
  // Handle arrow keys for movement
  if (keysPressed.value['ArrowUp']) {
    // Move forward in the direction of heading
    newLat += Math.cos(headingRad) * currentSpeed
    newLng += Math.sin(headingRad) * currentSpeed
    positionChanged.value = true
  }
  
  if (keysPressed.value['ArrowDown']) {
    // Move backward in the opposite direction of heading
    newLat -= Math.cos(headingRad) * currentSpeed
    newLng -= Math.sin(headingRad) * currentSpeed
    positionChanged.value = true
  }
  
  // Handle turning
  if (keysPressed.value['ArrowLeft']) {
    playerHeading.value = (playerHeading.value - 3 * (deltaTime / 16.67)) % 360
    if (playerHeading.value < 0) playerHeading.value += 360
    headingChanged = true
  }
  
  if (keysPressed.value['ArrowRight']) {
    playerHeading.value = (playerHeading.value + 3 * (deltaTime / 16.67)) % 360
    headingChanged = true
  }
  
  // Only update position if it changed
  if (positionChanged.value) {
    // Simple collision detection - check if we're near a building
    // This is a placeholder - in a real implementation, you would use the MapService
    // to check for collisions with buildings or other obstacles
    const newPosition = new google.maps.LatLng(newLat, newLng)
    
    // For now, we'll just use the new position
    playerPosition.value = newPosition
  }
  
  // Update marker position and rotation only if needed
  if (playerMarker.value && (positionChanged.value || headingChanged)) {
    try {
      if (positionChanged.value) {
        if (playerMarker.value instanceof google.maps.marker?.AdvancedMarkerElement) {
          playerMarker.value.position = playerPosition.value
        } else if (playerMarker.value instanceof google.maps.Marker) {
          playerMarker.value.setPosition(playerPosition.value)
        }
      }
      
      if (headingChanged) {
        // Update the rotation based on marker type
        if (playerMarker.value instanceof google.maps.marker?.AdvancedMarkerElement) {
          // Update rotation for advanced marker
          if (playerMarker.value.content) {
            const content = playerMarker.value.content as HTMLElement;
            const directionIndicator = content.querySelector('div');
            if (directionIndicator) {
              directionIndicator.style.transform = `translateX(-50%) rotate(${playerHeading.value}deg)`;
            }
          }
        } else if (playerMarker.value instanceof google.maps.Marker) {
          // Update the icon with the new rotation for standard marker
          playerMarker.value.setIcon({
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            rotation: playerHeading.value
          });
        }
      }
      
      // If in first person mode, update the map's center and heading
      if (isFirstPerson.value && props.map && positionChanged.value) {
        props.map.panTo(playerPosition.value)
        
        if (headingChanged) {
          props.map.setHeading(playerHeading.value)
        }
      }
      
      // Emit position update only when position changes
      if (positionChanged.value) {
        emit('position-update', {
          lat: playerPosition.value.lat(),
          lng: playerPosition.value.lng()
        })
      }
    } catch (error) {
      console.error('Error updating player marker:', error)
    }
  }
}

// Game loop for continuous updates
const gameLoopId = ref<number | null>(null)
const startGameLoop = () => {
  const loop = () => {
    updatePlayerPosition()
    gameLoopId.value = requestAnimationFrame(loop)
  }
  gameLoopId.value = requestAnimationFrame(loop)
}

// Toggle first-person view
const toggleFirstPersonView = () => {
  isFirstPerson.value = !isFirstPerson.value
  
  if (isFirstPerson.value && props.map && playerPosition.value) {
    // Set the map to follow the player
    props.map.setCenter(playerPosition.value)
    props.map.setHeading(playerHeading.value)
    props.map.setTilt(45)
    props.map.setZoom(20) // Closer zoom for first-person
  } else if (props.map) {
    // Reset to default view
    props.map.setTilt(0)
    props.map.setHeading(0)
    props.map.setZoom(18)
  }
}

// Watch for map changes
watch(() => props.map, (newMap) => {
  if (newMap) {
    // Initialize player marker when map becomes available
    if (!playerMarker.value) {
      initializePlayerMarker()
    } else {
      // Update marker map reference
      if (playerMarker.value instanceof google.maps.marker.AdvancedMarkerElement) {
        playerMarker.value.map = newMap
      } else {
        playerMarker.value.setMap(newMap)
      }
    }
  }
}, { immediate: true })

// Clean up on component unmount
onBeforeUnmount(() => {
  if (gameLoopId.value !== null) {
    cancelAnimationFrame(gameLoopId.value)
    gameLoopId.value = null
  }
  
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  
  if (playerMarker.value) {
    try {
      if (typeof google !== 'undefined' && google.maps && google.maps.marker && 
          playerMarker.value instanceof google.maps.marker.AdvancedMarkerElement) {
        playerMarker.value.map = null
      } else if (playerMarker.value instanceof google.maps.Marker) {
        playerMarker.value.setMap(null)
      }
    } catch (error) {
      console.error('Error cleaning up player marker:', error)
    }
    playerMarker.value = null
  }
})

// Expose methods for parent components
defineExpose({
  toggleFirstPersonView,
  playerPosition,
  playerHeading
})
</script>

<style scoped>
.player-avatar-container {
  position: relative;
}

.controls-info {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background-color: rgba(42, 42, 42, 0.9);
  border-radius: 8px;
  padding: 15px;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  max-width: 250px;
}

.controls-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 5px;
}

.control-instruction {
  margin: 8px 0;
  display: flex;
  align-items: center;
}

.key {
  display: inline-block;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  margin-right: 10px;
  font-family: monospace;
  min-width: 20px;
  text-align: center;
}

.close-button {
  background-color: rgba(68, 68, 68, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  margin-top: 10px;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: rgba(85, 85, 85, 0.9);
}

.help-button {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(42, 42, 42, 0.9);
  color: white;
  border: none;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .controls-info {
    bottom: 15px;
    left: 15px;
    padding: 12px;
    max-width: 220px;
  }
  
  .controls-title {
    font-size: 14px;
  }
  
  .control-instruction {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .controls-info {
    bottom: 10px;
    left: 10px;
    padding: 10px;
    max-width: 200px;
  }
  
  .controls-title {
    font-size: 13px;
  }
  
  .control-instruction {
    font-size: 12px;
    margin: 6px 0;
  }
  
  .help-button {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
}
</style> 