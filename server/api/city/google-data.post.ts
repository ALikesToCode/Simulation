import { Client } from '@googlemaps/google-maps-services-js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const body = await readBody(event)
    const { center, radius } = body

    if (!body || !body.location) {
      throw createError({
        status: 400,
        message: 'Location is required'
      })
    }

    const client = new Client({})
    
    // Get nearby places (buildings)
    const placesResponse = await client.placesNearby({
      params: {
        location: { lat: center[0], lng: center[1] },
        radius,
        key: config.googleMapsApiKey,
        type: 'building'
      }
    })

    const buildings = await Promise.all(
      placesResponse.data.results.map(async place => {
        try {
          // Get place details for more information
          const details = await client.placeDetails({
            params: {
              place_id: place.place_id || '',
              key: config.googleMapsApiKey,
              fields: ['geometry', 'name', 'type', 'building_levels']
            }
          })

          return {
            id: place.place_id,
            width: 20, // Approximate building width
            height: ((details.data.result as any)?.building_levels || 3) * 3, // Approximate height based on levels
            depth: 20, // Approximate building depth
            type: place.types?.[0] || 'building',
            properties: {
              name: place.name,
              types: place.types,
              rating: place.rating
            },
            location: place.geometry?.location || { lat: 0, lng: 0 }
          }
        } catch (error) {
          console.error('Error fetching place details:', error)
          return null
        }
      })
    )

    // Get roads using Roads API
    const roadsResponse = await client.snapToRoads({
      params: {
        path: [
          { lat: center[0] - 0.01, lng: center[1] - 0.01 },
          { lat: center[0] + 0.01, lng: center[1] + 0.01 }
        ],
        key: config.googleMapsApiKey
      }
    })

    const roads = roadsResponse.data.snappedPoints.map((point, i, arr) => {
      if (i === 0) return null
      return {
        id: `road_${i}`,
        path: [
          { x: arr[i-1].location.longitude, y: 0, z: arr[i-1].location.latitude },
          { x: point.location.longitude, y: 0, z: point.location.latitude }
        ],
        width: 8,
        type: 'road'
      }
    }).filter(Boolean)

    return {
      buildings: buildings.filter(Boolean),
      roads
    }
  } catch (error: any) {
    console.error('Failed to load Google Places data:', error)
    throw createError({
      status: error.status || 500,
      message: error.message || 'Failed to load Google Places data'
    })
  }
}) 