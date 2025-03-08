<template>
  <div class="home-page">
    <div class="welcome-section">
      <h1>Multi-Agent Simulation Platform</h1>
      <p>Explore different simulation views and agent interactions in urban environments</p>
      
      <div class="simulation-links">
        <NuxtLink to="/simulation" class="simulation-link">
          <div class="link-card">
            <h2>Integrated Simulation</h2>
            <p>Combined map and 3D environment view</p>
          </div>
        </NuxtLink>
        
        <NuxtLink to="/agent-simulation" class="simulation-link">
          <div class="link-card">
            <h2>Agent Simulation</h2>
            <p>Focus on agent behaviors and interactions</p>
          </div>
        </NuxtLink>
        
        <NuxtLink to="/multi-view-simulation" class="simulation-link">
          <div class="link-card highlight">
            <h2>Multi-View Simulation</h2>
            <p>Four different perspectives: 3rd Person, Drone, Conversation, and Swarm views</p>
          </div>
        </NuxtLink>
        
        <NuxtLink to="/map3d" class="simulation-link">
          <div class="link-card">
            <h2>3D Map</h2>
            <p>Interactive 3D map visualization</p>
          </div>
        </NuxtLink>
        
        <NuxtLink to="/map3d-advanced" class="simulation-link">
          <div class="link-card">
            <h2>Advanced 3D</h2>
            <p>Enhanced 3D visualization with advanced features</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SimulationEnvironment from '~/components/SimulationEnvironment.vue'
</script>

<style scoped>
.home-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #1a1a1a;
  color: white;
}

.welcome-section {
  max-width: 1200px;
  text-align: center;
  margin-bottom: 40px;
}

.welcome-section h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.welcome-section p {
  font-size: 1.2rem;
  color: #ccc;
  margin-bottom: 40px;
}

.simulation-links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  width: 100%;
}

.simulation-link {
  text-decoration: none;
  color: inherit;
}

.link-card {
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.link-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.link-card h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.5rem;
}

.link-card p {
  margin: 0;
  color: #aaa;
  font-size: 1rem;
}

.link-card.highlight {
  background-color: #2c3e50;
  border: 2px solid #3498db;
}

@media (max-width: 768px) {
  .welcome-section h1 {
    font-size: 2rem;
  }
  
  .welcome-section p {
    font-size: 1rem;
  }
  
  .simulation-links {
    grid-template-columns: 1fr;
  }
}
</style> 