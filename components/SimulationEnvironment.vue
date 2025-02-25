<template>
  <div class="simulation-container">
    <div ref="canvasContainer" class="canvas-container"></div>
    <div class="controls">
      <button @click="toggleSimulation" :class="{ active: isRunning }">
        {{ isRunning ? 'Pause' : 'Start' }}
      </button>
      <div class="stats">
        <div>Blue Agents Success: {{ stats.blueAgentsSuccess }}</div>
        <div>Red Agents Success: {{ stats.redAgentsSuccess }}</div>
        <div>Total Interactions: {{ stats.totalInteractions }}</div>
        <div>Average Trust: {{ stats.averageTrustScore.toFixed(2) }}</div>
      </div>
    </div>
    <div class="map-sources">
      <h3>Map Sources</h3>
      <div v-for="source in mapSources" :key="source.name" class="source-item">
        <label>
          <input
            type="checkbox"
            :checked="source.enabled"
            @change="toggleSource(source.name)"
          />
          {{ source.name }}
        </label>
      </div>
      <button @click="refreshMap" class="refresh-button">
        Refresh Map Data
      </button>
      <div class="map-toggle">
        <button @click="toggleGoogleMaps3D" :class="{ active: useGoogleMaps3D }">
          {{ useGoogleMaps3D ? 'Use Custom 3D' : 'Use Google Maps 3D' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulationStore } from '~/stores/simulation'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { MapService } from '~/services/MapService'
import { useRuntimeConfig } from '#app'

// Declare global variables for TypeScript
declare global {
  interface Window {
    initGoogleMap3D: () => void;
    googleMap3D: google.maps.Map | null;
    googleMapAgentMarkers: google.maps.marker.AdvancedMarkerElement[];
    googleMapUpdateInterval: number | NodeJS.Timeout | null;
  }
}

const canvasContainer = ref<HTMLDivElement>()
const simulationStore = useSimulationStore()
const { agents, isRunning, cityData, stats } = storeToRefs(simulationStore)
const mapService = new MapService()
const mapSources = ref(mapService.getSources())
const config = useRuntimeConfig()
const useGoogleMaps3D = ref(false)
const googleMapsIframe = ref<HTMLIFrameElement | null>(null)

// Define events
const emit = defineEmits<{
  (e: 'simulation-click', position: THREE.Vector3): void
}>()

// Initialize Google Maps API key
if (config.public.googleMapsApiKey) {
  mapService.setGoogleMapsApiKey(config.public.googleMapsApiKey)
}

// Three.js setup
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let raycaster: THREE.Raycaster
let mouse: THREE.Vector2
let agentMeshes: Map<string, THREE.Group> = new Map()
let buildingMeshes: THREE.Mesh[] = []
let roadLines: THREE.Object3D[] = []
let selectedAgentMesh: THREE.Group | null = null

// Animation variables
let animationFrameId: number
let lastUpdateTime = 0
const updateInterval = 50 // ms between agent updates

const initThree = () => {
  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  )
  camera.position.set(1000, 1000, 1000)
  camera.lookAt(0, 0, 0)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  canvasContainer.value?.appendChild(renderer.domElement)

  // Controls setup
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxPolarAngle = Math.PI / 2 - 0.1 // Prevent camera from going below ground
  controls.minDistance = 100
  controls.maxDistance = 5000

  // Raycaster for mouse interaction
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(500, 1000, 500)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 100
  directionalLight.shadow.camera.far = 3000
  directionalLight.shadow.camera.left = -1000
  directionalLight.shadow.camera.right = 1000
  directionalLight.shadow.camera.top = 1000
  directionalLight.shadow.camera.bottom = -1000
  scene.add(directionalLight)

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(5000, 5000)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.2
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Grid helper
  const grid = new THREE.GridHelper(5000, 50, 0x666666, 0x444444)
  scene.add(grid)

  // Handle window resize
  window.addEventListener('resize', onWindowResize)
  
  // Handle mouse click
  renderer.domElement.addEventListener('click', onMouseClick)
  
  // Start animation loop
  requestAnimationFrame(animate)
}

const onWindowResize = () => {
  if (!canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

const onMouseClick = (event: MouseEvent) => {
  if (!canvasContainer.value) return
  
  // Calculate mouse position in normalized device coordinates
  const rect = canvasContainer.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera)
  
  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true)
  
  if (intersects.length > 0) {
    // Check if we clicked on an agent
    let clickedAgent = false
    for (const [id, mesh] of agentMeshes) {
      if (intersects.some(i => i.object.parent === mesh)) {
        // Select this agent
        selectAgent(id)
        clickedAgent = true
        break
      }
    }
    
    // If we didn't click on an agent, emit the click position
    if (!clickedAgent) {
      const intersect = intersects[0]
      emit('simulation-click', intersect.point)
    }
  }
}

const selectAgent = (agentId: string) => {
  // Reset previous selection
  if (selectedAgentMesh) {
    const outlineMesh = selectedAgentMesh.getObjectByName('outline')
    if (outlineMesh) {
      outlineMesh.visible = false
    }
  }
  
  // Set new selection
  const mesh = agentMeshes.get(agentId)
  if (mesh) {
    selectedAgentMesh = mesh
    const outlineMesh = mesh.getObjectByName('outline')
    if (outlineMesh) {
      outlineMesh.visible = true
    }
  }
}

const createAgentMesh = (agent: any) => {
  // Create a group to hold the agent and its outline
  const group = new THREE.Group()
  
  // Create agent body
  const geometry = new THREE.SphereGeometry(10, 32, 32)
  const material = new THREE.MeshStandardMaterial({
    color: agent.type === 'blue' ? 0x4444ff : 0xff4444,
    roughness: 0.7,
    metalness: 0.3
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  
  // Create agent outline for selection
  const outlineGeometry = new THREE.SphereGeometry(12, 32, 32)
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    side: THREE.BackSide
  })
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
  outline.name = 'outline'
  outline.visible = false
  group.add(outline)
  
  // Create highlight effect for highlighted agents
  const highlightGeometry = new THREE.SphereGeometry(15, 32, 32)
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide
  })
  const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial)
  highlight.name = 'highlight'
  highlight.visible = agent.state.isHighlighted
  group.add(highlight)
  
  // Create direction indicator
  const directionGeometry = new THREE.ConeGeometry(5, 15, 8)
  const directionMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.3
  })
  const directionIndicator = new THREE.Mesh(directionGeometry, directionMaterial)
  directionIndicator.position.set(0, 0, -15)
  directionIndicator.rotation.x = Math.PI / 2
  directionIndicator.name = 'direction'
  group.add(directionIndicator)
  
  // Create label
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = 'rgba(0, 0, 0, 0.7)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.font = '24px Arial'
    context.fillStyle = 'white'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(agent.id, canvas.width / 2, canvas.height / 2)
  }
  
  const labelTexture = new THREE.CanvasTexture(canvas)
  const labelMaterial = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true
  })
  const label = new THREE.Sprite(labelMaterial)
  label.position.set(0, 30, 0)
  label.scale.set(100, 50, 1)
  label.name = 'label'
  group.add(label)
  
  // Create path visualization if needed
  if (agent.state.path && agent.state.path.length > 0 && agent.state.pathVisible) {
    createAgentPathVisualization(agent, group)
  }
  
  // Set position
  group.position.copy(agent.position)
  
  // Add to scene
  scene.add(group)
  agentMeshes.set(agent.id, group)
  
  return group
}

// Create a visualization of the agent's path
const createAgentPathVisualization = (agent: any, group: THREE.Group) => {
  // Remove any existing path visualization
  const existingPath = group.getObjectByName('path')
  if (existingPath) {
    group.remove(existingPath)
  }
  
  if (!agent.state.path || agent.state.path.length === 0 || !agent.state.pathVisible) {
    return
  }
  
  // Create a line for the path
  const points = [
    new THREE.Vector3(0, 0, 0), // Start at agent's position (origin of the group)
    ...agent.state.path.map((p: THREE.Vector3) => {
      // Convert to local coordinates relative to the agent
      return new THREE.Vector3(
        p.x - agent.position.x,
        p.y - agent.position.y,
        p.z - agent.position.z
      )
    })
  ]
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ 
    color: agent.type === 'blue' ? 0x4444ff : 0xff4444,
    linewidth: 2,
    opacity: 0.7,
    transparent: true
  })
  
  const line = new THREE.Line(geometry, material)
  line.name = 'path'
  group.add(line)
  
  // Add markers for each path point
  for (let i = 1; i < points.length; i++) {
    const markerGeometry = new THREE.SphereGeometry(2, 8, 8)
    const markerMaterial = new THREE.MeshBasicMaterial({ 
      color: agent.type === 'blue' ? 0x4444ff : 0xff4444,
      opacity: 0.7,
      transparent: true
    })
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    marker.position.copy(points[i])
    marker.name = `pathMarker_${i}`
    line.add(marker)
    
    // Highlight current target point
    if (i === agent.state.pathIndex) {
      const targetMarkerGeometry = new THREE.SphereGeometry(4, 16, 16)
      const targetMarkerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        opacity: 0.9,
        transparent: true
      })
      const targetMarker = new THREE.Mesh(targetMarkerGeometry, targetMarkerMaterial)
      targetMarker.position.copy(points[i])
      targetMarker.name = 'currentTarget'
      line.add(targetMarker)
    }
  }
}

const updateAgentMeshes = () => {
  // Remove old meshes
  const currentIds = new Set(agents.value.map(a => a.id))
  for (const [id, mesh] of agentMeshes) {
    if (!currentIds.has(id)) {
      scene.remove(mesh)
      agentMeshes.delete(id)
    }
  }
  
  // Update or create meshes for current agents
  agents.value.forEach(agent => {
    let mesh = agentMeshes.get(agent.id)
    
    if (!mesh) {
      // Create new mesh
      mesh = createAgentMesh(agent)
    } else {
      // Update existing mesh
      mesh.position.copy(agent.position)
      
      // Update direction indicator
      if (agent.target && agent.position.distanceTo(agent.target) > 0.1) {
        const direction = new THREE.Vector3().subVectors(agent.target, agent.position).normalize()
        const directionIndicator = mesh.getObjectByName('direction') as THREE.Mesh
        if (directionIndicator) {
          directionIndicator.lookAt(direction)
        }
      }
      
      // Update highlight visibility
      const highlight = mesh.getObjectByName('highlight') as THREE.Mesh
      if (highlight) {
        highlight.visible = agent.state.isHighlighted
      }
      
      // Update path visualization
      if (agent.state.pathVisible) {
        createAgentPathVisualization(agent, mesh)
      } else {
        const existingPath = mesh.getObjectByName('path')
        if (existingPath) {
          mesh.remove(existingPath)
        }
      }
    }
  })
}

const updateCityMeshes = () => {
  // Clear old meshes
  buildingMeshes.forEach(mesh => scene.remove(mesh))
  roadLines.forEach(line => scene.remove(line))
  buildingMeshes = []
  roadLines = []

  // Early return if cityData is not yet loaded
  if (!cityData.value?.buildings || !cityData.value?.roads) return

  // Create building meshes
  createBuildingMeshes()

  // Create road lines
  for (const road of cityData.value.roads) {
    try {
      const geometry = new THREE.BufferGeometry()
      const positions = road.path.flatMap(v => [v.x, v.y || 0, v.z])
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      )

      // Create road surface
      const roadShape = new THREE.Shape()
      const points = road.path.map(p => new THREE.Vector2(p.x, p.z))
      if (points.length < 2) continue

      roadShape.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        roadShape.lineTo(points[i].x, points[i].y)
      }

      const roadGeometry = new THREE.ExtrudeGeometry(roadShape, {
        depth: 0.2,
        bevelEnabled: false
      })

      const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
      })

      const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial)
      roadMesh.rotation.x = Math.PI / 2
      roadMesh.receiveShadow = true
      scene.add(roadMesh)
      roadLines.push(roadMesh)
    } catch (error) {
      console.error('Error creating road mesh:', error)
    }
  }

  // Center camera on the map
  if (buildingMeshes.length > 0) {
    const box = new THREE.Box3()
    for (const mesh of buildingMeshes) {
      box.expandByObject(mesh)
    }
    const center = new THREE.Vector3()
    box.getCenter(center)
    controls.target.copy(center)
    camera.position.set(center.x + 1000, 1000, center.z + 1000)
    camera.lookAt(center)
  }
}

const createBuildingMeshes = () => {
  if (!scene || !cityData.value || !cityData.value.buildings || useGoogleMaps3D.value) return
  
  // Clear existing building meshes
  buildingMeshes.forEach(mesh => {
    scene.remove(mesh)
  })
  buildingMeshes = []
  
  // Create new building meshes
  cityData.value.buildings.forEach(building => {
    const material = new THREE.MeshStandardMaterial({
      color: building.color || new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.5, 0.5),
      roughness: 0.7,
      metalness: 0.3
    })

    const geometry = new THREE.BoxGeometry(
      building.dimensions.width,
      building.dimensions.height,
      building.dimensions.depth
    )

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    // Position the mesh
    mesh.position.set(
      building.position.x,
      building.position.y + building.dimensions.height / 2, // Center vertically
      building.position.z
    )
    
    // Store building ID in user data for raycasting
    mesh.userData.buildingId = building.id
    
    scene.add(mesh)
    buildingMeshes.push(mesh)
  })
}

const animate = (timestamp: number) => {
  animationFrameId = requestAnimationFrame(animate)
  
  // Update controls
  controls.update()
  
  // Only update agent positions at specified intervals
  if (timestamp - lastUpdateTime > updateInterval) {
    lastUpdateTime = timestamp
    
    // Update agent meshes if needed
    if (isRunning.value && !useGoogleMaps3D.value) {
      updateAgentMeshes()
    }
  }
  
  // Render scene
  renderer.render(scene, camera)
}

const toggleSimulation = () => {
  if (isRunning.value) {
    simulationStore.pauseSimulation()
  } else {
    simulationStore.startSimulation()
  }
}

const toggleSource = (sourceName: string) => {
  mapService.toggleSource(sourceName)
  mapSources.value = mapService.getSources()
}

const refreshMap = async () => {
  console.log('Refreshing map data...');
  try {
    await simulationStore.initializeSimulation();
    console.log('Map data refreshed:', cityData.value);
    updateCityMeshes();
  } catch (error) {
    console.error('Error refreshing map data:', error);
  }
}

// Focus camera on a specific position
const focusOnPosition = (position: THREE.Vector3) => {
  const targetPosition = new THREE.Vector3().copy(position)
  
  // Animate camera movement
  const startPosition = new THREE.Vector3().copy(camera.position)
  const startTarget = new THREE.Vector3()
  controls.target.copy(startTarget)
  
  const duration = 1000 // ms
  const startTime = Date.now()
  
  const animateCameraMove = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Ease function (ease-out cubic)
    const ease = 1 - Math.pow(1 - progress, 3)
    
    // Calculate new camera position (maintain height but move above target)
    const height = camera.position.y
    const newPosition = new THREE.Vector3(
      targetPosition.x + 200,
      height,
      targetPosition.z + 200
    )
    
    // Interpolate camera position
    camera.position.lerpVectors(startPosition, newPosition, ease)
    
    // Interpolate camera target
    const newTarget = new THREE.Vector3().copy(targetPosition)
    controls.target.lerpVectors(startTarget, newTarget, ease)
    controls.update()
    
    if (progress < 1) {
      requestAnimationFrame(animateCameraMove)
    }
  }
  
  animateCameraMove()
}

// Focus on a specific agent
const focusOnAgent = (agentId: string) => {
  const agent = agents.value.find(a => a.id === agentId)
  if (agent) {
    focusOnPosition(agent.position)
  }
}

// Toggle between custom 3D objects and Google Maps 3D objects
const toggleGoogleMaps3D = () => {
  useGoogleMaps3D.value = !useGoogleMaps3D.value
  
  if (useGoogleMaps3D.value) {
    loadGoogleMaps3D()
  } else {
    removeGoogleMaps3D()
    createBuildingMeshes() // Restore custom 3D objects
  }
}

// Load Google Maps 3D view
const loadGoogleMaps3D = () => {
  if (!canvasContainer.value) return
  
  // Remove existing building meshes
  buildingMeshes.forEach(mesh => {
    scene.remove(mesh)
  })
  buildingMeshes = []
  
  // Create a div to contain the map
  const mapDiv = document.createElement('div')
  mapDiv.style.width = '100%'
  mapDiv.style.height = '100%'
  mapDiv.style.position = 'absolute'
  mapDiv.style.top = '0'
  mapDiv.style.left = '0'
  mapDiv.style.zIndex = '1'
  
  canvasContainer.value.appendChild(mapDiv)
  
  // Initialize Google Maps
  const initGoogleMap = () => {
    if (typeof google === 'undefined') {
      // Load Google Maps API if not already loaded
      const script = document.createElement('script')
      const apiKey = config.public.googleMapsApiKey
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,visualization&v=beta&loading=async&callback=initGoogleMap3D`
      script.defer = true
      document.head.appendChild(script)
      
      // Define global callback
      window.initGoogleMap3D = () => {
        createGoogleMap(mapDiv)
      }
    } else {
      createGoogleMap(mapDiv)
    }
  }
  
  initGoogleMap()
  
  // Hide the Three.js canvas but keep it active for agent updates
  if (renderer) {
    renderer.domElement.style.opacity = '0.1'
    renderer.domElement.style.pointerEvents = 'none'
  }
}

// Create the actual Google Map
const createGoogleMap = (container: HTMLElement) => {
  const mapOptions: google.maps.MapOptions = {
    center: { lat: config.public.simulationSettings.cityCenterLat, lng: config.public.simulationSettings.cityCenterLng },
    zoom: 18,
    mapId: '6ff586e93e18149e', // Photorealistic map ID
    tilt: 45,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true
  };
  
  // Create the map
  const googleMap = new google.maps.Map(container, mapOptions);
  
  // Store the map reference for later use
  window.googleMap3D = googleMap;
  
  // Add agent markers to the map
  addAgentMarkersToGoogleMap(googleMap);
  
  // Set up a listener to update agent positions
  const updateInterval = setInterval(() => {
    updateAgentMarkersOnGoogleMap(googleMap);
  }, 100);
  
  // Store the interval ID for cleanup
  window.googleMapUpdateInterval = updateInterval;
}

// Add agent markers to Google Maps
const addAgentMarkersToGoogleMap = (map: google.maps.Map) => {
  if (!map) return
  
  // Clear existing markers
  if (window.googleMapAgentMarkers) {
    for (const marker of window.googleMapAgentMarkers) {
      marker.map = null;
    }
  }
  
  // Initialize markers array
  window.googleMapAgentMarkers = [];
  
  // Add a marker for each agent
  for (const agent of agents.value) {
    // Convert agent position to lat/lng
    const centerLat = config.public.simulationSettings.cityCenterLat;
    const centerLng = config.public.simulationSettings.cityCenterLng;
    
    // Convert from world units to lat/lng (approximate conversion)
    const lat = centerLat + (agent.position.z / 111000);
    const lng = centerLng + (agent.position.x / (111000 * Math.cos(centerLat * Math.PI / 180)));
    
    // Create marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'agent-marker';
    markerElement.style.width = '16px';
    markerElement.style.height = '16px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = agent.type === 'blue' ? '#4444ff' : '#ff4444';
    markerElement.style.border = '2px solid white';
    markerElement.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
    
    // Add label
    const label = document.createElement('div');
    label.className = 'agent-label';
    label.textContent = agent.id.split('_')[1] || '';
    label.style.color = 'white';
    label.style.fontSize = '10px';
    label.style.fontWeight = 'bold';
    label.style.textAlign = 'center';
    label.style.marginTop = '-18px';
    label.style.textShadow = '0 0 2px black';
    markerElement.appendChild(label);
    
    // Create advanced marker
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat, lng },
      map: map,
      title: agent.id,
      content: markerElement
    });
    
    window.googleMapAgentMarkers.push(marker);
  }
}

// Update agent marker positions on Google Maps
const updateAgentMarkersOnGoogleMap = (map: google.maps.Map) => {
  if (!map || !window.googleMapAgentMarkers) return;
  
  // Update each marker position
  for (let i = 0; i < agents.value.length && i < window.googleMapAgentMarkers.length; i++) {
    const agent = agents.value[i];
    const marker = window.googleMapAgentMarkers[i];
    
    // Convert agent position to lat/lng
    const centerLat = config.public.simulationSettings.cityCenterLat;
    const centerLng = config.public.simulationSettings.cityCenterLng;
    
    // Convert from world units to lat/lng (approximate conversion)
    const lat = centerLat + (agent.position.z / 111000);
    const lng = centerLng + (agent.position.x / (111000 * Math.cos(centerLat * Math.PI / 180)));
    
    // Update marker position
    marker.position = { lat, lng };
  }
}

// Remove Google Maps 3D view
const removeGoogleMaps3D = () => {
  // Clear update interval
  if (window.googleMapUpdateInterval) {
    clearInterval(window.googleMapUpdateInterval)
    window.googleMapUpdateInterval = null
  }
  
  // Remove agent markers
  if (window.googleMapAgentMarkers) {
    for (const marker of window.googleMapAgentMarkers) {
      marker.map = null;
    }
    window.googleMapAgentMarkers = []
  }
  
  // Remove the map
  if (window.googleMap3D) {
    window.googleMap3D = null
  }
  
  // Remove the iframe or div
  if (googleMapsIframe.value) {
    googleMapsIframe.value.style.display = 'none'
  }
  
  // Show the Three.js canvas
  if (renderer) {
    renderer.domElement.style.opacity = '1'
    renderer.domElement.style.pointerEvents = 'auto'
  }
}

// Watch for changes in city data
watch(() => cityData.value, (newCityData) => {
  console.log('City data updated:', newCityData);
  if (!newCityData || !newCityData.buildings || newCityData.buildings.length === 0) {
    console.warn('No buildings found in city data. Attempting to refresh map data.');
    // You might want to automatically refresh the map data here
    // or display a warning to the user
  }
  updateCityMeshes();
}, { deep: true });

// Watch for changes in agents
watch(() => agents.value, () => {
  updateAgentMeshes()
}, { deep: true })

onMounted(async () => {
  initThree()
  
  // Initialize the simulation if not already initialized
  if (!cityData.value || !cityData.value.buildings || cityData.value.buildings.length === 0) {
    await simulationStore.initializeSimulation()
  }
  
  updateCityMeshes()
  updateAgentMeshes()
})

onBeforeUnmount(() => {
  // Clean up
  cancelAnimationFrame(animationFrameId)
  
  if (renderer) {
    renderer.domElement.removeEventListener('click', onMouseClick)
    renderer.dispose()
  }
  
  window.removeEventListener('resize', onWindowResize)
  
  // Clean up meshes
  for (const mesh of buildingMeshes) {
    scene.remove(mesh)
  }
  
  for (const line of roadLines) {
    scene.remove(line)
  }
  
  for (const mesh of agentMeshes.values()) {
    scene.remove(mesh)
  }
  
  agentMeshes.clear()
  
  // Clean up Google Maps
  if (window.googleMapUpdateInterval) {
    clearInterval(window.googleMapUpdateInterval)
    window.googleMapUpdateInterval = null
  }
  
  if (window.googleMapAgentMarkers) {
    for (const marker of window.googleMapAgentMarkers) {
      marker.map = null;
    }
    window.googleMapAgentMarkers = []
  }
  
  if (googleMapsIframe.value && canvasContainer.value) {
    canvasContainer.value.removeChild(googleMapsIframe.value)
    googleMapsIframe.value = null
  }
})

// Expose methods to parent components
defineExpose({
  focusOnPosition,
  focusOnAgent
})
</script>

<style scoped>
.simulation-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  z-index: 1;
}

.controls button {
  background-color: #444;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.controls button:hover {
  background-color: #555;
}

.controls button.active {
  background-color: #007bff;
}

.stats {
  margin-top: 10px;
  font-size: 14px;
}

.map-sources {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  z-index: 1;
  max-height: 300px;
  overflow-y: auto;
}

.source-item {
  margin: 5px 0;
}

.refresh-button {
  margin-top: 10px;
  background-color: #444;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.refresh-button:hover {
  background-color: #555;
}

.map-toggle {
  margin-top: 10px;
}

.map-toggle button {
  width: 100%;
  background-color: #444;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  font-weight: bold;
}

.map-toggle button:hover {
  background-color: #555;
  transform: translateY(-1px);
}

.map-toggle button.active {
  background-color: #4285F4;
}

.map-toggle button.active:hover {
  background-color: #5294FF;
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .controls {
    top: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 5px;
  }
  
  .controls button {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .stats {
    width: 100%;
    font-size: 12px;
  }
  
  .map-sources {
    bottom: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    max-height: 150px;
  }
  
  .source-item {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .controls {
    padding: 8px;
  }
  
  .controls button {
    padding: 5px 8px;
    font-size: 11px;
  }
  
  .map-sources {
    max-height: 120px;
    padding: 8px;
  }
}
</style> 