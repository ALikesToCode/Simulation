import * as THREE from 'three'
import { createError } from 'h3'

interface BuildingData {
  id: string
  geometry: THREE.BufferGeometry
  height: number
  type: string
  properties: any
}

interface RoadData {
  id: string
  path: { x: number; y: number; z: number }[]
  width: number
  type: string
}

interface OSMNode {
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

interface OSMWay {
  id: number
  nodes: number[]
  tags?: Record<string, string>
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { center, radius } = body

    if (!center || !radius) {
      throw createError({
        statusCode: 400,
        message: 'Center coordinates and radius are required'
      })
    }

    // Fetch building data from OpenStreetMap
    const buildingQuery = `
      [out:json];
      (
        way["building"](around:${radius},${center[0]},${center[1]});
        relation["building"](around:${radius},${center[0]},${center[1]});
      );
      out body;
      >;
      out skel qt;
    `
    
    const buildingResponse = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: buildingQuery
    })
    
    if (!buildingResponse.ok) {
      throw createError({
        statusCode: buildingResponse.status,
        message: 'Failed to fetch building data from OpenStreetMap'
      })
    }

    const buildingData = await buildingResponse.json()
    
    // Fetch road network
    const roadQuery = `
      [out:json];
      (
        way["highway"](around:${radius},${center[0]},${center[1]});
      );
      out body;
      >;
      out skel qt;
    `
    
    const roadResponse = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: roadQuery
    })
    
    if (!roadResponse.ok) {
      throw createError({
        statusCode: roadResponse.status,
        message: 'Failed to fetch road data from OpenStreetMap'
      })
    }

    const roadData = await roadResponse.json()

    // Create a map of nodes for quick lookup
    const nodes = new Map<number, OSMNode>()
    buildingData.elements.forEach((element: any) => {
      if (element.type === 'node') {
        nodes.set(element.id, element)
      }
    })
    roadData.elements.forEach((element: any) => {
      if (element.type === 'node') {
        nodes.set(element.id, element)
      }
    })

    // Process building data
    const buildings = buildingData.elements
      .filter((element: any) => element.type === 'way' && element.tags?.building)
      .map((building: OSMWay) => {
        try {
          const height = building.tags?.height 
            ? parseFloat(building.tags.height)
            : building.tags?.levels 
              ? parseFloat(building.tags.levels) * 3
              : 10

          const coordinates = building.nodes
            .map(nodeId => {
              const node = nodes.get(nodeId)
              if (!node) return null
              return new THREE.Vector2(
                longitudeToX(node.lon),
                latitudeToZ(node.lat)
              )
            })
            .filter((coord): coord is THREE.Vector2 => coord !== null)

          if (coordinates.length < 3) return null

          const shape = new THREE.Shape(coordinates)
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: false
          })

          return {
            id: building.id.toString(),
            geometry,
            height,
            type: building.tags?.building || 'building',
            properties: building.tags || {}
          }
        } catch (error) {
          console.error('Error processing building:', error)
          return null
        }
      })
      .filter((building): building is BuildingData => building !== null)

    // Process road data
    const roads = roadData.elements
      .filter((element: any) => element.type === 'way' && element.tags?.highway)
      .map((road: OSMWay) => {
        try {
          const path = road.nodes
            .map(nodeId => {
              const node = nodes.get(nodeId)
              if (!node) return null
              return {
                x: longitudeToX(node.lon),
                y: 0,
                z: latitudeToZ(node.lat)
              }
            })
            .filter((coord): coord is { x: number; y: number; z: number } => coord !== null)

          if (path.length < 2) return null

          return {
            id: road.id.toString(),
            path,
            width: getRoadWidth(road.tags?.highway || 'residential'),
            type: road.tags?.highway || 'residential'
          }
        } catch (error) {
          console.error('Error processing road:', error)
          return null
        }
      })
      .filter((road): road is RoadData => road !== null)

    return {
      buildings,
      roads
    }
  } catch (error: any) {
    console.error('Failed to load city data:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to load city data'
    })
  }
})

// Helper functions
function longitudeToX(longitude: number): number {
  const bounds = {
    west: -74.2591,
    east: -73.7004
  }
  return (longitude - bounds.west) * 111000
}

function latitudeToZ(latitude: number): number {
  const bounds = {
    south: 40.4774,
    north: 40.9176
  }
  return (latitude - bounds.south) * 111000
}

function getRoadWidth(type: string): number {
  switch (type) {
    case 'motorway':
      return 16
    case 'trunk':
      return 14
    case 'primary':
      return 12
    case 'secondary':
      return 10
    case 'tertiary':
      return 8
    case 'residential':
      return 6
    default:
      return 4
  }
} 