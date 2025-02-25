<template>
  <div class="agent-details" v-if="agent">
    <div class="agent-header">
      <h3>Agent {{ agent.id }}</h3>
      <div class="agent-type" :class="agent.type">{{ agent.type }}</div>
    </div>
    
    <div class="agent-stats">
      <div class="stat-item">
        <div class="stat-label">Position:</div>
        <div class="stat-value">({{ Math.round(agent.position.x) }}, {{ Math.round(agent.position.z) }})</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Speed:</div>
        <div class="stat-value">{{ agent.speed }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Task:</div>
        <div class="stat-value">{{ agent.state.currentTask }}</div>
      </div>
    </div>
    
    <div class="agent-location">
      <button @click="focusOnAgent" class="focus-button">
        <span class="icon">🔍</span> Focus on Agent
      </button>
      <button @click="$emit('show-path', agent.id)" class="path-button" :disabled="!hasPath">
        <span class="icon">🛣️</span> {{ showingPath ? 'Hide Path' : 'Show Path' }}
      </button>
    </div>
    
    <div class="agent-thoughts" v-if="agent.state.thoughts && agent.state.thoughts.length > 0">
      <h4>Chain of Thoughts</h4>
      <div class="thoughts-timeline">
        <div 
          v-for="(thought, index) in agent.state.thoughts" 
          :key="index"
          class="thought-item"
        >
          <div class="thought-time">{{ formatTime(thought.timestamp) }}</div>
          <div class="thought-content">{{ thought.content }}</div>
        </div>
      </div>
    </div>
    
    <div class="agent-path" v-if="hasPath">
      <h4>Path Information</h4>
      <div class="path-stats">
        <div class="stat-item">
          <div class="stat-label">Target:</div>
          <div class="stat-value">({{ agent.target ? Math.round(agent.target.x) : 0 }}, {{ agent.target ? Math.round(agent.target.z) : 0 }})</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Path Points:</div>
          <div class="stat-value">{{ agent.state.path.length }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Progress:</div>
          <div class="stat-value">{{ agent.state.pathIndex || 0 }} / {{ agent.state.path.length }}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="agent-details-empty" v-else>
    <p>Select an agent to view details</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as THREE from 'three';

interface AgentThought {
  timestamp: number;
  content: string;
}

interface AgentState {
  currentTask: string;
  path: THREE.Vector3[];
  pathIndex: number;
  thoughts: AgentThought[];
}

interface Agent {
  id: string;
  type: string;
  position: THREE.Vector3;
  target: THREE.Vector3 | null;
  speed: number;
  state: AgentState;
}

const props = defineProps<{
  agent: Agent | null;
  showingPath: boolean;
}>();

const emit = defineEmits<{
  (e: 'focus', agentId: string): void;
  (e: 'show-path', agentId: string): void;
}>();

const hasPath = computed(() => {
  return props.agent && 
         props.agent.state && 
         props.agent.state.path && 
         props.agent.state.path.length > 0;
});

const focusOnAgent = () => {
  if (props.agent) {
    emit('focus', props.agent.id);
  }
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
</script>

<style scoped>
.agent-details {
  background-color: #2a2a2a;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
}

.agent-details-empty {
  background-color: #2a2a2a;
  border-radius: 6px;
  padding: 30px 15px;
  margin-bottom: 15px;
  text-align: center;
  color: #888;
  font-style: italic;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #444;
}

.agent-header h3 {
  margin: 0;
  font-size: 18px;
}

.agent-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.agent-type.blue {
  background-color: #2c5282;
  color: white;
}

.agent-type.red {
  background-color: #822c2c;
  color: white;
}

.agent-stats {
  margin-bottom: 15px;
}

.stat-item {
  display: flex;
  margin-bottom: 5px;
}

.stat-label {
  width: 80px;
  color: #aaa;
  font-size: 14px;
}

.stat-value {
  font-size: 14px;
  color: white;
}

.agent-location {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.focus-button, .path-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px;
  background-color: #3a3a3a;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.focus-button:hover, .path-button:hover {
  background-color: #4a4a4a;
}

.focus-button:disabled, .path-button:disabled {
  background-color: #333;
  color: #777;
  cursor: not-allowed;
}

.icon {
  font-size: 16px;
}

.agent-thoughts {
  margin-top: 20px;
}

.agent-thoughts h4, .agent-path h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #ddd;
}

.thoughts-timeline {
  max-height: 200px;
  overflow-y: auto;
  border-left: 2px solid #444;
  padding-left: 15px;
}

.thought-item {
  margin-bottom: 12px;
  position: relative;
}

.thought-item:before {
  content: '';
  position: absolute;
  left: -19px;
  top: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #555;
}

.thought-time {
  font-size: 12px;
  color: #888;
  margin-bottom: 3px;
}

.thought-content {
  font-size: 14px;
  color: #ddd;
  line-height: 1.4;
}

.agent-path {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #444;
}

.path-stats {
  background-color: #333;
  padding: 10px;
  border-radius: 4px;
}

/* Media queries for responsive design */
@media (max-width: 992px) {
  .agent-location {
    flex-direction: column;
    gap: 8px;
  }
  
  .focus-button, .path-button {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .agent-details, .agent-details-empty {
    padding: 12px;
  }
  
  .agent-header h3 {
    font-size: 16px;
  }
  
  .stat-label {
    width: 70px;
    font-size: 12px;
  }
  
  .stat-value {
    font-size: 12px;
  }
  
  .thoughts-timeline {
    max-height: 150px;
  }
  
  .thought-content {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .agent-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .agent-type {
    align-self: flex-start;
  }
  
  .stat-item {
    flex-direction: column;
    margin-bottom: 8px;
  }
  
  .stat-label {
    width: 100%;
    margin-bottom: 2px;
  }
}
</style> 