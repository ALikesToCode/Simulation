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

const canvasContainer = ref<HTMLDivElement>()
const simulationStore = useSimulationStore()
const { agents, isRunning, cityData, stats } = storeToRefs(simulationStore)
const mapService = new MapService()
const mapSources = ref(mapService.getSources())
const config = useRuntimeConfig()

// Initialize Google Maps API key
if (config.public.googleMapsApiKey) {
  mapService.setGoogleMapsApiKey(config.public.googleMapsApiKey)
}

// Three.js setup
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let agentMeshes: Map<string, THREE.Mesh> = new Map()
let buildingMeshes: THREE.Mesh[] = []
let roadLines: THREE.Object3D[] = []

// Animation
let animationFrameId: number

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
}

const onWindowResize = () => {
  if (!canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

const createAgentMesh = (agent: any) => {
  const geometry = new THREE.SphereGeometry(1, 32, 32)
  const material = new THREE.MeshStandardMaterial({
    color: agent.type === 'blue' ? 0x4444ff : 0xff4444,
    roughness: 0.7,
    metalness: 0.3
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(agent.position)
  scene.add(mesh)
  agentMeshes.set(agent.id, mesh)
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

  // Update or create new meshes
  for (const agent of agents.value) {
    let mesh = agentMeshes.get(agent.id)
    if (!mesh) {
      createAgentMesh(agent)
    } else {
      mesh.position.copy(agent.position)
    }
  }
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
  for (const building of cityData.value.buildings) {
    try {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.5, 0.5),
        roughness: 0.7,
        metalness: 0.3
      })

      const mesh = new THREE.Mesh(building.geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
      buildingMeshes.push(mesh)
    } catch (error) {
      console.error('Error creating building mesh:', error)
    }
  }

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
    buildingMeshes.forEach(mesh => box.expandByObject(mesh))
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2))
    camera.position.set(
      center.x + cameraDistance,
      cameraDistance,
      center.z + cameraDistance
    )
    camera.lookAt(center)
    controls.target.copy(center)
  }
}

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  if (isRunning.value) {
    simulationStore.updateAgents()
  }

  updateAgentMeshes()
  controls.update()
  renderer.render(scene, camera)
}

const toggleSimulation = () => {
  if (isRunning.value) {
    simulationStore.pauseSimulation()
  } else {
    simulationStore.startSimulation()
  }
}

const toggleSource = async (sourceName: string) => {
  const source = mapSources.value.find(s => s.name === sourceName)
  if (source) {
    source.enabled = !source.enabled
    if (source.enabled) {
      mapService.enableSource(sourceName)
    } else {
      mapService.disableSource(sourceName)
    }
    await refreshMap()
  }
}

const refreshMap = async () => {
  try {
    const config = useRuntimeConfig()
    const { cityCenterLat, cityCenterLng, radius } = config.public.simulationSettings
    await simulationStore.initializeSimulation()
    updateCityMeshes()
  } catch (error) {
    console.error('Failed to refresh map:', error)
  }
}

// Watch for cityData changes
watch(() => cityData.value, (newCityData) => {
  if (newCityData) {
    updateCityMeshes()
  }
}, { deep: true })

onMounted(async () => {
  initThree()
  
  // Initialize simulation
  try {
    await simulationStore.initializeSimulation()
    updateCityMeshes()
  } catch (error) {
    console.error('Failed to initialize simulation:', error)
  }

  // Animation loop
  animate()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onWindowResize)
  renderer.dispose()
})
</script>

<style scoped>
.simulation-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  color: white;
  font-family: monospace;
}

button {
  background: #444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 16px;
  width: 100%;
  transition: background-color 0.2s;
}

button:hover {
  background: #666;
}

button.active {
  background: #0a84ff;
}

.stats {
  font-size: 14px;
  line-height: 1.5;
}

.stats > div {
  margin-bottom: 8px;
}

.map-sources {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  color: white;
  font-family: monospace;
}

.source-item {
  margin: 8px 0;
}

.source-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.source-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.refresh-button {
  margin-top: 16px;
  background: #2196F3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s;
}

.refresh-button:hover {
  background: #1976D2;
}
</style> 