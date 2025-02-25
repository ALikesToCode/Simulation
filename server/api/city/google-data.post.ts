import { Client } from '@googlemaps/google-maps-services-js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const body = await readBody(event)
    const { center, radius } = body

    if (!body || !center) {
      throw createError({
        status: 400,
        message: 'Center coordinates are required'
      })
    }

    const client = new Client({})
    
    // Get nearby places (buildings)
    const placesResponse = await client.placesNearby({
      params: {
        location: { lat: center.lat, lng: center.lng },
        radius: radius || 500, // Reduced radius to get fewer results
        key: config.googleMapsApiKey,
        type: 'establishment'
      }
    })

    // Process places without additional API calls to avoid rate limits
    const buildings = placesResponse.data.results.map((place, index) => {
      const location = place.geometry?.location || { lat: center.lat, lng: center.lng }
      
      // Convert lat/lng to x/z coordinates (simplified)
      const x = (location.lng - center.lng) * 111000 * Math.cos(center.lat * Math.PI / 180)
      const z = (location.lat - center.lat) * 111000
      
      // Generate random but consistent building dimensions
      const width = 20 + (index % 5) * 5
      const height = 30 + (index % 4) * 10 // Simplified height calculation
      const depth = 20 + (index % 3) * 8

      return {
        id: place.place_id || `building_${index}`,
        name: place.name,
        position: {
          x,
          y: 0,
          z
        },
        dimensions: {
          width,
          height,
          depth
        },
        type: place.types?.[0] || 'building',
        color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
      }
    })

    // If no buildings were found, generate some random ones
    if (buildings.length === 0) {
      console.log('No buildings found, generating random buildings')
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2
        const distance = 200 + Math.random() * 300
        const x = Math.cos(angle) * distance
        const z = Math.sin(angle) * distance
        
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
        })
      }
    }

    // Create some roads
    const roads = []
    const gridSize = 5
    const spacing = 100
    
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
    })
    
    roads.push({
      id: 'road_1',
      name: 'Cross Street',
      path: [
        { x: 0, y: 0, z: -gridSize * spacing },
        { x: 0, y: 0, z: gridSize * spacing }
      ],
      width: 10,
      type: 'road'
    })

    console.log(`Returning ${buildings.length} buildings and ${roads.length} roads`)
    
    return {
      buildings: buildings,
      roads: roads,
      pois: [],
      center: center
    }
  } catch (error: any) {
    console.error('Failed to load Google Places data:', error)
    throw createError({
      status: error.status || 500,
      message: error.message || 'Failed to load Google Places data'
    })
  }
}) 