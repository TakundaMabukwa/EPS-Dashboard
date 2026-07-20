import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { resolveProfileKey, VEHICLE_COST_PROFILES, WORKING_DAYS_PER_MONTH } from '@/lib/cost-engine'

const MILEAGE_BASE = (process.env.NEXT_PUBLIC_ROUTING || 'http://164.90.217.196:8800').replace(/\/$/, '')
const DRIVER_MONTHLY_SALARY = 23453.14
const DAILY_DRIVER_COST = DRIVER_MONTHLY_SALARY / WORKING_DAYS_PER_MONTH

function parseJson(value: unknown): any {
  if (!value) return null
  if (typeof value === 'string') { try { return JSON.parse(value) } catch { return null } }
  return value
}

async function getMileageBatch(vehicles: { reg: string; from: string; to: string }[]) {
  if (vehicles.length === 0) return []
  try {
    const res = await fetch(`${MILEAGE_BASE}/api/vehicle/mileage/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicles }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const json = await res.json()
    if (json?.ok && Array.isArray(json.data)) return json.data
  } catch {}
  return []
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

    // ── ACTUAL: fetch real mileage from batch API, recalculate with same formulas ──
    const vehicleassignments = parseJson(trip.vehicleassignments)
    const stopsData = parseJson(trip.stops_data)
    const statusEntries = Array.isArray(stopsData) ? stopsData : []

    // Get vehicle reg from vehicleassignments
    const regMap = new Map<number, string>()
    const vId = Number(vehicleassignments?.[0]?.vehicle?.id)
    if (vId) {
      const { data: v } = await supabase.from('vehiclesc').select('registration_number').eq('id', vId).single()
      if (v?.registration_number) regMap.set(vId, v.registration_number)
    }
    const horseReg = regMap.get(vId) || vehicleassignments?.[0]?.vehicle?.name || ''

    // Get trip time period from stops_data
    const fromTs = statusEntries[1]?.timestamp || statusEntries[1]?.recorded_at || ''
    const toTs = statusEntries.length >= 2
      ? statusEntries[statusEntries.length - 1]?.timestamp || statusEntries[statusEntries.length - 1]?.recorded_at || ''
      : ''

    let actualDistanceKm = 0
    let durationHours = 0
    let distanceSource = 'none'
    let fuelLitres = 0

    if (horseReg && fromTs && toTs) {
      const from = fromTs.split('T')[0]
      const to = toTs.split('T')[0]
      const [mileageData] = await getMileageBatch([{ reg: horseReg, from, to }])

      if (mileageData) {
        const startM = Number(mileageData.start_mileage) || 0
        const endM = Number(mileageData.end_mileage) || 0
        const dist = Number(mileageData.distance_km) || 0

        if (dist > 0) {
          actualDistanceKm = dist
        } else if (endM > startM) {
          actualDistanceKm = endM - startM
        }
        if (actualDistanceKm > 0) distanceSource = 'mileage_batch'

        // Calculate duration from timestamps
        if (fromTs && toTs) {
          const diffMs = new Date(toTs).getTime() - new Date(fromTs).getTime()
          durationHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10
        }
      }
    }

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
