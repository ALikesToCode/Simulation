/// <reference path="../../../types/missing-modules.d.ts" />
/// <reference path="../../../types/pathfinding.d.ts" />
import * as THREE from 'three'
import { Grid, AStarFinder } from 'pathfinding'
import { createError } from 'h3'
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
  grid: Grid
}

const worldSize = new THREE.Vector2(5000, 5000)
const gridSize = 5

// Initialize navigation grid
const navigationGrid = new Grid(
  Math.ceil(worldSize.x / gridSize),
  Math.ceil(worldSize.y / gridSize)
)

// Initialize pathfinder
const finder = new AStarFinder({
  allowDiagonal: true,
  dontCrossCorners: true
} as PF.FinderOptions)

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { position, type } = body

    if (!position) {
      throw createError({
        statusCode: 400,
        message: 'Position is required'
      })
    }

    // Convert position to grid coordinates
    const startX = Math.floor(position.x / gridSize)
    const startZ = Math.floor(position.z / gridSize)

    // Get random target position
    const walkableCells: [number, number][] = []
    for (let x = 0; x < navigationGrid.width; x++) {
      for (let z = 0; z < navigationGrid.height; z++) {
        if (navigationGrid.isWalkableAt(x, z)) {
          walkableCells.push([x, z])
        }
      }
    }

    // If no walkable cells found, create some default walkable areas
    if (walkableCells.length === 0) {
      const centerX = Math.floor(navigationGrid.width / 2)
      const centerZ = Math.floor(navigationGrid.height / 2)
      const radius = 50 // 50 cells radius around center

      for (let x = centerX - radius; x <= centerX + radius; x++) {
        for (let z = centerZ - radius; z <= centerZ + radius; z++) {
          if (x >= 0 && x < navigationGrid.width && z >= 0 && z < navigationGrid.height) {
            navigationGrid.setWalkableAt(x, z, true)
            walkableCells.push([x, z])
          }
        }
      }
    }

    const [targetX, targetZ] = walkableCells[
      Math.floor(Math.random() * walkableCells.length)
    ]

    // Create a clone of the grid for pathfinding
    const gridClone = navigationGrid.clone()

    // Find path using A*
    const gridPath = finder.findPath(
      startX,
      startZ,
      targetX,
      targetZ,
      gridClone
    )

    // Convert grid path back to world coordinates
    const path = gridPath.map(([x, z]) => ({
      x: x * gridSize + gridSize / 2,
      y: 0,
      z: z * gridSize + gridSize / 2
    }))

    return {
      target: {
        x: targetX * gridSize + gridSize / 2,
        y: 0,
        z: targetZ * gridSize + gridSize / 2
      },
      path
    }
  } catch (error: any) {
    console.error('Failed to calculate path:', error)
    throw createError({
      statusCode: error.status || 500,
      message: error.message || 'Failed to calculate path'
    })
  }
}) 