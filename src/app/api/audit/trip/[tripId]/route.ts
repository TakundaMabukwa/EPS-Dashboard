import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const ROUTING_URL = process.env.NEXT_PUBLIC_ROUTING || 'http://164.90.217.196:8800/'

const PROFILES: Record<string, {
  fixed_monthly: number;
}> = {
  TAUTLINER: { fixed_monthly: 28000 },
  '14METER': { fixed_monthly: 22000 },
  REEFER: { fixed_monthly: 22000 },
  '9METER': { fixed_monthly: 16000 },
  '8TON': { fixed_monthly: 13620 },
  '1TON': { fixed_monthly: 2500 },
}

const VEHICLE_TYPE_MAP: Record<string, string> = {
  TR14M: '14METER', TRS9M: '9METER', TRTR: 'TAUTLINER', TRFLT: 'TAUTLINER',
  TRFLP: 'TAUTLINER', TRRLT: 'REEFER', TRRLP: 'REEFER', R8T: '8TON',
  R5T: '5TON', LDV: '1TON', VFD: 'VOLUMAX', vehicle: '14METER',
}

const DIESEL_PRICE_PER_LITRE = 23.50 // Current SA diesel average

async function geocode(query: string): Promise<[number, number] | null> {
  if (!MAPBOX_TOKEN || !query) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    )
    const data = await res.json()
    if (data.features?.length > 0) {
      return data.features[0].center
    }
  } catch {}
  return null
}

async function getDrivingDistance(
  origin: string,
  destination: string
): Promise<{ distanceKm: number; durationHours: number } | null> {
  if (!MAPBOX_TOKEN || !origin || !destination) return null
  try {
    const [originCoords, destCoords] = await Promise.all([
      geocode(origin),
      geocode(destination),
    ])
    if (!originCoords || !destCoords) return null

    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?access_token=${MAPBOX_TOKEN}&units=metric`
    )
    const data = await res.json()
    if (data.routes?.length > 0) {
      const route = data.routes[0]
      return {
        distanceKm: Math.round(route.distance / 1000),
        durationHours: Math.round((route.duration / 3600) * 10) / 10,
      }
    }
  } catch {}
  return null
}

async function getTripReport(tripId: string) {
  try {
    console.log(`[audit] Fetching trip report for ${tripId}`)
    const res = await fetch(`${ROUTING_URL}api/trip/${tripId}/report`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) {
      console.log(`[audit] Trip report returned ${res.status}`)
      return null
    }
    const data = await res.json()
    if (data.ok && data.data) {
      const result = {
        distanceKm: Number(data.data.total_distance_km || 0),
        fuelLitres: Number(data.data.total_fuel_used_liters || 0),
        durationHours: Number(data.data.total_duration_seconds || 0) / 3600,
        startOdometer: Number(data.data.start_odometer || 0),
        endOdometer: Number(data.data.end_odometer || 0),
      }
      console.log(`[audit] Trip report: ${result.distanceKm}km, ${result.fuelLitres}L`)
      return result
    }
  } catch (e: any) {
    console.log(`[audit] Trip report failed: ${e.message}`)
  }
  return null
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    let { data: trip } = await supabase.from('trips').select('*').eq('id', Number(tripId)).single()

    if (!trip) {
      const { data: auditRec } = await supabase.from('audit').select('trip_id').eq('id', Number(tripId)).single()
      if (auditRec?.trip_id) {
        const { data: t } = await supabase.from('trips').select('*').eq('trip_id', auditRec.trip_id).single()
        trip = t
      }
    }

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    let vehicleType = 'vehicle'
    const va = trip.vehicleassignments || trip.vehicle_assignments || {}
    const vaParsed = typeof va === 'string' ? JSON.parse(va) : va
    const vehicleId = vaParsed?.vehicle?.id
    if (vehicleId) {
      const { data: v } = await supabase.from('vehiclesc').select('vehicle_type').eq('id', vehicleId).single()
      if (v?.vehicle_type) vehicleType = v.vehicle_type
    }

    const profileName = VEHICLE_TYPE_MAP[vehicleType] || '14METER'
    const profile = PROFILES[profileName] || PROFILES['14METER']

    // Run Mapbox + trip report in parallel — Mapbox for distance, trip report for fuel
    const [mapboxResult, tripReport] = await Promise.all([
      getDrivingDistance(trip.origin || '', trip.destination || ''),
      getTripReport(trip.trip_id || ''),
    ])

    // Distance from Mapbox (loading → dropoff), fallback to trip report odometer
    const distanceKm = mapboxResult?.distanceKm || tripReport?.distanceKm || 0
    const distanceSource = mapboxResult ? 'mapbox' : tripReport ? 'trip_report' : 'none'
    const durationHours = mapboxResult?.durationHours || tripReport?.durationHours || 0

    // Fuel always from trip report (actual litres)
    const fuelLitres = tripReport?.fuelLitres || 0
    const dieselCost = fuelLitres > 0 ? fuelLitres * DIESEL_PRICE_PER_LITRE : 0

    // Fixed cost
    const tripDays = Math.max(1, Math.ceil(distanceKm / 600))
    const fixedDaily = profile.fixed_monthly / 25
    const fixedCost = fixedDaily * tripDays

    // Loading/packing
    const loadingCost = 2 * 2 * 45
    const packingCost = 2 * 2 * 45

    // Total
    const totalCost = dieselCost + fixedCost + loadingCost + packingCost

    let clientName = trip.selectedclient || trip.selected_client || ''
    const cd = trip.clientdetails || trip.client_details
    if (!clientName && cd) {
      try { clientName = (typeof cd === 'string' ? JSON.parse(cd) : cd)?.name || '' } catch {}
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: trip.id, tripId: trip.trip_id, orderNumber: trip.ordernumber,
        status: trip.status, origin: trip.origin, destination: trip.destination,
        cargo: trip.cargo, cargoWeight: trip.cargo_weight, clientName,
        rate: trip.rate, startDate: trip.startdate || trip.start_date,
        endDate: trip.end_date || trip.enddate,
        vehicleType, driver: trip.driver,
        distance: {
          km: distanceKm,
          source: distanceSource,
          durationHours,
        },
        fuel: {
          litres: fuelLitres,
          pricePerLitre: DIESEL_PRICE_PER_LITRE,
          totalCost: Math.round(dieselCost * 100) / 100,
        },
        fixed: {
          monthly: profile.fixed_monthly,
          daily: Math.round(fixedDaily * 100) / 100,
          tripDays,
          totalCost: Math.round(fixedCost * 100) / 100,
        },
        labour: {
          loading: loadingCost,
          packing: packingCost,
          total: loadingCost + packingCost,
        },
        totalCost: Math.round(totalCost * 100) / 100,
        costPerKm: distanceKm > 0 ? Math.round((totalCost / distanceKm) * 100) / 100 : 0,
        _debug: { mapbox: !!mapboxResult, tripReport: !!tripReport, tripId: trip.trip_id },
      }
    })
  } catch (error) {
    console.error('Audit trip API error:', error)
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}
