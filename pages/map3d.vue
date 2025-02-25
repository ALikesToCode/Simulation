<template>
  <div class="map-page">
    <h1>Google Maps 3D Visualization</h1>
    <div class="map-wrapper">
      <GoogleMap3D ref="mapRef" />
    </div>
    <div class="info-panel">
      <h2>3D Map Controls</h2>
      <p>
        This page demonstrates the Google Maps 3D functionality. Use the controls in the top-left corner to:
      </p>
      <ul>
        <li>Toggle between 2D and 3D views</li>
        <li>Rotate the map (in 3D mode)</li>
      </ul>
      <p>
        You can also:
      </p>
      <ul>
        <li>Zoom in/out using the mouse wheel or +/- buttons</li>
        <li>Pan by clicking and dragging</li>
        <li>Tilt by holding Ctrl (or ⌘) and dragging up/down</li>
        <li>Rotate by holding Ctrl (or ⌘) and dragging left/right</li>
      </ul>
      <div class="actions">
        <button @click="toggleMapMode" class="action-button">
          {{ is3DMode ? 'Switch to 2D' : 'Switch to 3D' }}
        </button>
        <button @click="rotateMapView" class="action-button" :disabled="!is3DMode">
          Rotate Map
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GoogleMap3D from '~/components/GoogleMap3D.vue'

const mapRef = ref<InstanceType<typeof GoogleMap3D> | null>(null)
const is3DMode = computed(() => mapRef.value?.is3DMode || false)

const toggleMapMode = () => {
  mapRef.value?.toggleTilt()
}

const rotateMapView = () => {
  mapRef.value?.rotateMap()
}

onMounted(() => {
  // You can add additional initialization logic here if needed
})
</script>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

h1 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.map-wrapper {
  flex: 1;
  min-height: 500px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.info-panel {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-top: 0;
  color: #333;
}

ul {
  padding-left: 20px;
}

li {
  margin-bottom: 8px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.action-button {
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.action-button:hover {
  background-color: #3367d6;
}

.action-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style> 