import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch('http://164.90.217.196:8800/api/vehicle/live', {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) throw new Error(`Live API error: ${res.status}`)

    const json = await res.json()
    const vehicles = json?.data || []

    const result = vehicles
      .filter((v: any) => v.latitude && v.longitude)
      .map((v: any) => ({
        registration: v.registration,
        trip_id: v.trip_id,
        destination: v.next_destination,
        latitude: parseFloat(v.latitude),
        longitude: parseFloat(v.longitude),
        speed: parseFloat(v.speed) || 0,
        driver_name: v.driver_name || null,
        gps_time: v.gps_time,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Live vehicles error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
