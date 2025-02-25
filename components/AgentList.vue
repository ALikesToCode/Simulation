<template>
  <div class="agent-list-container">
    <div class="list-header">
      <h3>Active Agents</h3>
      <div class="list-controls">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search agents..." 
            @input="filterAgents"
          />
          <button @click="searchQuery = ''; filterAgents()" class="clear-button" v-if="searchQuery">
            ✕
          </button>
        </div>
        <div class="filter-options">
          <label class="filter-option">
            <input type="checkbox" v-model="showBlueAgents" @change="filterAgents" />
            <span class="filter-label blue">Blue</span>
          </label>
          <label class="filter-option">
            <input type="checkbox" v-model="showRedAgents" @change="filterAgents" />
            <span class="filter-label red">Red</span>
          </label>
        </div>
      </div>
    </div>
    
    <div class="agent-count">
      Showing {{ filteredAgents.length }} of {{ agents.length }} agents
    </div>
    
    <div class="agents-grid" v-if="filteredAgents.length > 0">
      <div 
        v-for="agent in filteredAgents" 
        :key="agent.id"
        class="agent-card"
        :class="{ 
          'selected': selectedAgentId === agent.id, 
          'blue': agent.type === 'blue', 
          'red': agent.type === 'red',
          'has-path': agent.state.path && agent.state.path.length > 0
        }"
        @click="selectAgent(agent.id)"
      >
        <div class="agent-card-header">
          <div class="agent-id">{{ agent.id }}</div>
          <div class="agent-type-indicator"></div>
        </div>
        <div class="agent-card-content">
          <div class="agent-position">
            ({{ Math.round(agent.position.x) }}, {{ Math.round(agent.position.z) }})
          </div>
          <div class="agent-task">{{ agent.state.currentTask }}</div>
        </div>
      </div>
    </div>
    
    <div class="no-agents" v-else>
      <p>No agents match your filters</p>
      <button @click="resetFilters" class="reset-button">Reset Filters</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import * as THREE from 'three';

interface AgentState {
  currentTask: string;
  path: THREE.Vector3[];
  pathIndex: number;
}

interface Agent {
  id: string;
  type: string;
  position: THREE.Vector3;
  speed: number;
  state: AgentState;
}

const props = defineProps<{
  agents: Agent[];
  selectedAgentId: string | null;
}>();

const emit = defineEmits<{
  (e: 'select', agentId: string): void;
}>();

// Filter state
const searchQuery = ref('');
const showBlueAgents = ref(true);
const showRedAgents = ref(true);
const filteredAgents = ref<Agent[]>([...props.agents]);

// Watch for changes in the agents prop
watch(() => props.agents, (newAgents) => {
  filterAgents();
}, { deep: true });

// Filter agents based on search query and type filters
const filterAgents = () => {
  filteredAgents.value = props.agents.filter(agent => {
    // Filter by type
    if (agent.type === 'blue' && !showBlueAgents.value) return false;
    if (agent.type === 'red' && !showRedAgents.value) return false;
    
    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      return agent.id.toLowerCase().includes(query) || 
             agent.state.currentTask.toLowerCase().includes(query);
    }
    
    return true;
  });
};

// Reset all filters
const resetFilters = () => {
  searchQuery.value = '';
  showBlueAgents.value = true;
  showRedAgents.value = true;
  filterAgents();
};

// Select an agent
const selectAgent = (agentId: string) => {
  emit('select', agentId);
};

// Initialize filtered agents
filterAgents();
</script>

<style scoped>
.agent-list-container {
  background-color: #2a2a2a;
  border-radius: 6px;
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.list-header h3 {
  margin: 0;
  font-size: 18px;
}

.list-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-box {
  position: relative;
}

.search-box input {
  width: 100%;
  padding: 8px 30px 8px 10px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: white;
}

.clear-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.filter-options {
  display: flex;
  gap: 15px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.filter-label {
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 3px;
}

.filter-label.blue {
  background-color: #2c5282;
  color: white;
}

.filter-label.red {
  background-color: #822c2c;
  color: white;
}

.agent-count {
  font-size: 12px;
  color: #888;
  margin-bottom: 10px;
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  overflow-y: auto;
  flex: 1;
}

.agent-card {
  background-color: #333;
  border-radius: 4px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.agent-card:hover {
  background-color: #3a3a3a;
}

.agent-card.selected {
  background-color: #2c3e50;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.agent-card.blue {
  border-left-color: #4444ff;
}

.agent-card.red {
  border-left-color: #ff4444;
}

.agent-card.has-path {
  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.05) 75%, transparent 75%, transparent);
  background-size: 10px 10px;
}

.agent-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.agent-id {
  font-weight: bold;
  font-size: 14px;
}

.agent-type-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.blue .agent-type-indicator {
  background-color: #4444ff;
}

.red .agent-type-indicator {
  background-color: #ff4444;
}

.agent-card-content {
  font-size: 12px;
  color: #ccc;
}

.agent-position {
  margin-bottom: 4px;
}

.agent-task {
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-agents {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  color: #888;
}

.reset-button {
  margin-top: 10px;
  background-color: #3a3a3a;
  border: none;
  border-radius: 4px;
  color: white;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reset-button:hover {
  background-color: #4a4a4a;
}

/* Media queries for responsive design */
@media (max-width: 992px) {
  .agents-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
  }
  
  .filter-options {
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .agents-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
  
  .agent-card {
    padding: 8px;
  }
  
  .agent-id {
    font-size: 12px;
  }
  
  .agent-card-content {
    font-size: 10px;
  }
}
</style> 