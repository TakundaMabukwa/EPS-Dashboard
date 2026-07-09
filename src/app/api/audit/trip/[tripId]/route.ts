import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { resolveProfileKey, VEHICLE_COST_PROFILES, WORKING_DAYS_PER_MONTH } from '@/lib/cost-engine'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const ROUTING_URL = process.env.NEXT_PUBLIC_ROUTING || 'http://164.90.217.196:8800/'
const DRIVER_MONTHLY_SALARY = 23453.14
const DAILY_DRIVER_COST = DRIVER_MONTHLY_SALARY / WORKING_DAYS_PER_MONTH

async function geocode(query: string): Promise<[number, number] | null> {
  if (!MAPBOX_TOKEN || !query) return null
  const enriched = query.toLowerCase().includes('south africa') || query.toLowerCase().includes(', za')
    ? query
    : `${query}, South Africa`
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(enriched)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=ZA`
    )
    const data = await res.json()
    if (data.features?.length > 0) {
      return data.features[0].center
    }
  } catch {}
  return null
}

async function getDrivingDistance(origin: string, destination: string) {
  if (!MAPBOX_TOKEN || !origin || !destination) return null
  try {
    const [originCoords, destCoords] = await Promise.all([geocode(origin), geocode(destination)])
    if (!originCoords || !destCoords) return null
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?access_token=${MAPBOX_TOKEN}`
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
    const res = await fetch(`${ROUTING_URL}api/trip/${tripId}/report`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data.ok && data.data) {
      return {
        distanceKm: Number(data.data.total_distance_km || 0),
        fuelLitres: Number(data.data.total_fuel_used_liters || 0),
        durationHours: Number(data.data.total_duration_seconds || 0) / 3600,
      }
    }
  } catch {}
  return null
}

function recalcCost(profileKey: string, distanceKm: number, tripDays: number, fuelLinkRate: number) {
  const profile = VEHICLE_COST_PROFILES[profileKey]
  if (!profile) return null

  const driverCost = Math.round(DAILY_DRIVER_COST * tripDays * 100) / 100
  const monthlyFixed = profile.truckHp + profile.tracking + profile.truckLicence + profile.truckInsurance +
    profile.trailerHp + profile.trailerLicence + profile.trailerInsurance + profile.admin
  const fixedAssetCost = Math.round((monthlyFixed / WORKING_DAYS_PER_MONTH) * tripDays * 100) / 100
  const fuelCost = Math.round(fuelLinkRate * distanceKm * 100) / 100
  const rmRatePerKm = profile.repairs + profile.breakdowns + profile.tolls + profile.driverOt
  const rmCost = Math.round(rmRatePerKm * distanceKm * 100) / 100
  const crossBorderCost = profile.crossBorder
  const totalCost = Math.round((driverCost + fixedAssetCost + fuelCost + rmCost + crossBorderCost) * 100) / 100

  return {
    driverCost, fixedAssetCost, fuelCost, rmCost, crossBorderCost, totalCost,
    costPerKm: distanceKm > 0 ? Math.round((totalCost / distanceKm) * 100) / 100 : 0,
    tripDays, rmRatePerKm: Math.round(rmRatePerKm * 100) / 100,
  }
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

    let { data: trip } = await supabase.from('trips').select('*').eq('trip_id', tripId).single()

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    let clientName = trip.selectedclient || trip.selected_client || ''
    const cd = trip.clientdetails || trip.client_details
    if (!clientName && cd) {
      try { clientName = (typeof cd === 'string' ? JSON.parse(cd) : cd)?.name || '' } catch {}
    }

    // ── PLANNED: read directly from trips table (stored at load creation) ──
    const planned = {
      driverCost: Number(trip.driver_cost) || 0,
      fixedAssetCost: Number(trip.fixed_cost) || 0,
      fuelCost: Number(trip.fuel_cost) || 0,
      rmCost: Number(trip.maintenance_cost) || 0,
      crossBorderCost: Number(trip.cross_border_cost) || 0,
      totalCost: Number(trip.total_trip_cost) || 0,
      costPerKm: Number(trip.cost_per_km) || 0,
      distance: Number(trip.estimated_distance) || 0,
      duration: Number(trip.estimated_duration) || 0,
      tripDays: Number(trip.trip_days) || 0,
      fuelLinkRate: Number(trip.diesel_rate) || 0,
      rmRatePerKm: 0,
      profileUsed: trip.profile_used || '',
      sellingRatePerKm: Number(trip.selling_rate_per_km) || 0,
      revenue: Number(trip.selling_rate_per_km) || 0,
      profit: (Number(trip.selling_rate_per_km) || 0) - (Number(trip.total_trip_cost) || 0),
    }

    if (planned.distance > 0 && planned.rmCost > 0) {
      planned.rmRatePerKm = Math.round((planned.rmCost / planned.distance) * 100) / 100
    }

    // ── ACTUAL: fetch real distance, recalculate with same formulas ──
    const [mapboxResult, tripReport] = await Promise.all([
      getDrivingDistance(trip.origin || '', trip.destination || ''),
      getTripReport(trip.trip_id || ''),
    ])

    const actualDistanceKm = mapboxResult?.distanceKm || tripReport?.distanceKm || 0
    const distanceSource = mapboxResult ? 'mapbox' : tripReport ? 'trip_report' : 'none'
    const durationHours = mapboxResult?.durationHours || tripReport?.durationHours || 0
    const fuelLitres = tripReport?.fuelLitres || 0

    const actualTripDays = durationHours > 0
      ? Math.max(0.5, Math.ceil((durationHours / 8) * 2) / 2)
      : planned.tripDays

    const profileKey = resolveProfileKey(trip.profile_used || '') || resolveProfileKey('vehicle')
    const actualCalc = profileKey && actualDistanceKm > 0
      ? recalcCost(profileKey, actualDistanceKm, actualTripDays, planned.fuelLinkRate)
      : null

    const actual = actualCalc ? {
      ...actualCalc,
      distance: actualDistanceKm,
      distanceSource,
      durationHours,
      fuelLitres,
      fuelLinkRate: planned.fuelLinkRate,
      profileUsed: trip.profile_used || '',
      sellingRatePerKm: planned.sellingRatePerKm,
      revenue: planned.sellingRatePerKm,
      profit: planned.sellingRatePerKm - actualCalc.totalCost,
    } : null

    return NextResponse.json({
      ok: true,
      data: {
        id: trip.id, tripId: trip.trip_id, orderNumber: trip.ordernumber,
        status: trip.status, origin: trip.origin, destination: trip.destination,
        cargo: trip.cargo, cargoWeight: trip.cargo_weight, clientName,
        rate: trip.selling_rate_per_km || trip.rate, startDate: trip.startdate || trip.start_date,
        endDate: trip.end_date || trip.enddate,
        vehicleType: trip.selected_vehicle_type || '', driver: trip.driver,
        estimatedDuration: Number(trip.estimated_duration) || 0,
        planned,
        actual,
      }
    })
  } catch (error) {
    console.error('Audit trip API error:', error)
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}
