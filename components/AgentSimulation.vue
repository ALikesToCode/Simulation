<template>
  <div class="agent-simulation-container">
    <div class="simulation-header">
      <h2>Agent Simulation</h2>
      <div class="controls">
        <button @click="startSimulation" :disabled="isRunning">Start</button>
        <button @click="pauseSimulation" :disabled="!isRunning">Pause</button>
        <button @click="resetSimulation">Reset</button>
      </div>
    </div>
    
    <div class="main-content">
      <div class="simulation-content">
        <div class="simulation-area">
          <div id="google-map" ref="mapElement"></div>
          <div class="map-controls">
            <div class="map-type-control">
              <select v-model="mapType" @change="updateMapType">
                <option value="roadmap">Roadmap</option>
                <option value="satellite">Satellite</option>
                <option value="hybrid">Hybrid</option>
                <option value="terrain">Terrain</option>
              </select>
            </div>
            <div class="map-style-control">
              <button @click="toggleMapStyle" class="map-style-btn">
                {{ darkMode ? 'Light Mode' : 'Dark Mode' }}
              </button>
            </div>
          </div>
          <div 
            v-for="agent in agents" 
            :key="agent.id" 
            class="agent" 
            :class="[agent.type, { 'selected': selectedAgent?.id === agent.id }]" 
            :style="{ 
              left: `${agent.position.x}px`, 
              top: `${agent.position.y}px` 
            }"
            @click="selectAgent(agent)"
          >
            <div class="agent-label">{{ agent.id }}</div>
            <div v-if="agent.status !== 'idle'" class="agent-status" :class="agent.status">
              {{ agent.status }}
            </div>
          </div>
        </div>
        
        <div class="side-panel">
          <div class="minimap-section">
            <h3>Minimap</h3>
            <div class="minimap-container">
              <div 
                v-for="agent in agents" 
                :key="`map-${agent.id}`" 
                class="minimap-agent" 
                :class="[agent.type, { 'selected': selectedAgent?.id === agent.id }]" 
                :style="{ 
                  left: `${(agent.position.x / simulationWidth) * 100}%`, 
                  top: `${(agent.position.y / simulationHeight) * 100}%` 
                }"
                @click="selectAgent(agent)"
              ></div>
            </div>
          </div>

          <div class="chat-section">
            <h3>Global Communications</h3>
            <div class="chat-container">
              <div class="chat-messages" ref="chatMessages">
                <div 
                  v-for="message in allMessages" 
                  :key="message.id" 
                  class="chat-message"
                  :class="[
                    message.sender === 'System' ? 'system-message' : 
                    message.sender === 'AI' ? 'ai-message' : 'agent-message',
                    { 'selected': message.agentId === selectedAgent?.id }
                  ]"
                >
                  <div class="message-header">
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                    <span class="message-sender" :class="getSenderClass(message.sender)">
                      {{ message.sender }}
                    </span>
                  </div>
                  <div class="message-content" v-html="formatMessageContent(message.content)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="agent-details" v-if="selectedAgent">
        <div class="agent-header">
          <h3>Agent Details: {{ selectedAgent.id }}</h3>
          <div class="agent-status-badge" :class="selectedAgent.status">
            {{ selectedAgent.status }}
          </div>
        </div>

        <div class="agent-info">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Type:</span>
              <span class="info-value" :class="selectedAgent.type">{{ selectedAgent.type }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Position:</span>
              <span class="info-value">({{ Math.round(selectedAgent.position.x) }}, {{ Math.round(selectedAgent.position.y) }})</span>
            </div>
            <div class="info-item">
              <span class="info-label">Objectives:</span>
              <span class="info-value">
                {{ selectedAgent.type === 'blue' ? 'Reach target locations' : 'Lead to ad boards' }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="agent-actions">
          <h4>Actions</h4>
          <div class="action-grid">
            <div class="movement-controls">
              <button class="control-btn up" @click="moveAgent(selectedAgent.id, 'up')" title="Move Up">↑</button>
              <div class="horizontal-controls">
                <button class="control-btn left" @click="moveAgent(selectedAgent.id, 'left')" title="Move Left">←</button>
                <button class="control-btn right" @click="moveAgent(selectedAgent.id, 'right')" title="Move Right">→</button>
              </div>
              <button class="control-btn down" @click="moveAgent(selectedAgent.id, 'down')" title="Move Down">↓</button>
            </div>
            
            <div class="ai-controls">
              <button 
                class="action-btn primary" 
                @click="askAgentForAction(selectedAgent.id)"
                :disabled="selectedAgent.status !== 'idle'"
              >
                Ask for Next Action
              </button>
              <button 
                class="action-btn secondary" 
                @click="openCommunicationModal"
                :disabled="selectedAgent.status !== 'idle'"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
        
        <div class="agent-communication">
          <h4>Personal Communication Log</h4>
          <div class="message-log">
            <div 
              v-for="message in selectedAgent.messages" 
              :key="message.timestamp" 
              class="message"
              :class="getMessageClass(message)"
            >
              <div class="message-header">
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                <span class="message-sender" :class="getSenderClass(message.sender)">
                  {{ message.sender }}
                </span>
              </div>
              <div class="message-content" v-html="formatMessageContent(message.content)"></div>
            </div>
            <div v-if="!selectedAgent.messages?.length" class="no-messages">
              No messages yet
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Communication Modal -->
    <div v-if="showCommunicationModal" class="modal-overlay" @click="closeCommunicationModal">
      <div class="modal-content" @click.stop>
        <h3>Send Message</h3>
        <div class="modal-body">
          <div class="form-group">
            <label>Target Agent:</label>
            <select v-model="selectedTargetId">
              <option value="">Select an agent...</option>
              <option 
                v-for="agent in otherAgents" 
                :key="agent.id" 
                :value="agent.id"
              >
                {{ agent.id }} ({{ agent.type }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Message:</label>
            <textarea 
              v-model="messageContent" 
              placeholder="Enter your message..."
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn secondary" @click="closeCommunicationModal">Cancel</button>
          <button 
            class="action-btn primary" 
            @click="sendCommunication"
            :disabled="!selectedTargetId || !messageContent"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { AIService } from '~/services/AIService';
import GeminiService from '~/services/GeminiService';
import type { AgentContext, AgentResponse } from '~/services/GeminiService';

// Constants
const SIMULATION_WIDTH = 800;
const SIMULATION_HEIGHT = 600;
const AGENT_SPEED = 5;
const SIMULATION_TICK = 100; // ms
const MAX_AGENTS = 10;

// Google Maps related
const mapElement = ref<HTMLElement | null>(null);
const map = ref<google.maps.Map | null>(null);
const mapType = ref<google.maps.MapTypeId>(google.maps.MapTypeId.ROADMAP);
const darkMode = ref(false);
const agentMarkers = ref<Map<string, google.maps.Marker>>(new Map());
const infoWindows = ref<Map<string, google.maps.InfoWindow>>(new Map());
const cityData = ref<any>(null);
const defaultCenter = { lat: 40.7580, lng: -73.9855 }; // NYC by default
const defaultZoom = 15;

// Target locations and ad boards (now using lat/lng)
const TARGET_LOCATIONS: (Position & { lat: number; lng: number })[] = [
  { x: 0, y: 0, lat: 40.7580, lng: -73.9855 },
  { x: 0, y: 0, lat: 40.7590, lng: -73.9845 },
  { x: 0, y: 0, lat: 40.7570, lng: -73.9835 }
];

const AD_BOARDS: (Position & { lat: number; lng: number })[] = [
  { x: 0, y: 0, lat: 40.7585, lng: -73.9850 },
  { x: 0, y: 0, lat: 40.7575, lng: -73.9840 },
  { x: 0, y: 0, lat: 40.7565, lng: -73.9830 }
];

// Simulation state
const simulationWidth = ref(SIMULATION_WIDTH);
const simulationHeight = ref(SIMULATION_HEIGHT);
const agents = ref<Agent[]>([]);
const selectedAgent = ref<Agent | null>(null);
const isRunning = ref(false);
const simulationInterval = ref<ReturnType<typeof setInterval> | null>(null);

// Communication state
const showCommunicationModal = ref(false);
const selectedTargetId = ref('');
const messageContent = ref('');
const chatMessages = ref<HTMLElement | null>(null);

// Computed properties
const otherAgents = computed(() => {
  return agents.value.filter(a => a.id !== selectedAgent.value?.id);
});

const allMessages = computed(() => {
  const messages: (Message & { id: string; agentId: string })[] = [];
  agents.value.forEach(agent => {
    agent.messages.forEach(msg => {
      messages.push({
        ...msg,
        id: `${agent.id}-${msg.timestamp}`,
        agentId: agent.id
      });
    });
  });
  return messages.sort((a, b) => b.timestamp - a.timestamp);
});

// Agent interface
interface Position {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}

interface Message {
  timestamp: number;
  content: string;
  sender?: string;
}

interface Agent {
  id: string;
  type: 'red' | 'blue';
  position: Position;
  status: 'idle' | 'moving' | 'communicating' | 'thinking';
  target?: Position & { lat?: number; lng?: number };
  lastMessage?: string;
  messages: Message[];
  lastAiResponse?: AgentResponse;
  objectives?: {
    targetLocations?: (Position & { lat: number; lng: number })[];
    adBoards?: (Position & { lat: number; lng: number })[];
  };
}

// Initialize AI service
const aiService = new AIService();

// Initialize simulation
onMounted(async () => {
  try {
    await aiService.init();
    
    // Try to load Google Maps API
    try {
      await loadGoogleMapsApi();
      const mapInitialized = await initializeGoogleMap();
      
      if (mapInitialized) {
        await loadCityData();
      } else {
        console.log('Map initialization failed, using fallback environment');
        // Initialize agents without map
        initializeAgents();
      }
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      addMessage('system', 'Error initializing Google Maps. Using fallback simulation environment.', 'System');
      // Initialize agents without map
      initializeAgents();
    }
    
    window.addEventListener('resize', handleResize);
    handleResize();
  } catch (error) {
    console.error('Error during initialization:', error);
    addMessage('system', 'Error during initialization. Some features may not work correctly.', 'System');
  }
});

onUnmounted(() => {
  if (simulationInterval.value) {
    clearInterval(simulationInterval.value);
  }
  window.removeEventListener('resize', handleResize);
});

// Handle window resize
function handleResize() {
  const container = document.querySelector('.simulation-area');
  if (container) {
    simulationWidth.value = container.clientWidth;
    simulationHeight.value = container.clientHeight;
  }
}

// Load Google Maps API dynamically if not already loaded
async function loadGoogleMapsApi() {
  if (typeof google !== 'undefined' && google.maps) {
    console.log('Google Maps API already loaded');
    return Promise.resolve();
  }
  
  const config = useRuntimeConfig();
  const apiKey = config.public.googleMapsApiKey;
  
  if (!apiKey || apiKey === 'YOUR_VALID_GOOGLE_MAPS_API_KEY_HERE') {
    console.error('Invalid Google Maps API key. Please update your .env file with a valid key.');
    addMessage('system', 'Error: Invalid Google Maps API key. Please check your environment configuration.', 'System');
    return Promise.reject(new Error('Invalid Google Maps API key'));
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,visualization&v=beta&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Maps API loaded dynamically');
      resolve(true);
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps API:', error);
      addMessage('system', 'Error: Failed to load Google Maps API. The API key may be invalid or expired.', 'System');
      reject(new Error('Failed to load Google Maps API'));
    };
    
    document.head.appendChild(script);
  });
}

// Initialize Google Maps
async function initializeGoogleMap() {
  if (!mapElement.value) {
    console.error('Map element not found');
    return;
  }
  
  try {
    // Wait for Google Maps API to load
    if (typeof google === 'undefined' || !google.maps) {
      console.log('Waiting for Google Maps API to load...');
      return new Promise((resolve) => {
        const checkGoogleMaps = setInterval(() => {
          if (typeof google !== 'undefined' && google.maps) {
            clearInterval(checkGoogleMaps);
            console.log('Google Maps API loaded');
            
            if (!mapElement.value) {
              console.error('Map element not found after Google Maps API loaded');
              resolve(false);
              return;
            }
            
            const mapOptions: google.maps.MapOptions = {
              center: defaultCenter,
              zoom: defaultZoom,
              mapTypeId: mapType.value,
              styles: darkMode.value ? DARK_MAP_STYLE : [],
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
              zoomControl: true
            };
            
            try {
              map.value = new google.maps.Map(mapElement.value, mapOptions);
              
              // Add event listener for map click
              map.value.addListener('click', (event: google.maps.MapMouseEvent) => {
                if (!event.latLng) return;
                
                // If an agent is selected, set a new target
                if (selectedAgent.value) {
                  const position = event.latLng.toJSON();
                  setAgentTarget(selectedAgent.value.id, position);
                }
              });
              
              resolve(true);
            } catch (error) {
              console.error('Error initializing Google Map:', error);
              addMessage('system', 'Error initializing Google Map. Using fallback simulation environment.', 'System');
              resolve(false);
            }
          } else if (document.querySelector('script[src*="maps.googleapis.com"][onerror]')) {
            // If the script has an error, stop checking
            clearInterval(checkGoogleMaps);
            console.error('Google Maps API failed to load');
            addMessage('system', 'Google Maps API failed to load. Using fallback simulation environment.', 'System');
            resolve(false);
          }
        }, 100);
        
        // Set a timeout to stop checking after 10 seconds
        setTimeout(() => {
          clearInterval(checkGoogleMaps);
          console.error('Timeout waiting for Google Maps API');
          addMessage('system', 'Timeout waiting for Google Maps API. Using fallback simulation environment.', 'System');
          resolve(false);
        }, 10000);
      });
    } else {
      console.log('Google Maps API already loaded');
      
      const mapOptions: google.maps.MapOptions = {
        center: defaultCenter,
        zoom: defaultZoom,
        mapTypeId: mapType.value,
        styles: darkMode.value ? DARK_MAP_STYLE : [],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true
      };
      
      try {
        map.value = new google.maps.Map(mapElement.value, mapOptions);
        
        // Add event listener for map click
        map.value.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          
          // If an agent is selected, set a new target
          if (selectedAgent.value) {
            const position = event.latLng.toJSON();
            setAgentTarget(selectedAgent.value.id, position);
          }
        });
        
        return true;
      } catch (error) {
        console.error('Error initializing Google Map:', error);
        addMessage('system', 'Error initializing Google Map. Using fallback simulation environment.', 'System');
        return false;
      }
    }
  } catch (error) {
    console.error('Error in initializeGoogleMap:', error);
    addMessage('system', 'Error initializing Google Map. Using fallback simulation environment.', 'System');
    return false;
  }
}

// Load city data from API
async function loadCityData() {
  try {
    if (!map.value) {
      console.log('Map not initialized, using fallback city data');
      generateFallbackCityData();
      return;
    }
    
    const center = map.value.getCenter()?.toJSON() || defaultCenter;
    
    try {
      const response = await fetch('/api/city/google-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          center,
          radius: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load city data: ${response.statusText}`);
      }
      
      cityData.value = await response.json();
      
      // Add buildings to map
      if (cityData.value.buildings && cityData.value.buildings.length > 0) {
        cityData.value.buildings.forEach((building: any) => {
          if (!map.value) return;
          
          // Convert building position to LatLng
          const position = latLngFromXYZ(building.position);
          
          // Create marker for building
          try {
            new google.maps.Marker({
              position,
              map: map.value,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: building.color,
                fillOpacity: 0.7,
                strokeWeight: 1,
                strokeColor: '#333'
              },
              title: building.name,
              visible: true
            });
          } catch (error) {
            console.error('Error creating building marker:', error);
          }
        });
      } else {
        console.log('No buildings found in city data, using fallback');
        generateFallbackCityData();
      }
      
      // Add roads to map
      if (cityData.value.roads && cityData.value.roads.length > 0) {
        cityData.value.roads.forEach((road: any) => {
          if (!map.value) return;
          
          // Convert road path to LatLng array
          const path = road.path.map((point: any) => latLngFromXYZ(point));
          
          // Create polyline for road
          try {
            new google.maps.Polyline({
              path,
              map: map.value,
              strokeColor: '#444',
              strokeWeight: road.width || 5,
              strokeOpacity: 0.7
            });
          } catch (error) {
            console.error('Error creating road polyline:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load city data:', error);
      addMessage('system', 'Failed to load city data. Using fallback simulation environment.', 'System');
      generateFallbackCityData();
    }
  } catch (error) {
    console.error('Error in loadCityData:', error);
    addMessage('system', 'Error loading city data. Using fallback simulation environment.', 'System');
    generateFallbackCityData();
  }
}

// Generate fallback city data when API fails
function generateFallbackCityData() {
  console.log('Generating fallback city data');
  
  const buildings = [];
  const roads = [];
  
  // Generate random buildings
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const distance = 200 + Math.random() * 300;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    buildings.push({
      id: `building_${i}`,
      name: `Building ${i}`,
      position: {
        x,
        y: 0,
        z
      },
      dimensions: {
        width: 30 + Math.random() * 40,
        height: 40 + Math.random() * 60,
        depth: 30 + Math.random() * 40
      },
      type: 'building',
      color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
    });
  }
  
  // Create grid roads
  const gridSize = 5;
  const spacing = 100;
  
  // Main roads
  roads.push({
    id: 'road_0',
    name: 'Main Street',
    path: [
      { x: -gridSize * spacing, y: 0, z: 0 },
      { x: gridSize * spacing, y: 0, z: 0 }
    ],
    width: 10,
    type: 'road'
  });
  
  roads.push({
    id: 'road_1',
    name: 'Cross Street',
    path: [
      { x: 0, y: 0, z: -gridSize * spacing },
      { x: 0, y: 0, z: gridSize * spacing }
    ],
    width: 10,
    type: 'road'
  });
  
  // Add some cross streets
  for (let i = 1; i <= gridSize; i++) {
    roads.push({
      id: `road_h_${i}`,
      name: `Horizontal Street ${i}`,
      path: [
        { x: -gridSize * spacing, y: 0, z: i * spacing },
        { x: gridSize * spacing, y: 0, z: i * spacing }
      ],
      width: 8,
      type: 'road'
    });
    
    roads.push({
      id: `road_h_n${i}`,
      name: `Horizontal Street -${i}`,
      path: [
        { x: -gridSize * spacing, y: 0, z: -i * spacing },
        { x: gridSize * spacing, y: 0, z: -i * spacing }
      ],
      width: 8,
      type: 'road'
    });
    
    roads.push({
      id: `road_v_${i}`,
      name: `Vertical Street ${i}`,
      path: [
        { x: i * spacing, y: 0, z: -gridSize * spacing },
        { x: i * spacing, y: 0, z: gridSize * spacing }
      ],
      width: 8,
      type: 'road'
    });
    
    roads.push({
      id: `road_v_n${i}`,
      name: `Vertical Street -${i}`,
      path: [
        { x: -i * spacing, y: 0, z: -gridSize * spacing },
        { x: -i * spacing, y: 0, z: gridSize * spacing }
      ],
      width: 8,
      type: 'road'
    });
  }
  
  cityData.value = {
    buildings,
    roads,
    pois: [],
    center: defaultCenter
  };
  
  // If map is available, add buildings and roads to it
  if (map.value) {
    try {
      // Add buildings to map
      buildings.forEach((building: any) => {
        // Convert building position to LatLng
        const position = latLngFromXYZ(building.position);
        
        // Create marker for building
        new google.maps.Marker({
          position,
          map: map.value,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: building.color,
            fillOpacity: 0.7,
            strokeWeight: 1,
            strokeColor: '#333'
          },
          title: building.name,
          visible: true
        });
      });
      
      // Add roads to map
      roads.forEach((road: any) => {
        // Convert road path to LatLng array
        const path = road.path.map((point: any) => latLngFromXYZ(point));
        
        // Create polyline for road
        new google.maps.Polyline({
          path,
          map: map.value,
          strokeColor: '#444',
          strokeWeight: road.width || 5,
          strokeOpacity: 0.7
        });
      });
    } catch (error) {
      console.error('Error adding fallback city data to map:', error);
    }
  }
}

// Convert XYZ coordinates to LatLng
function latLngFromXYZ(position: { x: number, y: number, z: number }) {
  if (!map.value) return defaultCenter;
  
  const center = map.value.getCenter()?.toJSON() || defaultCenter;
  
  // Convert x,z to lat,lng (simplified conversion)
  const lat = center.lat + (position.z / 111000);
  const lng = center.lng + (position.x / (111000 * Math.cos(center.lat * Math.PI / 180)));
  
  return { lat, lng };
}

// Convert LatLng to XYZ coordinates
function xyzFromLatLng(latLng: google.maps.LatLngLiteral) {
  if (!map.value) return { x: 0, y: 0, z: 0 };
  
  const center = map.value.getCenter()?.toJSON() || defaultCenter;
  
  // Convert lat,lng to x,z (simplified conversion)
  const x = (latLng.lng - center.lng) * 111000 * Math.cos(center.lat * Math.PI / 180);
  const z = (latLng.lat - center.lat) * 111000;
  
  return { x, y: 0, z };
}

// Initialize agents
function initializeAgents() {
  const newAgents: Agent[] = [];
  
  // Create blue agents
  for (let i = 0; i < 5; i++) {
    // Generate random position around map center
    const position = getRandomPosition();
    
    newAgents.push({
      id: `blue-${i + 1}`,
      type: 'blue',
      position: {
        x: position.x,
        y: 0,
        lat: position.lat,
        lng: position.lng
      },
      status: 'idle',
      messages: [],
      objectives: {
        targetLocations: [...TARGET_LOCATIONS]
      }
    });
  }
  
  // Create red agents
  for (let i = 0; i < 3; i++) {
    // Generate random position around map center
    const position = getRandomPosition();
    
    newAgents.push({
      id: `red-${i + 1}`,
      type: 'red',
      position: {
        x: position.x,
        y: 0,
        lat: position.lat,
        lng: position.lng
      },
      status: 'idle',
      messages: [],
      objectives: {
        adBoards: [...AD_BOARDS]
      }
    });
  }
  
  agents.value = newAgents;
  
  // Create markers for agents
  createAgentMarkers();
}

// Get random position around map center
function getRandomPosition() {
  if (!map.value) {
    return { x: 0, y: 0, lat: defaultCenter.lat, lng: defaultCenter.lng };
  }
  
  const center = map.value.getCenter()?.toJSON() || defaultCenter;
  const bounds = map.value.getBounds();
  
  if (!bounds) {
    // If bounds not available, use a small random offset from center
    const latOffset = (Math.random() - 0.5) * 0.01;
    const lngOffset = (Math.random() - 0.5) * 0.01;
    
    const lat = center.lat + latOffset;
    const lng = center.lng + lngOffset;
    
    const position = xyzFromLatLng({ lat, lng });
    
    return { ...position, lat, lng };
  }
  
  // Get random position within bounds
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  
  const lat = sw.lat() + (ne.lat() - sw.lat()) * Math.random();
  const lng = sw.lng() + (ne.lng() - sw.lng()) * Math.random();
  
  const position = xyzFromLatLng({ lat, lng });
  
  return { ...position, lat, lng };
}

// Create markers for agents
function createAgentMarkers() {
  agents.value.forEach(agent => {
    if (!map.value) return;
    
    // Skip if agent doesn't have lat/lng
    if (!agent.position.lat || !agent.position.lng) return;
    
    // Create marker
    const marker = new google.maps.Marker({
      position: { lat: agent.position.lat, lng: agent.position.lng },
      map: map.value,
      title: agent.id,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: agent.type === 'blue' ? '#4a90e2' : '#e25555',
        fillOpacity: 0.8,
        strokeWeight: 2,
        strokeColor: '#ffffff'
      },
      animation: google.maps.Animation.DROP,
      optimized: true
    });
    
    // Create info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="agent-info-window">
          <h3>${agent.id}</h3>
          <p>Type: ${agent.type}</p>
          <p>Status: ${agent.status}</p>
        </div>
      `
    });
    
    // Add click event
    marker.addListener('click', () => {
      selectAgent(agent);
      
      // Close all info windows
      infoWindows.value.forEach(window => window.close());
      
      // Open this info window
      infoWindow.open(map.value, marker);
    });
    
    // Store marker and info window
    agentMarkers.value.set(agent.id, marker);
    infoWindows.value.set(agent.id, infoWindow);
  });
}

// Update agent markers
function updateAgentMarkers() {
  agents.value.forEach(agent => {
    // Skip if agent doesn't have lat/lng
    if (!agent.position.lat || !agent.position.lng) return;
    
    const marker = agentMarkers.value.get(agent.id);
    if (!marker) return;
    
    // Update marker position
    marker.setPosition({ lat: agent.position.lat, lng: agent.position.lng });
    
    // Update info window content
    const infoWindow = infoWindows.value.get(agent.id);
    if (infoWindow) {
      infoWindow.setContent(`
        <div class="agent-info-window">
          <h3>${agent.id}</h3>
          <p>Type: ${agent.type}</p>
          <p>Status: ${agent.status}</p>
        </div>
      `);
    }
  });
}

// Update simulation state
async function updateSimulation() {
  for (const agent of agents.value) {
    // If agent has a target, move towards it
    if (agent.target && agent.status === 'moving') {
      // Skip if agent doesn't have lat/lng
      if (!agent.position.lat || !agent.position.lng || !agent.target.lat || !agent.target.lng) continue;
      
      // Calculate distance in meters
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(agent.position.lat, agent.position.lng),
        new google.maps.LatLng(agent.target.lat, agent.target.lng)
      );
      
      if (distance < 5) {
        // Target reached
        agent.position.lat = agent.target.lat;
        agent.position.lng = agent.target.lng;
        
        // Update x,y coordinates
        const position = xyzFromLatLng({ lat: agent.position.lat, lng: agent.position.lng });
        agent.position.x = position.x;
        agent.position.y = position.y;
        
        agent.target = undefined;
        agent.status = 'idle';
      } else {
        // Move towards target
        const heading = google.maps.geometry.spherical.computeHeading(
          new google.maps.LatLng(agent.position.lat, agent.position.lng),
          new google.maps.LatLng(agent.target.lat, agent.target.lng)
        );
        
        // Convert heading to radians
        const headingRad = heading * Math.PI / 180;
        
        // Calculate new position (move 5 meters in the heading direction)
        const moveDistance = Math.min(distance, AGENT_SPEED);
        const newPosition = google.maps.geometry.spherical.computeOffset(
          new google.maps.LatLng(agent.position.lat, agent.position.lng),
          moveDistance,
          heading
        );
        
        // Update agent position
        agent.position.lat = newPosition.lat();
        agent.position.lng = newPosition.lng();
        
        // Update x,y coordinates
        const position = xyzFromLatLng({ lat: agent.position.lat, lng: agent.position.lng });
        agent.position.x = position.x;
        agent.position.y = position.y;
      }
    }
    
    // Get AI decision for idle agents
    if (agent.status === 'idle' && Math.random() < 0.1) {
      await getAgentDecision(agent);
    }
    
    // Check for agent interactions
    checkAgentInteractions(agent);
  }
  
  // Update agent markers
  updateAgentMarkers();
}

// Set agent target
function setAgentTarget(agentId: string, target: google.maps.LatLngLiteral) {
  const agent = agents.value.find(a => a.id === agentId);
  if (!agent) return;
  
  agent.status = 'moving';
  
  // Update target with lat/lng
  agent.target = {
    ...target,
    ...xyzFromLatLng(target)
  };
  
  // Add message
  addMessage(agent.id, `Moving to location (${target.lat.toFixed(6)}, ${target.lng.toFixed(6)})`, 'System');
}

// Agent movement
function moveAgent(agentId: string, direction: 'up' | 'right' | 'down' | 'left') {
  const agent = agents.value.find(a => a.id === agentId);
  if (!agent || !agent.position.lat || !agent.position.lng) return;
  
  agent.status = 'moving';
  
  const moveDistance = 50; // meters
  let heading = 0;
  
  switch (direction) {
    case 'up':
      heading = 0; // North
      break;
    case 'right':
      heading = 90; // East
      break;
    case 'down':
      heading = 180; // South
      break;
    case 'left':
      heading = 270; // West
      break;
  }
  
  // Calculate new position
  const newPosition = google.maps.geometry.spherical.computeOffset(
    new google.maps.LatLng(agent.position.lat, agent.position.lng),
    moveDistance,
    heading
  );
  
  // Set target
  setAgentTarget(agentId, { lat: newPosition.lat(), lng: newPosition.lng() });
}

// Map controls
function updateMapType() {
  if (!map.value) return;
  map.value.setMapTypeId(mapType.value);
}

function toggleMapStyle() {
  if (!map.value) return;
  
  darkMode.value = !darkMode.value;
  
  map.value.setOptions({
    styles: darkMode.value ? DARK_MAP_STYLE : []
  });
}

// Dark mode map style
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

// Simulation controls
function startSimulation() {
  if (isRunning.value) return;
  
  isRunning.value = true;
  simulationInterval.value = setInterval(updateSimulation, SIMULATION_TICK);
}

function pauseSimulation() {
  if (!isRunning.value) return;
  
  isRunning.value = false;
  if (simulationInterval.value) {
    clearInterval(simulationInterval.value);
    simulationInterval.value = null;
  }
}

function resetSimulation() {
  pauseSimulation();
  initializeAgents();
  selectedAgent.value = null;
}

// Get AI decision for agent
async function getAgentDecision(agent: Agent) {
  agent.status = 'thinking';
  
  // Get nearby agents
  const nearbyAgents = agents.value
    .filter(a => a.id !== agent.id)
    .map(a => ({
      id: a.id,
      type: a.type,
      position: a.position,
      distance: Math.sqrt(
        Math.pow(a.position.x - agent.position.x, 2) + 
        Math.pow(a.position.y - agent.position.y, 2)
      )
    }))
    .filter(a => a.distance < 150);

  // Create context for AI
  const context: AgentContext = {
    agentId: agent.id,
    agentType: agent.type,
    position: agent.position,
    status: agent.status,
    nearbyAgents,
    objectives: agent.objectives
  };

  try {
    const response = await GeminiService.getAgentDecision(context);
    agent.lastAiResponse = response;
    
    // Process AI response
    switch (response.action) {
      case 'move':
        if (response.direction) {
          moveAgent(agent.id, response.direction);
        }
        break;
      case 'communicate':
        if (response.message && response.targetAgentId) {
          sendMessage(agent.id, response.targetAgentId, response.message);
        }
        break;
      case 'function_call':
        await handleFunctionCall(agent, response);
        break;
      case 'observe':
        agent.status = 'idle';
        break;
    }
    
    // Add AI reasoning to messages
    if (response.reasoning.length > 0) {
      addMessage(agent.id, `Thinking: ${response.reasoning.join(' ')}`, 'AI');
    }
  } catch (error) {
    console.error('Error getting agent decision:', error);
    agent.status = 'idle';
  }
}

// Handle function calls from AI
async function handleFunctionCall(agent: Agent, response: AgentResponse) {
  if (!response.functionName || !response.functionArgs) {
    agent.status = 'idle';
    return;
  }

  switch (response.functionName) {
    case 'scan_environment':
      const radius = response.functionArgs.radius || 100;
      // Simulate scanning by getting all agents within radius
      const nearbyAgents = agents.value
        .filter(a => a.id !== agent.id)
        .filter(a => {
          const dx = a.position.x - agent.position.x;
          const dy = a.position.y - agent.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance <= radius;
        });
      addMessage(agent.id, `Scanned environment: Found ${nearbyAgents.length} agents nearby`, 'System');
      break;

    case 'analyze_target':
      const targetId = response.functionArgs.targetId;
      const target = agents.value.find(a => a.id === targetId);
      if (target) {
        const dx = target.position.x - agent.position.x;
        const dy = target.position.y - agent.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        addMessage(agent.id, `Analyzed target ${targetId}: Distance ${Math.round(distance)}px, Status: ${target.status}`, 'System');
      }
      break;

    case 'calculate_path':
      const { targetX, targetY, avoidAgents } = response.functionArgs;
      // Simple path calculation - direct line
      const dx = targetX - agent.position.x;
      const dy = targetY - agent.position.y;
      const angle = Math.atan2(dy, dx);
      addMessage(agent.id, `Calculated path to (${Math.round(targetX)}, ${Math.round(targetY)})`, 'System');
      
      // Move in the calculated direction
      if (Math.abs(dx) > Math.abs(dy)) {
        moveAgent(agent.id, dx > 0 ? 'right' : 'left');
      } else {
        moveAgent(agent.id, dy > 0 ? 'down' : 'up');
      }
      break;
  }
}

// Check for agent interactions
function checkAgentInteractions(agent: Agent) {
  agents.value.forEach(otherAgent => {
    if (agent.id === otherAgent.id) return;
    
    const dx = agent.position.x - otherAgent.position.x;
    const dy = agent.position.y - otherAgent.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If agents are close, they might interact
    if (distance < 50 && Math.random() < 0.1) {
      // Different behavior based on agent types
      if (agent.type === otherAgent.type) {
        // Same type agents cooperate
        const message = `Cooperating with ${otherAgent.id}`;
        addMessage(agent.id, message, 'System');
      } else {
        // Different type agents compete
        const message = `Competing with ${otherAgent.id}`;
        addMessage(agent.id, message, 'System');
      }
    }
  });
}

// Agent selection
function selectAgent(agent: Agent) {
  selectedAgent.value = agent;
}

// Ask agent for next action
async function askAgentForAction(agentId: string) {
  const agent = agents.value.find(a => a.id === agentId);
  if (!agent) return;
  
  agent.status = 'thinking';
  
  try {
    // Get nearby agents
    const nearbyAgents = agents.value
      .filter(a => a.id !== agent.id)
      .map(a => ({
        id: a.id,
        type: a.type,
        position: a.position,
        distance: Math.sqrt(
          Math.pow(a.position.x - agent.position.x, 2) + 
          Math.pow(a.position.y - agent.position.y, 2)
        )
      }))
      .filter(a => a.distance < 150);

    // Create context for AI
    const context: AgentContext = {
      agentId: agent.id,
      agentType: agent.type,
      position: agent.position,
      status: agent.status,
      nearbyAgents,
      objectives: agent.objectives
    };

    // Get AI decision
    const response = await GeminiService.getAgentDecision(context);
    agent.lastAiResponse = response;
    
    // Process AI response
    switch (response.action) {
      case 'move':
        if (response.direction) {
          moveAgent(agent.id, response.direction);
        }
        break;
      case 'communicate':
        if (response.message && response.targetAgentId) {
          sendMessage(agent.id, response.targetAgentId, response.message);
        }
        break;
      case 'function_call':
        await handleFunctionCall(agent, response);
        break;
      case 'observe':
        agent.status = 'idle';
        break;
    }
    
    // Add AI reasoning to messages
    if (response.reasoning.length > 0) {
      addMessage(agent.id, `Thinking: ${response.reasoning.join(' ')}`, 'AI');
    }
  } catch (error) {
    console.error('Error getting agent action:', error);
    agent.status = 'idle';
    addMessage(agent.id, 'Error: Could not determine next action', 'System');
  }
}

// Send message between agents
function sendMessage(senderId: string, targetId: string, content?: string) {
  const sender = agents.value.find(a => a.id === senderId);
  const target = agents.value.find(a => a.id === targetId);
  
  if (!sender || !target) return;
  
  sender.status = 'communicating';
  
  // Generate message content if not provided
  if (!content) {
    if (sender.type === target.type) {
      content = sender.type === 'blue' 
        ? 'Hello fellow blue agent! Let\'s cooperate.' 
        : 'Greetings red agent. Let\'s coordinate our efforts.';
    } else {
      content = sender.type === 'blue' 
        ? 'Warning: Red agent detected. Proceeding with caution.' 
        : 'Target acquired. Blue agent in sight.';
    }
  }
  
  // Add message to both agents' logs
  addMessage(sender.id, `To ${target.id}: ${content}`, sender.id);
  addMessage(target.id, `From ${sender.id}: ${content}`, sender.id);
  
  // Reset status after a delay
  setTimeout(() => {
    if (sender) sender.status = 'idle';
  }, 1000);
}

// Add message to agent's log
function addMessage(agentId: string, content: string, sender?: string) {
  const agent = agents.value.find(a => a.id === agentId);
  if (!agent) {
    // If agent not found, add to system messages
    console.log(`Agent ${agentId} not found, adding message to system`);
    const systemAgent = agents.value.find(a => a.id === 'system') || agents.value[0];
    if (systemAgent) {
      systemAgent.messages.push({
        timestamp: Date.now(),
        content,
        sender: sender || 'System'
      });
    }
    return;
  }
  
  agent.messages.push({
    timestamp: Date.now(),
    content,
    sender: sender || 'System'
  });
  
  // Update last message
  agent.lastMessage = content;
}

// Format timestamp
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

// Methods for communication
function openCommunicationModal() {
  showCommunicationModal.value = true;
  selectedTargetId.value = '';
  messageContent.value = '';
}

function closeCommunicationModal() {
  showCommunicationModal.value = false;
}

function sendCommunication() {
  if (selectedAgent.value && selectedTargetId.value && messageContent.value) {
    sendMessage(selectedAgent.value.id, selectedTargetId.value, messageContent.value);
    closeCommunicationModal();
  }
}

// Utility methods for styling
function getMessageClass(message: Message) {
  if (message.sender === 'System') return 'system-message';
  if (message.sender === 'AI') return 'ai-message';
  return 'agent-message';
}

function getSenderClass(sender: string | undefined) {
  if (!sender) return '';
  if (sender === 'System') return 'system-sender';
  if (sender === 'AI') return 'ai-sender';
  return 'agent-sender';
}

// Format the message content to display thinking process more clearly
function formatMessageContent(content: string): string {
  if (!content) return '';
  
  // Check if the message contains a thinking section
  if (content.includes('Thinking:')) {
    // Split the content into thinking and decision parts
    const parts = content.split(/(?=I will|I decide|I choose|My decision)/i);
    
    if (parts.length > 1) {
      const thinkingPart = parts[0].replace('Thinking:', '<strong class="thinking-header">Thinking:</strong>');
      const decisionPart = `<strong class="decision-header">Decision:</strong> ${parts[1]}`;
      
      // Format the thinking part with bullet points if it contains numbered steps
      let formattedThinking = thinkingPart;
      if (thinkingPart.match(/\d+\./)) {
        formattedThinking = formattedThinking.replace(/(\d+\.)(.*?)(?=\d+\.|$)/gs, '<div class="thinking-step">$1$2</div>');
      }
      
      return `<div class="thinking-section">${formattedThinking}</div><div class="decision-section">${decisionPart}</div>`;
    }
  }
  
  return content;
}

// Auto-scroll chat
watch(allMessages, () => {
  nextTick(() => {
    if (chatMessages.value) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.agent-simulation-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  font-family: 'Inter', 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
  background-color: #f8f9fa;
}

.simulation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e9ecef;
}

.simulation-header h2 {
  margin: 0;
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.8rem;
}

.controls button {
  margin-left: 10px;
  padding: 10px 18px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls button:hover {
  background-color: #3a7bc8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.controls button:disabled {
  background-color: #d1d5db;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.simulation-content {
  display: flex;
  height: 600px;
  gap: 20px;
  margin-bottom: 20px;
}

.simulation-area {
  flex: 3;
  position: relative;
  border-radius: 8px;
  background-color: #ffffff;
  overflow: hidden;
  height: 100%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.side-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 300px;
}

.minimap-section, .chat-section {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.minimap-section h3, .chat-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.2rem;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.minimap-container {
  position: relative;
  border-radius: 6px;
  background-color: #f1f3f5;
  height: 150px;
  overflow: hidden;
}

.chat-container {
  height: 300px;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  scrollbar-width: thin;
}

.chat-message {
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 6px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.chat-message.selected {
  border-left: 3px solid #4a90e2;
}

.chat-message.system-message {
  background-color: #f1f3f5;
}

.chat-message.ai-message {
  background-color: #e8f4fd;
}

.chat-message.agent-message {
  background-color: #f0f7ff;
}

.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-size: 0.85rem;
}

.message-time {
  color: #6c757d;
  margin-right: 8px;
}

.message-sender {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.system-sender {
  background-color: #e9ecef;
  color: #495057;
}

.ai-sender {
  background-color: #cfe2ff;
  color: #0a58ca;
}

.agent-sender {
  background-color: #d1e7dd;
  color: #0f5132;
}

.message-content {
  line-height: 1.4;
  word-break: break-word;
}

.agent {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.agent:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.agent.selected {
  box-shadow: 0 0 0 3px #fff, 0 0 0 6px rgba(74, 144, 226, 0.5);
}

.agent-label {
  font-size: 0.8rem;
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  color: #333;
  white-space: nowrap;
}

.agent-status {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.agent-status.thinking {
  background-color: #cff4fc;
  color: #055160;
}

.agent-status.moving {
  background-color: #fff3cd;
  color: #664d03;
}

.agent-status.communicating {
  background-color: #d1e7dd;
  color: #0f5132;
}

.agent.blue {
  background: linear-gradient(135deg, #4a90e2, #3a7bc8);
}

.agent.red {
  background: linear-gradient(135deg, #e25555, #c62828);
}

.minimap-agent {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.minimap-agent.selected {
  transform: scale(1.5);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

.minimap-agent.blue {
  background-color: #4a90e2;
}

.minimap-agent.red {
  background-color: #e25555;
}

.agent-details {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.agent-header h3 {
  margin: 0;
  font-weight: 600;
  color: #2c3e50;
}

.agent-status-badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.agent-status-badge.idle {
  background-color: #e9ecef;
  color: #495057;
}

.agent-status-badge.thinking {
  background-color: #cff4fc;
  color: #055160;
}

.agent-status-badge.moving {
  background-color: #fff3cd;
  color: #664d03;
}

.agent-status-badge.communicating {
  background-color: #d1e7dd;
  color: #0f5132;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-label {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: 500;
}

.info-value {
  font-weight: 500;
}

.info-value.blue {
  color: #4a90e2;
}

.info-value.red {
  color: #e25555;
}

.agent-actions h4, .agent-communication h4 {
  margin-top: 0;
  margin-bottom: 12px;
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.action-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: center;
}

.movement-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.horizontal-controls {
  display: flex;
  justify-content: center;
  gap: 5px;
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background-color: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background-color: #e9ecef;
  color: #212529;
}

.control-btn.up, .control-btn.down {
  background-color: #e9ecef;
}

.control-btn.left, .control-btn.right {
  background-color: #e9ecef;
}

.ai-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.action-btn.primary {
  background-color: #4a90e2;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn.primary:hover {
  background-color: #3a7bc8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.action-btn.secondary {
  background-color: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.action-btn.secondary:hover {
  background-color: #e9ecef;
  color: #212529;
}

.action-btn:disabled {
  background-color: #d1d5db;
  color: #6c757d;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.message-log {
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  scrollbar-width: thin;
}

.message {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 6px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.message.system-message {
  background-color: #f1f3f5;
}

.message.ai-message {
  background-color: #e8f4fd;
}

.message.agent-message {
  background-color: #f0f7ff;
}

.no-messages {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.message-sender {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #ffffff;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.modal-content h3 {
  margin: 0;
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
  color: #2c3e50;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #495057;
}

.form-group select, .form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  background-color: #f8f9fa;
  transition: border-color 0.2s ease;
}

.form-group select:focus, .form-group textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.25);
}

.modal-footer {
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .simulation-content {
    flex-direction: column;
    height: auto;
  }
  
  .side-panel {
    flex-direction: row;
    max-width: none;
  }
  
  .minimap-section, .chat-section {
    flex: 1;
  }
  
  .simulation-area {
    height: 500px;
  }
}

@media (max-width: 768px) {
  .side-panel {
    flex-direction: column;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}

/* Thinking process styles */
.thinking-section {
  margin-bottom: 12px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #4a90e2;
}

.thinking-header {
  display: block;
  color: #4a90e2;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.thinking-step {
  margin-bottom: 6px;
  padding-left: 8px;
}

.decision-section {
  padding: 10px;
  background-color: #e8f4fd;
  border-radius: 6px;
  border-left: 3px solid #0a58ca;
}

.decision-header {
  color: #0a58ca;
  margin-right: 6px;
}

#google-map {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.map-type-control select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: white;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.map-style-btn {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: white;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.map-style-btn:hover {
  background-color: #f5f5f5;
}

.agent-info-window {
  padding: 5px;
  min-width: 150px;
}

.agent-info-window h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  color: #333;
}

.agent-info-window p {
  margin: 3px 0;
  font-size: 14px;
  color: #666;
}

.simulation-area {
  position: relative;
  overflow: hidden;
}

.simulation-area .agent {
  z-index: 10;
}
</style>