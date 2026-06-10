import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get active trips with vehicle assignments
    const { data: activeTrips, error } = await supabase
      .from('trips')
      .select('trip_id, status, origin, destination, vehicleassignments, actual_start_time, startdate')
      .not('status', 'in', '(completed,delivered,cancelled)')

    if (error) throw error

    // Extract unique vehicle plates from active trips
    const vehiclePlates = new Set<string>()
    const tripMap = new Map<string, any>()

    activeTrips.forEach((trip: any) => {
      const assignments = trip.vehicleassignments
      if (!assignments) return
      const arr = Array.isArray(assignments) ? assignments : JSON.parse(assignments)
      arr.forEach((a: any) => {
        const plate = a?.vehicle?.name
        if (plate) {
          vehiclePlates.add(plate)
          tripMap.set(plate, trip)
        }
      })
    })

    if (vehiclePlates.size === 0) {
      return NextResponse.json([])
    }

    // Fetch live telemetry from vehicle API
    const apiRes = await fetch('http://164.90.217.196:8800/api/vehicle/live/all', {
      headers: { Accept: 'application/json' },
    })

    if (!apiRes.ok) {
      // Return trips without telemetry
      const fallback = Array.from(vehiclePlates).map((plate) => {
        const trip = tripMap.get(plate)
        return {
          registration: plate,
          trip_id: trip?.trip_id,
          origin: trip?.origin,
          destination: trip?.destination,
          status: trip?.status,
          latitude: null,
          longitude: null,
          speed: null,
          odometer_km: null,
          gps_time: null,
        }
      })
      return NextResponse.json(fallback)
    }

    const apiJson = await apiRes.json()
    const liveVehicles: any[] = apiJson?.data || []

    // Build lookup by registration
    const liveMap = new Map<string, any>()
    liveVehicles.forEach((v) => {
      if (v.registration && !liveMap.has(v.registration)) {
        liveMap.set(v.registration, v)
      }
    })

    // Merge: only vehicles on active trips with live data
    const result = Array.from(vehiclePlates)
      .map((plate) => {
        const trip = tripMap.get(plate)
        const live = liveMap.get(plate)
        if (!live) return null

        return {
          registration: plate,
          trip_id: trip?.trip_id,
          origin: trip?.origin,
          destination: trip?.destination,
          status: trip?.status,
          latitude: live.latitude ? parseFloat(live.latitude) : null,
          longitude: live.longitude ? parseFloat(live.longitude) : null,
          speed: live.speed ? parseFloat(live.speed) : 0,
          odometer_km: live.odometer_km ? parseFloat(live.odometer_km) : null,
          driver_name: live.driver_name || null,
          gps_time: live.gps_time,
        }
      })
      .filter(Boolean)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Active trips live error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
