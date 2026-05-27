const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN || ''

/**
 * Geocode an address to get coordinates using Google Geocoding API
 */
export async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}&region=za`
    )

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      const { lat, lng } = result.geometry.location

      return {
        lat,
        lng,
        formatted_address: result.formatted_address,
        place_name: result.formatted_address,
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Geocode from form data (street, city, state, country)
 */
export async function geocodeFromFormData(formData) {
  const { street, city, state, country } = formData

  if (!street || !city || !state || !country) {
    return null
  }

  const address = `${street}, ${city}, ${state}, ${country}`
  return geocodeAddress(address)
}

/**
 * Reverse geocode coordinates to get address components using Google Geocoding API
 */
export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}&region=za`
    )

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      const components = result.address_components || []

      const street = components.find(c => c.types.includes('route'))?.long_name || ''
      const city = components.find(c => c.types.includes('locality'))?.long_name || ''
      const state = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || ''
      const country = components.find(c => c.types.includes('country'))?.long_name || ''

      return {
        street: result.geometry?.location_type === 'ROOFTOP' ? result.formatted_address : street,
        city,
        state,
        country,
        formatted_address: result.formatted_address,
      }
    }

    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Search for places/addresses with autocomplete using Mapbox Geocoding API
 */
export async function searchPlaces(query, limit = 5) {
  try {
    if (!query || query.length < 3) {
      return []
    }

    const encodedQuery = encodeURIComponent(query)
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&limit=${limit}&types=address,poi&country=za`
    )

    if (!response.ok) {
      throw new Error(`Place search failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.features || []
  } catch (error) {
    console.error('Place search error:', error)
    return []
  }
}
