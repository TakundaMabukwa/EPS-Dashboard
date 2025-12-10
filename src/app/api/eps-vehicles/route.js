import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')
  const plate = searchParams.get('plate')

  try {
    let url
    
    if (endpoint === 'by-plate' && plate) {
      // Try EPS API first
      url = `${process.env.NEXT_PUBLIC_VEHICLE_API_ENDPOINT}`
    } else if (endpoint === 'by-driver') {
      // Try EPS API first
      url = `${process.env.NEXT_PUBLIC_VEHICLE_API_ENDPOINT}`
    } else if (endpoint === 'ctrack') {
      // Use CTrack API
      url = `${process.env.NEXT_PUBLIC_CRTACK_VEHICLE_API_ENDPOINT}`
    } else if (endpoint === 'fuel-levels') {
      return NextResponse.json({
        fuel_readings: 1000,
        average_fuel_level: 100,
        low_fuel_vehicles: 4,
        vehicles: []
      })
    } else {
      url = `${process.env.NEXT_PUBLIC_VEHICLE_API_ENDPOINT}`
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`EPS API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Handle different API response formats
    if (endpoint === 'ctrack') {
      // CTrack API format
      const vehicle = data.vehicles?.find(v => 
        v.plate?.toLowerCase() === plate?.toLowerCase() ||
        v.driver_name?.toLowerCase().includes(searchParams.get('driver')?.toLowerCase())
      )
      return NextResponse.json(vehicle || { error: 'Vehicle not found' })
    } else {
      // EPS API format - find matching vehicle
      if (data.data && Array.isArray(data.data)) {
        const vehicle = data.data.find(v => 
          v.plate?.toLowerCase() === plate?.toLowerCase() ||
          v.driver_name?.toLowerCase().includes(searchParams.get('driver')?.toLowerCase())
        )
        return NextResponse.json(vehicle || { error: 'Vehicle not found' })
      }
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Error fetching EPS vehicles:', error)
    
    // Try fallback API if primary fails
    if (error.name === 'AbortError' || error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      try {
        console.log('Trying CTrack API as fallback...')
        const fallbackUrl = `${process.env.NEXT_PUBLIC_CRTACK_VEHICLE_API_ENDPOINT}`
        const fallbackResponse = await fetch(fallbackUrl, {
          signal: AbortSignal.timeout(3000)
        })
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          const vehicle = fallbackData.vehicles?.find(v => 
            v.plate?.toLowerCase() === plate?.toLowerCase() ||
            v.driver_name?.toLowerCase().includes(searchParams.get('driver')?.toLowerCase())
          )
          if (vehicle) {
            return NextResponse.json(vehicle)
          }
        }
      } catch (fallbackError) {
        console.log('Fallback API also failed')
      }
      
      return NextResponse.json({
        latitude: null,
        longitude: null,
        plate: plate || 'Unknown',
        speed: 0,
        address: 'GPS data unavailable',
        error: 'Connection timeout'
      })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch EPS vehicles' },
      { status: 500 }
    )
  }
}