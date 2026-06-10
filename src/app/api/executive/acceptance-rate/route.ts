import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all trips with stops_data
    const { data: trips, error } = await supabase
      .from('trips')
      .select('stops_data')

    if (error) throw error

    let withData = 0
    let accepted = 0

    trips.forEach((trip: any) => {
      if (!trip.stops_data) return
      const arr = Array.isArray(trip.stops_data) ? trip.stops_data : JSON.parse(trip.stops_data)
      if (!Array.isArray(arr) || arr.length === 0) return

      withData += 1
      const hasAccepted = arr.some((s: any) => s.status === 'accepted')
      if (hasAccepted) accepted += 1
    })

    const rate = withData > 0 ? Math.round((accepted / withData) * 100) : 0

    return NextResponse.json({ total: withData, accepted, notAccepted: withData - accepted, rate })
  } catch (error) {
    console.error('Acceptance rate error:', error)
    return NextResponse.json({ total: 0, accepted: 0, notAccepted: 0, rate: 0 }, { status: 500 })
  }
}
