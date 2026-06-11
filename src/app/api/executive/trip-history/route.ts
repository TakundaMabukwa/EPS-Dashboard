import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data: history, error } = await supabase
      .from('trip_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const tripIds = [...new Set(history?.map(h => h.trip_id).filter(Boolean))]

    const { data: trips } = await supabase
      .from('trips')
      .select('id, trip_id, clientdetails, vehicleassignments, origin, destination')
      .in('id', tripIds)

    const tripLookup = new Map(trips?.map(t => [t.id, t]) || [])

    const enriched = history?.map(entry => {
      const trip = tripLookup.get(entry.trip_id)
      const clientDetails = trip?.clientdetails
      const clientName = typeof clientDetails === 'object' && clientDetails !== null
        ? clientDetails.name || 'Unknown'
        : typeof clientDetails === 'string' ? clientDetails : 'Unknown'

      // Get driver name from vehicleassignments
      const vehicleAssignments = trip?.vehicleassignments
      let driverName = 'Unassigned'
      if (Array.isArray(vehicleAssignments) && vehicleAssignments.length > 0) {
        const drivers = vehicleAssignments[0]?.drivers
        if (Array.isArray(drivers) && drivers.length > 0) {
          driverName = drivers[0]?.name || 'Unassigned'
        }
      }

      const changes: { field: string; label: string; from: string; to: string }[] = []
      const prev = entry.previous_data || {}
      const next = entry.new_data || {}

      const cleanValue = (val: any, key: string): string => {
        if (val === null || val === undefined) return '—'
        if (key === 'clientdetails') {
          if (typeof val === 'object') return val.name || 'Unknown'
          return String(val)
        }
        if (key === 'pickuplocations' || key === 'dropofflocations') {
          if (Array.isArray(val) && val.length > 0) return val[0]?.location || val[0]?.address || 'N/A'
          return 'N/A'
        }
        if (key === 'vehicleassignments') {
          if (Array.isArray(val) && val.length > 0) {
            const drivers = val[0]?.drivers
            if (Array.isArray(drivers) && drivers.length > 0) {
              return drivers[0]?.name || 'N/A'
            }
          }
          return 'N/A'
        }
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }

      const fieldLabels: Record<string, string> = {
        origin: 'Origin',
        destination: 'Destination',
        cargo: 'Cargo',
        rate: 'Rate',
        ordernumber: 'Order #',
        notes: 'Notes',
        status: 'Status',
        clientdetails: 'Client',
        pickuplocations: 'Pickup Location',
        dropofflocations: 'Drop-off Location',
        vehicleassignments: 'Driver',
        trip_type: 'Trip Type',
        estimated_distance: 'Distance (km)',
        goods_in_transit_premium: 'GIT Premium',
      }

      for (const [key, label] of Object.entries(fieldLabels)) {
        const prevStr = JSON.stringify(prev[key])
        const nextStr = JSON.stringify(next[key])
        if (prevStr !== nextStr) {
          changes.push({
            field: key,
            label,
            from: cleanValue(prev[key], key),
            to: cleanValue(next[key], key),
          })
        }
      }

      return {
        id: entry.id,
        tripId: entry.trip_id,
        tripNumber: trip?.trip_id || entry.trip_id,
        clientName,
        driverName,
        origin: trip?.origin || '—',
        destination: trip?.destination || '—',
        changeType: entry.change_type,
        changes,
        changeCount: changes.length,
        previousData: prev,
        newData: next,
        createdAt: entry.created_at,
      }
    }) || []

    return NextResponse.json(enriched)
  } catch (error: any) {
    console.error('Trip history error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
