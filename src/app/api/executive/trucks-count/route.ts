import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all non-SOLD vehicles with just id and vehicle_type
    const { data: allVehicles, error } = await supabase
      .from('vehiclesc')
      .select('id, vehicle_type')
      .not('branch_name', 'is', null)
      .neq('branch_name', 'SOLD')

    if (error) throw error

    // Filter out trailers (TR prefix) in JS
    const truckIds = (allVehicles || [])
      .filter(v => !v.vehicle_type?.startsWith('TR'))
      .map(v => v.id)

    const total = truckIds.length

    // Get active trips vehicle IDs
    const { data: activeTrips } = await supabase
      .from('trips')
      .select('vehicleassignments')
      .not('status', 'in', '(completed,delivered,cancelled)')

    const activeVehicleIds = new Set<number>()
    activeTrips?.forEach((trip: any) => {
      const arr = Array.isArray(trip.vehicleassignments) ? trip.vehicleassignments : []
      arr.forEach((a: any) => {
        const id = a?.vehicle?.id
        if (id) activeVehicleIds.add(Number(id))
      })
    })

    const booked = truckIds.filter(id => activeVehicleIds.has(id)).length
    const available = Math.max(0, total - booked)

    return NextResponse.json({ total, booked, available, unavailable: 0 })
  } catch (error) {
    console.error('Trucks count error:', error)
    return NextResponse.json({ total: 0, booked: 0, available: 0, unavailable: 0 }, { status: 500 })
  }
}
