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

function computePlannedCosts(distanceKm: number, vehicleType: string) {
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
  const totalPlanned = fixedCost + variableCost + loadingCost + packingCost
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
    totalPlanned: Math.round(totalPlanned * 100) / 100,
    costPerKm: distanceKm > 0 ? Math.round((totalPlanned / distanceKm) * 100) / 100 : 0,
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

    // First try: tripId is a trip id
    let { data: trip } = await supabase.from('trips').select('*').eq('id', Number(tripId)).single()

    // Second try: tripId is an audit id — get trip_id from audit table
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

    // Get vehicle info for type
    let vehicleType = 'vehicle'
    const va = trip.vehicleassignments || trip.vehicle_assignments || {}
    const vaParsed = typeof va === 'string' ? JSON.parse(va) : va
    const vehicleId = vaParsed?.vehicle?.id
    if (vehicleId) {
      const { data: v } = await supabase.from('vehiclesc').select('vehicle_type').eq('id', vehicleId).single()
      if (v?.vehicle_type) vehicleType = v.vehicle_type
    }

    // Use mileage difference for actual distance when available
    const startMileage = Number(trip.start_mileage || 0)
    const endMileage = Number(trip.end_mileage || 0)
    const mileageDistance = (startMileage > 0 && endMileage > 0) ? endMileage - startMileage : 0

    const estimatedDist = Number(trip.estimated_distance || 0)

    // Use mileage distance if available and positive, otherwise use stored distance
    const actualDistance = mileageDistance > 0
      ? mileageDistance
      : Number(trip.total_distance || trip.estimated_distance || 0)

    // Recalculate planned costs with corrected distance
    const planned = computePlannedCosts(actualDistance > 0 ? actualDistance : estimatedDist, vehicleType)
    // Recalculate actual costs based on corrected distance
    const profileName = VEHICLE_TYPE_MAP[vehicleType] || '14METER'
    const profile = PROFILES[profileName] || PROFILES['14METER']
    const recalcDiesel = actualDistance * profile.diesel_per_km
    const recalcMaintenance = actualDistance * profile.maintenance
    const recalcBreakdown = actualDistance * profile.breakdown
    const recalcTolls = actualDistance * profile.tolls
    const recalcAllowance = actualDistance * profile.allowance
    const recalcVariable = recalcDiesel + recalcMaintenance + recalcBreakdown + recalcTolls + recalcAllowance
    const recalcTripDays = Math.max(1, Math.ceil(actualDistance / 600))
    const recalcFixedDaily = profile.fixed_monthly / 25
    const recalcFixed = recalcFixedDaily * recalcTripDays
    const recalcLoading = 2 * 2 * 45
    const recalcPacking = 2 * 2 * 45
    const recalcTotal = recalcFixed + recalcVariable + recalcLoading + recalcPacking

    // Use stored actual costs if they exist and seem reasonable, otherwise use recalculated
    const storedTotal = Number(trip.total_trip_cost || 0)
    const useStored = storedTotal > 0 && storedTotal < recalcTotal * 2

    const actual = {
      dieselCost: useStored ? Number(trip.diesel_cost || trip.fuel_cost || 0) : Math.round(recalcDiesel * 100) / 100,
      maintenanceCost: useStored ? Number(trip.maintenance_cost || 0) : Math.round(recalcMaintenance * 100) / 100,
      breakdownCost: useStored ? Number(trip.breakdown_cost || 0) : Math.round(recalcBreakdown * 100) / 100,
      tollCost: useStored ? Number(trip.toll_cost || 0) : Math.round(recalcTolls * 100) / 100,
      allowanceCost: useStored ? Number(trip.allowance_cost || 0) : Math.round(recalcAllowance * 100) / 100,
      variableCost: useStored ? Number(trip.variable_cost || 0) : Math.round(recalcVariable * 100) / 100,
      fixedCost: useStored ? Number(trip.fixed_cost || trip.trip_fixed_cost || 0) : Math.round(recalcFixed * 100) / 100,
      fixedMonthly: profile.fixed_monthly,
      fixedDaily: Math.round(recalcFixedDaily * 100) / 100,
      loadingCost: useStored ? Number(trip.loading_cost || 0) : recalcLoading,
      packingCost: useStored ? Number(trip.packing_cost || 0) : recalcPacking,
      casualCost: Number(trip.casual_cost || 0),
      crossBorderCost: Number(trip.cross_border_cost || 0),
      totalCost: useStored ? storedTotal : Math.round(recalcTotal * 100) / 100,
      costPerKm: actualDistance > 0 ? Math.round(((useStored ? storedTotal : recalcTotal) / actualDistance) * 100) / 100 : 0,
      fuelLitres: Number(trip.fuel_litres || 0),
      dieselRate: profile.diesel_per_km,
      profileUsed: profileName,
      distanceKm: actualDistance,
    }

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
        estimatedDistance: estimatedDist, actualDistance,
        startMileage,
        endMileage,
        mileageDistance,
        actualStartTime: trip.actual_start_time, actualEndTime: trip.actual_end_time,
        vehicleType, driver: trip.driver,
        planned, actual,
      }
    })
  } catch (error) {
    console.error('Audit trip API error:', error)
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}
