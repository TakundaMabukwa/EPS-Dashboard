import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Count all trips
    const { count: total } = await supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })

    // Count trips with accepted_at (driver accepted)
    const { count: accepted } = await supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .not('accepted_at', 'is', null)

    const totalTrips = total || 0
    const acceptedTrips = accepted || 0
    const notAccepted = totalTrips - acceptedTrips
    const rate = totalTrips > 0 ? Math.round((acceptedTrips / totalTrips) * 100) : 0

    return NextResponse.json({ total: totalTrips, accepted: acceptedTrips, notAccepted, rate })
  } catch (error) {
    console.error('Acceptance rate error:', error)
    return NextResponse.json({ total: 0, accepted: 0, notAccepted: 0, rate: 0 }, { status: 500 })
  }
}
