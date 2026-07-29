import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_TOKEN || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN || ''

// Decode Google Maps encoded polyline
function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < encoded.length) {
    let b: number
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, waypoints } = await request.json()

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 })
    }

    if (!GOOGLE_KEY) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      key: GOOGLE_KEY,
      mode: 'driving',
    })

    if (waypoints && waypoints.length > 0) {
      params.set('waypoints', waypoints.map((w: { lat: number; lng: number }) => `${w.lat},${w.lng}`).join('|'))
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    console.log('Google Directions proxy request:', url.replace(GOOGLE_KEY, 'KEY_REDACTED'))

    const response = await fetch(url)
    const data = await response.json()

    console.log('Google Directions proxy response status:', data.status)

    if (data.status !== 'OK' || !data.routes?.[0]) {
      console.error('Google Directions error:', data)
      return NextResponse.json({
        error: `Directions API returned: ${data.status}`,
        error_message: data.error_message,
      }, { status: 400 })
    }

    const googleRoute = data.routes[0]

    // Sum distance and duration across all legs
    let totalDistanceM = 0
    let totalDurationS = 0
    for (const leg of googleRoute.legs || []) {
      totalDistanceM += leg.distance?.value || 0
      totalDurationS += leg.duration?.value || 0
    }

    // Decode overview polyline to GeoJSON coordinates
    const polyline = googleRoute.overview_polyline?.points || ''
    const coordinates = decodeGooglePolyline(polyline).map(([lat, lng]) => [lng, lat])

    const geometry = {
      type: 'LineString' as const,
      coordinates,
    }

    return NextResponse.json({
      distance: totalDistanceM,
      duration: totalDurationS,
      geometry,
      summary: googleRoute.summary || '',
      legs: googleRoute.legs?.map((leg: any) => ({
        distance: leg.distance,
        duration: leg.duration,
        start_address: leg.start_address,
        end_address: leg.end_address,
      })) || [],
    })
  } catch (error) {
    console.error('Directions proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
