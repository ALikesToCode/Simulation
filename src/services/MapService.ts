import * as THREE from 'three'
import { Feature, Geometry } from 'geojson'

interface BuildingData {
  id: string
  geometry: THREE.BufferGeometry
  height: number
  type: string
  properties: any
}

interface RoadData {
  id: string
  path: THREE.Vector3[]
  width: number
  type: string
}

export class MapService {
  private buildings: Map<string, BuildingData> = new Map()
  private roads: Map<string, RoadData> = new Map()
  private bounds: {
    north: number
    south: number
    east: number
    west: number
  }

  constructor() {
    this.bounds = {
      north: 40.9176,
      south: 40.4774,
      east: -73.7004,
      west: -74.2591
    }
  }

  async loadMapData(center: [number, number], radius: number) {
    try {
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
      
      const buildingData = await buildingResponse.json()
      
      // Process building data
      this.processBuildingData(buildingData)
      
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
      
      const roadData = await roadResponse.json()
      
      // Process road data
      this.processRoadData(roadData)
      
      return {
        buildings: Array.from(this.buildings.values()),
        roads: Array.from(this.roads.values())
      }
    } catch (error) {
      console.error('Failed to load map data:', error)
      throw error
    }
  }

  private processBuildingData(data: any) {
    // Convert OSM building data to 3D geometries
    data.elements
      .filter((element: any) => element.tags && element.tags.building)
      .forEach((building: any) => {
        const height = building.tags.height 
          ? parseFloat(building.tags.height)
          : building.tags.levels 
            ? parseFloat(building.tags.levels) * 3
            : 10

        const coordinates = building.nodes.map((nodeId: string) => {
          const node = data.elements.find((el: any) => el.id === nodeId)
          return new THREE.Vector2(
            this.longitudeToX(node.lon),
            this.latitudeToZ(node.lat)
          )
        })

        const shape = new THREE.Shape(coordinates)
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: height,
          bevelEnabled: false
        })

        this.buildings.set(building.id.toString(), {
          id: building.id.toString(),
          geometry,
          height,
          type: building.tags.building,
          properties: building.tags
        })
      })
  }

  private processRoadData(data: any) {
    // Convert OSM road data to 3D paths
    data.elements
      .filter((element: any) => element.tags && element.tags.highway)
      .forEach((road: any) => {
        const path = road.nodes.map((nodeId: string) => {
          const node = data.elements.find((el: any) => el.id === nodeId)
          return new THREE.Vector3(
            this.longitudeToX(node.lon),
            0,
            this.latitudeToZ(node.lat)
          )
        })

        const width = this.getRoadWidth(road.tags.highway)

        this.roads.set(road.id.toString(), {
          id: road.id.toString(),
          path,
          width,
          type: road.tags.highway
        })
      })
  }

  private longitudeToX(longitude: number): number {
    return (longitude - this.bounds.west) * 111000
  }

  private latitudeToZ(latitude: number): number {
    return (latitude - this.bounds.south) * 111000
  }

  private getRoadWidth(type: string): number {
    // Return road width in meters based on type
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

  getNavigationPath(start: [number, number], end: [number, number]) {
    // TODO: Implement A* pathfinding on the road network
    return []
  }

  getBuildingAt(position: [number, number]): BuildingData | null {
    // TODO: Implement spatial index for efficient building lookup
    return null
  }
} 