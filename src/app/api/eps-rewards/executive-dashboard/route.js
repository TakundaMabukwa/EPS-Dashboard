import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const HTTP_SERVER_ENDPOINT = process.env.NEXT_PUBLIC_HTTP_SERVER_ENDPOINT || 'http://localhost:3002'
    const url = `${HTTP_SERVER_ENDPOINT}/api/eps-rewards/executive-dashboard`
    
    console.log('Fetching executive dashboard from:', url)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.error(`EPS API error: ${response.status}`)
      throw new Error(`EPS API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching executive dashboard data:', error.message)
    
    // Return empty data structure to prevent UI crashes
    return NextResponse.json(
      { 
        violations_summary: {
          speed_violations: 0,
          route_violations: 0,
          night_violations: 0,
          total_violations: 0
        },
        fleet_summary: {
          total_vehicles: 0,
          active_vehicles: 0,
          inactive_vehicles: 0
        },
        fuel_summary: {
          low_fuel_vehicles: 0
        },
        error: error.message
      },
      { status: 200 }
    )
  }
}