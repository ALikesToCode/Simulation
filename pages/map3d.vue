<template>
  <div class="map-page">
    <h1>3D Map Visualization</h1>
    <div class="intro-message" v-if="showIntro">
      <h2>Welcome to the 3D City Explorer!</h2>
      <p>Experience our new <span class="highlight">Photorealistic 3D Maps</span> feature!</p>
      <ul>
        <li><strong>Arrow Keys</strong>: Move and turn your avatar</li>
        <li><strong>Shift + Arrow Keys</strong>: Move faster</li>
        <li><strong>First Person Mode</strong>: Toggle in the controls panel</li>
        <li><strong>Photorealistic View</strong>: Try our new immersive 3D experience</li>
      </ul>
      <button @click="dismissIntro" class="dismiss-button">Got it!</button>
    </div>
    <div class="map-wrapper">
      <GoogleMap3D ref="mapRef" @map-click="onMapClick" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import GoogleMap3D from '~/components/GoogleMap3D.vue'

const mapRef = ref<InstanceType<typeof GoogleMap3D> | null>(null)
const showIntro = ref(true)

// Check if the user has already seen the intro
onMounted(() => {
  const hasSeenIntro = localStorage.getItem('map3d_intro_seen')
  if (hasSeenIntro === 'true') {
    showIntro.value = false
  }
  
  // Enable photorealistic view by default after a short delay
  setTimeout(() => {
    if (mapRef.value && mapRef.value.map) {
      mapRef.value.togglePhotoRealistic()
    } else {
      // If map is not ready yet, try again after a longer delay
      setTimeout(() => {
        if (mapRef.value && mapRef.value.map) {
          mapRef.value.togglePhotoRealistic()
        }
      }, 5000)
    }
  }, 2000)
})

const dismissIntro = () => {
  showIntro.value = false
  // Save the preference to localStorage
  localStorage.setItem('map3d_intro_seen', 'true')
}

const onMapClick = (event: google.maps.MapMouseEvent) => {
  // Handle map click without logging
}
</script>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  position: relative;
}

h1 {
  margin-top: 0;
  margin-bottom: 20px;
  color: white;
  font-size: 24px;
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

.map-wrapper {
  flex: 1;
  min-height: 500px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .map-page {
    padding: 10px;
  }
  
  h1 {
    font-size: 20px;
    margin-bottom: 10px;
  }
  
  .map-wrapper {
    min-height: 400px;
  }
  
  .intro-message {
    max-width: 320px;
    padding: 15px;
  }
  
  .intro-message h2 {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .map-page {
    padding: 5px;
  }
  
  h1 {
    font-size: 18px;
    margin-bottom: 8px;
  }
  
  .map-wrapper {
    min-height: 300px;
  }
  
  .intro-message {
    max-width: 280px;
    padding: 12px;
  }
  
  .intro-message h2 {
    font-size: 16px;
  }
  
  .intro-message li {
    font-size: 14px;
  }
}
</style> 