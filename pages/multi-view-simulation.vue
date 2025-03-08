<template>
  <div class="multi-view-simulation">
    <div class="simulation-grid">
      <!-- First row -->
      <div class="view-row">
        <div class="view-container third-person">
          <h2>3rd Person View</h2>
          <div class="view-content">
            <SimulationEnvironment 
              ref="thirdPersonRef" 
              :viewMode="'thirdPerson'"
              :selectedAgentId="selectedAgentId"
            />
          </div>
        </div>
        <div class="view-container drone">
          <h2>Drone View</h2>
          <div class="view-content">
            <GoogleMap3D 
              ref="droneViewRef"
              :viewMode="'top'"
              @map-error="handleMapError('drone')"
            />
          </div>
        </div>
      </div>
      
      <!-- Second row -->
      <div class="view-row">
        <div class="view-container conversation">
          <h2>Conversation View</h2>
          <div class="view-content">
            <SimulationEnvironment 
              ref="conversationRef" 
              :viewMode="'conversation'"
              :selectedAgentId="selectedAgentId"
            />
          </div>
        </div>
        <div class="view-container swarm">
          <h2>Swarm View</h2>
          <div class="view-content">
            <GoogleMap3D 
              ref="swarmViewRef"
              :viewMode="'swarm'"
              @map-error="handleMapError('swarm')"
            />
          </div>
        </div>
      </div>
    </div>
    
    <div class="controls-panel">
      <div class="location-inputs">
        <div class="input-group">
          <label for="start-location">Start:</label>
          <input 
            type="text" 
            id="start-location" 
            v-model="startLocation" 
            placeholder="Enter start location"
          />
        </div>
        <div class="input-group">
          <label for="end-location">End:</label>
          <input 
            type="text" 
            id="end-location" 
            v-model="endLocation" 
            placeholder="Enter end location"
          />
        </div>
        <button @click="startSimulation" class="start-button">Start Simulation</button>
      </div>
      
      <div class="agent-controls">
        <AgentList 
          :agents="agents" 
          :selectedAgentId="selectedAgentId"
          @select="selectAgent"
        />
      </div>
      
      <div v-if="errorMessages.length > 0" class="error-messages">
        <h3>Errors:</h3>
        <ul>
          <li v-for="(error, index) in errorMessages" :key="index" class="error-message">
            {{ error }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSimulationStore } from '~/stores/simulation';
import GoogleMap3D from '~/components/GoogleMap3D.vue';
import SimulationEnvironment from '~/components/SimulationEnvironment.vue';
import AgentList from '~/components/AgentList.vue';

// References to view components
const thirdPersonRef = ref<InstanceType<typeof SimulationEnvironment> | null>(null);
const droneViewRef = ref<InstanceType<typeof GoogleMap3D> | null>(null);
const conversationRef = ref<InstanceType<typeof SimulationEnvironment> | null>(null);
const swarmViewRef = ref<InstanceType<typeof GoogleMap3D> | null>(null);

// Location inputs
const startLocation = ref('');
const endLocation = ref('');

// Agent selection
const selectedAgentId = ref<string | null>(null);

// Error handling
const errorMessages = ref<string[]>([]);

// Store
const simulationStore = useSimulationStore();
const { agents, isRunning } = storeToRefs(simulationStore);

// Methods
const handleMapError = (viewName: string) => {
  errorMessages.value.push(`${viewName} view: Google Maps could not be loaded. Using fallback visualization.`);
};

const selectAgent = (agentId: string) => {
  // If selecting the same agent, deselect it
  if (selectedAgentId.value === agentId) {
    selectedAgentId.value = null;
    simulationStore.resetAllHighlightsAndPaths();
    return;
  }
  
  // Reset previous agent highlights and paths
  simulationStore.resetAllHighlightsAndPaths();
  
  // Set new selection
  selectedAgentId.value = agentId;
  
  const agent = agents.value.find(a => a.id === agentId);
  if (agent) {
    // Highlight the selected agent
    simulationStore.toggleAgentHighlight(agentId, true);
    
    // Focus camera on selected agent in all views
    focusOnAgent(agentId);
    
    // Add a thought about being selected
    simulationStore.addAgentThought(
      agentId, 
      `I've been selected by the user. My current task is ${agent.state?.currentTask || 'idle'}.`
    );
  }
};

// Focus on an agent in all views
const focusOnAgent = (agentId: string) => {
  const agent = agents.value.find(a => a.id === agentId);
  if (!agent) return;
  
  // Focus third person view
  if (thirdPersonRef.value) {
    thirdPersonRef.value.focusOnAgent(agentId);
  }
  
  // Focus drone view
  if (droneViewRef.value?.map) {
    const position = agent.position;
    const latLng = simulationStore.worldToLatLng(position);
    droneViewRef.value.map.panTo(latLng);
  }
  
  // Focus conversation view
  if (conversationRef.value) {
    conversationRef.value.focusOnAgent(agentId);
  }
  
  // Focus swarm view
  if (swarmViewRef.value?.map) {
    const position = agent.position;
    const latLng = simulationStore.worldToLatLng(position);
    swarmViewRef.value.map.panTo(latLng);
  }
};

// Start simulation with the given start and end locations
const startSimulation = async () => {
  if (!startLocation.value || !endLocation.value) {
    alert('Please enter both start and end locations');
    return;
  }
  
  try {
    // Clear previous errors
    errorMessages.value = [];
    
    await simulationStore.setupSimulation({
      startLocation: startLocation.value,
      endLocation: endLocation.value
    });
    
    simulationStore.startSimulation();
  } catch (error) {
    console.error('Failed to start simulation:', error);
    errorMessages.value.push(`Failed to start simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    alert('Failed to start simulation. Please check your inputs and try again.');
  }
};

// Initialize the simulation
onMounted(() => {
  // Initialize the simulation with default values if needed
  simulationStore.initializeSimulation();
});
</script>

<style scoped>
.multi-view-simulation {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #1a1a1a;
  color: white;
}

.simulation-grid {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.view-row {
  display: flex;
  flex: 1;
  min-height: 0; /* Important for flex child to respect parent height */
}

.view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 8px;
  background-color: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.view-container h2 {
  margin: 0;
  padding: 10px;
  font-size: 1.2rem;
  text-align: center;
  background-color: #333;
  border-bottom: 1px solid #444;
}

.view-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.controls-panel {
  padding: 15px;
  background-color: #2a2a2a;
  border-top: 1px solid #444;
}

.location-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.input-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 200px;
}

.input-group label {
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.input-group input {
  padding: 8px 12px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: white;
  font-size: 1rem;
}

.start-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  align-self: flex-end;
}

.start-button:hover {
  background-color: #45a049;
}

.agent-controls {
  margin-top: 10px;
}

.error-messages {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(255, 107, 107, 0.2);
  border-radius: 4px;
  border-left: 4px solid #ff6b6b;
}

.error-messages h3 {
  margin-top: 0;
  color: #ff6b6b;
  font-size: 1rem;
}

.error-message {
  margin: 5px 0;
  font-size: 0.9rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .view-row {
    flex-direction: column;
  }
  
  .location-inputs {
    flex-direction: column;
  }
}
</style> 