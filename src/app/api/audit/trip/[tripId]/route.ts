import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PROFILES: Record<string, {
  diesel_per_km: number; maintenance: number; breakdown: number;
  tolls: number; allowance: number; cross_border_fee: number; fixed_monthly: number;
}> = {
  TAUTLINER: { diesel_per_km: 15.58765, maintenance: 1.60, breakdown: 0.06, tolls: 1.28, allowance: 2.19, cross_border_fee: 0, fixed_monthly: 28000 },
  '14METER': { diesel_per_km: 13.55448, maintenance: 1.10, breakdown: 0.06, tolls: 0.85, allowance: 1.40, cross_border_fee: 0, fixed_monthly: 22000 },
  REEFER: { diesel_per_km: 14.35448, maintenance: 1.10, breakdown: 0.06, tolls: 0.85, allowance: 1.40, cross_border_fee: 0, fixed_monthly: 22000 },
  '9METER': { diesel_per_km: 8.907229, maintenance: 1.00, breakdown: 0.06, tolls: 0.24, allowance: 4.60, cross_border_fee: 0, fixed_monthly: 16000 },
  '8TON': { diesel_per_km: 7.793825, maintenance: 1.00, breakdown: 0.06, tolls: 0.15, allowance: 0, cross_border_fee: 0, fixed_monthly: 13620 },
  '1TON': { diesel_per_km: 3.11753, maintenance: 1.00, breakdown: 0.06, tolls: 0.15, allowance: 0, cross_border_fee: 0, fixed_monthly: 2500 },
}

const VEHICLE_TYPE_MAP: Record<string, string> = {
  TR14M: '14METER', TRS9M: '9METER', TRTR: 'TAUTLINER', TRFLT: 'TAUTLINER',
  TRFLP: 'TAUTLINER', TRRLT: 'REEFER', TRRLP: 'REEFER', R8T: '8TON',
  R5T: '5TON', LDV: '1TON', VFD: 'VOLUMAX', vehicle: '14METER',
}

function computeCosts(distanceKm: number, vehicleType: string) {
  if (distanceKm <= 0) return null
  const profileName = VEHICLE_TYPE_MAP[vehicleType] || '14METER'
  const profile = PROFILES[profileName] || PROFILES['14METER']
  const tripDays = Math.max(1, Math.ceil(distanceKm / 600))
  const fixedDaily = profile.fixed_monthly / 25
  const fixedCost = fixedDaily * tripDays
  const dieselCost = distanceKm * profile.diesel_per_km
  const maintenanceCost = distanceKm * profile.maintenance
  const breakdownCost = distanceKm * profile.breakdown
  const tollCost = distanceKm * profile.tolls
  const allowanceCost = distanceKm * profile.allowance
  const variableCost = dieselCost + maintenanceCost + breakdownCost + tollCost + allowanceCost
  const loadingCost = 2 * 2 * 45
  const packingCost = 2 * 2 * 45
  const total = fixedCost + variableCost + loadingCost + packingCost
  return {
    profileUsed: profileName, tripDays, distanceKm,
    dieselRate: profile.diesel_per_km,
    dieselCost: Math.round(dieselCost * 100) / 100,
    maintenanceCost: Math.round(maintenanceCost * 100) / 100,
    breakdownCost: Math.round(breakdownCost * 100) / 100,
    tollCost: Math.round(tollCost * 100) / 100,
    allowanceCost: Math.round(allowanceCost * 100) / 100,
    variableCost: Math.round(variableCost * 100) / 100,
    fixedMonthly: profile.fixed_monthly,
    fixedDaily: Math.round(fixedDaily * 100) / 100,
    fixedCost: Math.round(fixedCost * 100) / 100,
    loadingCost, packingCost,
    totalCost: Math.round(total * 100) / 100,
    costPerKm: distanceKm > 0 ? Math.round((total / distanceKm) * 100) / 100 : 0,
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

    const startMileage = Number(trip.start_mileage || 0)
    const endMileage = Number(trip.end_mileage || 0)
    const mileageDistance = (startMileage > 0 && endMileage > 0) ? endMileage - startMileage : 0
    const estimatedDist = Number(trip.estimated_distance || 0)
    const storedTotalDist = Number(trip.total_distance || 0)

    // Determine best distance: mileage > total_distance > estimated_distance
    let bestDistance = 0
    let distanceSource = 'none'
    if (mileageDistance > 0) {
      bestDistance = mileageDistance
      distanceSource = 'mileage'
    } else if (storedTotalDist > 0) {
      bestDistance = storedTotalDist
      distanceSource = 'total_distance'
    } else if (estimatedDist > 0) {
      bestDistance = estimatedDist
      distanceSource = 'estimated_distance'
    }

    // Always recalculate costs from the best distance + profile
    const costs = computeCosts(bestDistance, vehicleType)

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
        estimatedDistance: estimatedDist, actualDistance: bestDistance,
        distanceSource,
        startMileage,
        endMileage,
        mileageDistance,
        actualStartTime: trip.actual_start_time, actualEndTime: trip.actual_end_time,
        vehicleType, driver: trip.driver,
        costs,
      }
    })
  } catch (error) {
    console.error('Audit trip API error:', error)
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}
