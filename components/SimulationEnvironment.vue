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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulationStore } from '~/stores/simulation'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const canvasContainer = ref<HTMLDivElement>()
const simulationStore = useSimulationStore()
const { agents, isRunning, cityData, stats } = storeToRefs(simulationStore)

// Three.js setup
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let agentMeshes: Map<string, THREE.Mesh> = new Map()
let buildingMeshes: THREE.Mesh[] = []
let roadLines: THREE.Line[] = []

// Animation
let animationFrameId: number

const initThree = () => {
  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(50, 50, 50)
  camera.lookAt(0, 0, 0)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  canvasContainer.value?.appendChild(renderer.domElement)

  // Controls setup
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(50, 50, 50)
  scene.add(directionalLight)

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(200, 200)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  // Grid helper
  const grid = new THREE.GridHelper(200, 20, 0x666666, 0x444444)
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
    const mesh = new THREE.Mesh(
      building.geometry,
      new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.8,
        metalness: 0.2
      })
    )
    scene.add(mesh)
    buildingMeshes.push(mesh)
  }

  // Create road lines
  for (const road of cityData.value.roads) {
    const geometry = new THREE.BufferGeometry()
    const positions = road.path.flatMap(v => [v.x, v.y || 0, v.z])
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    const material = new THREE.LineBasicMaterial({
      color: 0x444444,
      linewidth: road.width
    })
    const line = new THREE.Line(geometry, material)
    scene.add(line)
    roadLines.push(line)
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
</style> 