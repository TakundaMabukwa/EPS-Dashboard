import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('trips')
      .select('trip_id, status, origin, destination, current_latitude, current_longitude, current_speed, vehicleassignments')
      .not('status', 'in', '(completed,delivered,cancelled)')
      .not('current_latitude', 'is', null)
      .not('current_longitude', 'is', null)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Active trips error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
