/// <reference path="../types/google-maps.d.ts" />
/// <reference types="@types/google.maps" />
/// <reference path="../types/missing-modules.d.ts" />
import * as THREE from 'three'
import type { Feature, Geometry } from 'geojson'

interface BuildingData {
  id: string
  geometry: THREE.BufferGeometry
  height: number
  type: string
  properties: any
  source?: string
}

interface RoadData {
  id: string
  path: THREE.Vector3[]
  width: number
  type: string
  source?: string
}

interface MapSource {
  name: string
  url: string
  type: 'osm' | 'geojson' | 'google' | 'custom'
  enabled: boolean
  apiKey?: string
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
  private googleMapsLoaded: boolean = false

  private sources: MapSource[] = [
    {
      name: 'OpenStreetMap',
      url: 'https://overpass-api.de/api/interpreter',
      type: 'osm',
      enabled: true
    },
    {
      name: 'NYC Open Data',
      url: 'https://data.cityofnewyork.us/api/geospatial/nqwf-w8eh',
      type: 'geojson',
      enabled: true
    },
    {
      name: 'Google Maps',
      url: 'https://maps.googleapis.com/maps/api/js',
      type: 'google',
      enabled: true,
      apiKey: '' // Will be set from environment variable
    }
  ]

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
      // Clear existing data
      this.buildings.clear()
      this.roads.clear()

      // Load data from all enabled sources
      await Promise.all(
        this.sources
          .filter(source => source.enabled)
          .map(source => this.loadFromSource(source, center, radius))
      )

      return {
        buildings: Array.from(this.buildings.values()),
        roads: Array.from(this.roads.values())
      }
    } catch (error) {
      console.error('Failed to load map data:', error)
      throw error
    }
  }

  private async loadFromSource(source: MapSource, center: [number, number], radius: number) {
    switch (source.type) {
      case 'osm':
        await this.loadFromOSM(source, center, radius)
        break
      case 'geojson':
        await this.loadFromGeoJSON(source, center, radius)
        break
      case 'google':
        await this.loadFromGoogleMaps(source, center, radius)
        break
      case 'custom':
        await this.loadFromCustomSource(source, center, radius)
        break
    }
  }

  private async loadFromOSM(source: MapSource, center: [number, number], radius: number) {
    // Fetch building data
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
    
    const buildingResponse = await fetch(source.url, {
      method: 'POST',
      body: buildingQuery
    })
    
    if (!buildingResponse.ok) {
      throw new Error(`Failed to fetch building data from ${source.name}`)
    }

    const buildingData = await buildingResponse.json()
    
    // Fetch road data
    const roadQuery = `
      [out:json];
      (
        way["highway"](around:${radius},${center[0]},${center[1]});
      );
      out body;
      >;
      out skel qt;
    `
    
    const roadResponse = await fetch(source.url, {
      method: 'POST',
      body: roadQuery
    })
    
    if (!roadResponse.ok) {
      throw new Error(`Failed to fetch road data from ${source.name}`)
    }

    const roadData = await roadResponse.json()

    // Process the data
    const nodes = new Map()
    buildingData.elements.concat(roadData.elements)
      .filter((element: any) => element.type === 'node')
      .forEach((node: any) => nodes.set(node.id, node))

    // Process buildings
    this.processBuildingData(buildingData, nodes, source.name)
    
    // Process roads
    this.processRoadData(roadData, nodes, source.name)
  }

  private async loadFromGeoJSON(source: MapSource, center: [number, number], radius: number) {
    try {
      const response = await fetch(source.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch GeoJSON data from ${source.name}`)
      }

      const data = await response.json()
      
      // Process GeoJSON features
      data.features.forEach((feature: Feature) => {
        if (feature.properties?.building) {
          this.processGeoJSONBuilding(feature, source.name)
        } else if (feature.properties?.highway) {
          this.processGeoJSONRoad(feature, source.name)
        }
      })
    } catch (error) {
      console.error(`Error loading data from ${source.name}:`, error)
    }
  }

  private async loadFromCustomSource(source: MapSource, center: [number, number], radius: number) {
    // Implement custom data source loading logic here
    console.log('Custom source loading not implemented:', source.name)
  }

  private async loadFromGoogleMaps(source: MapSource, center: [number, number], radius: number) {
    if (!source.apiKey) {
      console.error('Google Maps API key is required')
      return
    }

    try {
      await this.loadGoogleMapsScript(source.apiKey)

      // Create a Google Maps instance (hidden)
      const mapDiv = document.createElement('div')
      mapDiv.style.display = 'none'
      document.body.appendChild(mapDiv)

      const map = new google.maps.Map(mapDiv, {
        center: { lat: center[0], lng: center[1] },
        zoom: 16,
        mapTypeId: 'terrain'
      })

      // Get building footprints using Places API
      const service = new google.maps.places.PlacesService(map)
      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(center[0], center[1]),
        radius: radius,
        type: 'building'
      }

      const places = await new Promise((resolve, reject) => {
        service.nearbySearch(request, (results: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(results)
          } else {
            reject(new Error(`Places API error: ${status}`))
          }
        })
      })

      // Process building data
      for (const place of places as google.maps.places.PlaceResult[]) {
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          
          // Create a simple building geometry (since actual footprint is not available)
          const buildingSize = 20 // Default building size in meters
          const height = place.types?.includes('establishment') ? 30 : 15 // Approximate height based on type

          const geometry = new THREE.BoxGeometry(buildingSize, height, buildingSize)
          geometry.translate(0, height / 2, 0) // Move pivot to bottom center

          const buildingData: BuildingData = {
            id: `google_building_${place.place_id}`,
            geometry,
            height,
            type: place.types?.[0] || 'building',
            properties: place,
            source: 'google'
          }

          // Position the building
          const position = new THREE.Vector3(
            this.longitudeToX(lng),
            0,
            this.latitudeToZ(lat)
          )
          geometry.translate(position.x, 0, position.z)

          this.buildings.set(buildingData.id, buildingData)
        }
      }

      // Clean up
      document.body.removeChild(mapDiv)
    } catch (error) {
      console.error('Error loading Google Maps data:', error)
    }
  }

  private async loadGoogleMapsScript(apiKey: string): Promise<void> {
    if (this.googleMapsLoaded) return

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
      script.async = true
      script.defer = true
      script.onload = () => {
        this.googleMapsLoaded = true
        resolve()
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  private processBuildingData(data: any, nodes: Map<string, any>, sourceName: string) {
    data.elements
      .filter((element: any) => element.type === 'way' && element.tags?.building)
      .forEach((building: any) => {
        try {
          const height = building.tags.height 
            ? parseFloat(building.tags.height)
            : building.tags.levels 
              ? parseFloat(building.tags.levels) * 3
              : 10

          const coordinates = building.nodes
            .map((nodeId: any) => {
              const node = nodes.get(nodeId)
              if (!node) return null
              return new THREE.Vector2(
                this.longitudeToX(node.lon),
                this.latitudeToZ(node.lat)
              )
            })
            .filter((coord: any) => coord !== null)

          if (coordinates.length < 3) return

          const shape = new THREE.Shape(coordinates)
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: false
          })

          const buildingData: BuildingData = {
            id: `${sourceName}_building_${building.id}`,
            geometry,
            height,
            type: building.tags.building,
            properties: building.tags,
            source: sourceName
          }

          this.buildings.set(buildingData.id, buildingData)
        } catch (error) {
          console.error('Error processing building:', error)
        }
      })
  }

  private processRoadData(data: any, nodes: Map<string, any>, sourceName: string) {
    data.elements
      .filter((element: any) => element.type === 'way' && element.tags?.highway)
      .forEach((road: any) => {
        try {
          const path = road.nodes
            .map((nodeId: any) => {
              const node = nodes.get(nodeId)
              if (!node) return null
              return new THREE.Vector3(
                this.longitudeToX(node.lon),
                0,
                this.latitudeToZ(node.lat)
              )
            })
            .filter((point: any) => point !== null)

          if (path.length < 2) return

          const roadData: RoadData = {
            id: `${sourceName}_road_${road.id}`,
            path,
            width: this.getRoadWidth(road.tags.highway),
            type: road.tags.highway,
            source: sourceName
          }

          this.roads.set(roadData.id, roadData)
        } catch (error) {
          console.error('Error processing road:', error)
        }
      })
  }

  private processGeoJSONBuilding(feature: Feature, sourceName: string) {
    try {
      if (feature.geometry.type !== 'Polygon') return

      const coordinates = feature.geometry.coordinates[0]
        .map(([lon, lat]: [number, number]) => new THREE.Vector2(
          this.longitudeToX(lon),
          this.latitudeToZ(lat)
        ))

      if (coordinates.length < 3) return

      const height = feature.properties?.height || 10
      const shape = new THREE.Shape(coordinates)
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false
      })

      const buildingData: BuildingData = {
        id: `${sourceName}_building_${feature.id || Math.random().toString(36).substr(2, 9)}`,
        geometry,
        height,
        type: feature.properties?.building || 'building',
        properties: feature.properties,
        source: sourceName
      }

      this.buildings.set(buildingData.id, buildingData)
    } catch (error) {
      console.error('Error processing GeoJSON building:', error)
    }
  }

  private processGeoJSONRoad(feature: Feature, sourceName: string) {
    try {
      if (feature.geometry.type !== 'LineString') return

      const path = feature.geometry.coordinates
        .map(([lon, lat]: [number, number]) => new THREE.Vector3(
          this.longitudeToX(lon),
          0,
          this.latitudeToZ(lat)
        ))

      if (path.length < 2) return

      const roadData: RoadData = {
        id: `${sourceName}_road_${feature.id || Math.random().toString(36).substr(2, 9)}`,
        path,
        width: this.getRoadWidth(feature.properties?.highway || 'residential'),
        type: feature.properties?.highway || 'residential',
        source: sourceName
      }

      this.roads.set(roadData.id, roadData)
    } catch (error) {
      console.error('Error processing GeoJSON road:', error)
    }
  }

  private longitudeToX(longitude: number): number {
    return (longitude - this.bounds.west) * 111000
  }

  private latitudeToZ(latitude: number): number {
    return (latitude - this.bounds.south) * 111000
  }

  private getRoadWidth(type: string): number {
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

  addCustomSource(source: MapSource) {
    this.sources.push(source)
  }

  enableSource(sourceName: string) {
    const source = this.sources.find(s => s.name === sourceName)
    if (source) {
      source.enabled = true
    }
  }

  disableSource(sourceName: string) {
    const source = this.sources.find(s => s.name === sourceName)
    if (source) {
      source.enabled = false
    }
  }

  getSources() {
    return this.sources
  }

  getNavigationPath(start: [number, number], end: [number, number]) {
    // TODO: Implement A* pathfinding on the road network
    return []
  }

  getBuildingAt(position: [number, number]): BuildingData | null {
    // TODO: Implement spatial index for efficient building lookup
    return null
  }

  setGoogleMapsApiKey(apiKey: string) {
    const googleSource = this.sources.find(s => s.type === 'google')
    if (googleSource) {
      googleSource.apiKey = apiKey
    }
  }
} 