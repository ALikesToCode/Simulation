import * as THREE from 'three'
import PF from 'pathfinding'

interface NavNode {
  id: string
  position: THREE.Vector3
  connections: string[]
  metadata: {
    type: string
    restrictions?: string[]
  }
}

interface NavGraph {
  nodes: Map<string, NavNode>
  grid: PF.Grid
}

export class NavigationService {
  private graph: NavGraph
  private finder: PF.AStarFinder
  private gridSize: number
  private worldSize: THREE.Vector2

  constructor(worldSize: THREE.Vector2, gridSize: number = 5) {
    this.worldSize = worldSize
    this.gridSize = gridSize
    this.graph = {
      nodes: new Map(),
      grid: new PF.Grid(
        Math.ceil(worldSize.x / gridSize),
        Math.ceil(worldSize.y / gridSize)
      )
    }
    this.finder = new PF.AStarFinder({
      allowDiagonal: true,
      dontCrossCorners: true
    })
  }

  buildNavigationMesh(roads: any[], buildings: any[]) {
    // Clear existing data
    this.graph.nodes.clear()
    this.graph.grid = new PF.Grid(
      Math.ceil(this.worldSize.x / this.gridSize),
      Math.ceil(this.worldSize.y / this.gridSize)
    )

    // Process roads to create navigation nodes
    roads.forEach(road => {
      const path = road.path
      for (let i = 0; i < path.length - 1; i++) {
        const startPos = path[i]
        const endPos = path[i + 1]
        
        // Create nodes for start and end points
        const startNode: NavNode = {
          id: `node_${startPos.x}_${startPos.z}`,
          position: startPos,
          connections: [],
          metadata: {
            type: road.type
          }
        }
        
        const endNode: NavNode = {
          id: `node_${endPos.x}_${endPos.z}`,
          position: endPos,
          connections: [],
          metadata: {
            type: road.type
          }
        }

        // Add nodes to graph
        this.graph.nodes.set(startNode.id, startNode)
        this.graph.nodes.set(endNode.id, endNode)

        // Connect nodes
        startNode.connections.push(endNode.id)
        endNode.connections.push(startNode.id)

        // Update grid
        const gridX1 = Math.floor(startPos.x / this.gridSize)
        const gridY1 = Math.floor(startPos.z / this.gridSize)
        const gridX2 = Math.floor(endPos.x / this.gridSize)
        const gridY2 = Math.floor(endPos.z / this.gridSize)

        // Mark road cells as walkable
        this.graph.grid.setWalkableAt(gridX1, gridY1, true)
        this.graph.grid.setWalkableAt(gridX2, gridY2, true)
      }
    })

    // Mark building areas as non-walkable
    buildings.forEach(building => {
      const bounds = new THREE.Box3().setFromObject(
        new THREE.Mesh(building.geometry)
      )
      
      const minX = Math.floor(bounds.min.x / this.gridSize)
      const maxX = Math.ceil(bounds.max.x / this.gridSize)
      const minZ = Math.floor(bounds.min.z / this.gridSize)
      const maxZ = Math.ceil(bounds.max.z / this.gridSize)

      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (
            x >= 0 && x < this.graph.grid.width &&
            z >= 0 && z < this.graph.grid.height
          ) {
            this.graph.grid.setWalkableAt(x, z, false)
          }
        }
      }
    })
  }

  findPath(
    start: THREE.Vector3,
    end: THREE.Vector3,
    agentType: 'blue' | 'red' = 'blue'
  ): THREE.Vector3[] {
    // Convert world positions to grid coordinates
    const startX = Math.floor(start.x / this.gridSize)
    const startZ = Math.floor(start.z / this.gridSize)
    const endX = Math.floor(end.x / this.gridSize)
    const endZ = Math.floor(end.z / this.gridSize)

    // Find path using A*
    const gridPath = this.finder.findPath(
      startX,
      startZ,
      endX,
      endZ,
      this.graph.grid.clone()
    )

    // Convert grid path back to world coordinates
    return gridPath.map(([x, z]) => new THREE.Vector3(
      x * this.gridSize + this.gridSize / 2,
      0,
      z * this.gridSize + this.gridSize / 2
    ))
  }

  getRandomNavigablePosition(): THREE.Vector3 {
    const walkableCells: [number, number][] = []
    
    // Collect all walkable cells
    for (let x = 0; x < this.graph.grid.width; x++) {
      for (let z = 0; z < this.graph.grid.height; z++) {
        if (this.graph.grid.isWalkableAt(x, z)) {
          walkableCells.push([x, z])
        }
      }
    }

    // Select random walkable cell
    const [x, z] = walkableCells[
      Math.floor(Math.random() * walkableCells.length)
    ]

    return new THREE.Vector3(
      x * this.gridSize + this.gridSize / 2,
      0,
      z * this.gridSize + this.gridSize / 2
    )
  }

  isPositionNavigable(position: THREE.Vector3): boolean {
    const gridX = Math.floor(position.x / this.gridSize)
    const gridZ = Math.floor(position.z / this.gridSize)

    return this.graph.grid.isWalkableAt(gridX, gridZ)
  }
} 