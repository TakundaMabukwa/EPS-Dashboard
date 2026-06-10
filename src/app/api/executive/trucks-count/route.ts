import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all active trips (not completed/delivered/cancelled)
    const { data: activeTrips, error } = await supabase
      .from('trips')
      .select('vehicleassignments')
      .not('status', 'in', '(completed,delivered,cancelled)')

    if (error) throw error

    // Extract unique vehicle names from active trips
    const activeVehicles = new Set<string>()
    activeTrips.forEach((trip: any) => {
      const assignments = trip.vehicleassignments
      if (!assignments) return
      const arr = Array.isArray(assignments) ? assignments : JSON.parse(assignments)
      arr.forEach((a: any) => {
        if (a?.vehicle?.name) activeVehicles.add(a.vehicle.name)
      })
    })

    // Get total vehicle count from vehicles table
    const { count: totalVehicles } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })

    const total = totalVehicles || 0
    const booked = activeVehicles.size
    const available = Math.max(0, total - booked)

    return NextResponse.json({ total, booked, available, unavailable: 0 })
  } catch (error) {
    console.error('Trucks count error:', error)
    return NextResponse.json({ total: 0, booked: 0, available: 0, unavailable: 0 }, { status: 500 })
  }
}
