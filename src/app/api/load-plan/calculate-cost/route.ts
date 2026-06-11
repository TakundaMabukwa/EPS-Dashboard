import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

// Maps vehiclesc.vehicle_type → costing profile name
const VEHICLE_TYPE_MAP: Record<string, string> = {
  TR14M: '14METER',
  TRS9M: '9METER',
  TRTR: 'TAUTLINER',
  TRFLT: 'TAUTLINER',
  TRFLP: 'TAUTLINER',
  TRRLT: 'REEFER',
  TRRLP: 'REEFER',
  R8T: '8TON',
  R5T: '5TON',
  LDV: '1TON',
  VFD: 'VOLUMAX',
  vehicle: '14METER',
}

// Costing profiles from the actual spreadsheet
// diesel_per_km = already computed (fuel price ÷ consumption rate)
// fixed_monthly = truck HP + tracking + licence + insurance + trailer fixed + admin + driver basic
const PROFILES: Record<string, {
  diesel_per_km: number
  maintenance: number
  breakdown: number
  tolls: number
  allowance: number
  cross_border_fee: number
  fixed_monthly: number
}> = {
  TAUTLINER: {
    diesel_per_km: 15.58765,
    maintenance: 1.60,
    breakdown: 0.06,
    tolls: 1.28,
    allowance: 2.19,
    cross_border_fee: 0,
    fixed_monthly: 28000,  // LINKS rate
  },
  '14METER': {
    diesel_per_km: 13.55448,
    maintenance: 1.10,
    breakdown: 0.06,
    tolls: 0.85,
    allowance: 1.40,
    cross_border_fee: 0,
    fixed_monthly: 22000,
  },
  REEFER: {
    diesel_per_km: 14.35448, // 14METER diesel + R0.80
    maintenance: 1.10,
    breakdown: 0.06,
    tolls: 0.85,
    allowance: 1.40,
    cross_border_fee: 0,
    fixed_monthly: 22000,
  },
  '9METER': {
    diesel_per_km: 8.907229,
    maintenance: 1.00,
    breakdown: 0.06,
    tolls: 0.24,
    allowance: 4.60,
    cross_border_fee: 0,
    fixed_monthly: 16000,
  },
  '8TON': {
    diesel_per_km: 7.793825,
    maintenance: 1.00,
    breakdown: 0.06,
    tolls: 0.15,
    allowance: 0,
    cross_border_fee: 0,
    fixed_monthly: 13620,
  },
  '5TON': {
    diesel_per_km: 5.50,
    maintenance: 1.00,
    breakdown: 0.06,
    tolls: 0.15,
    allowance: 0,
    cross_border_fee: 0,
    fixed_monthly: 13620,
  },
  '1TON': {
    diesel_per_km: 3.11753,
    maintenance: 1.00,
    breakdown: 0.06,
    tolls: 0.15,
    allowance: 0,
    cross_border_fee: 0,
    fixed_monthly: 2500,  // SHUNTER rate
  },
  VOLUMAX: {
    diesel_per_km: 3.11753,
    maintenance: 1.00,
    breakdown: 0.06,
    tolls: 0.15,
    allowance: 0,
    cross_border_fee: 0,
    fixed_monthly: 2500,
  },
}

const WORKING_DAYS_PER_MONTH = 25
const DEFAULT_PROFILE = '14METER'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      vehicleId,
      distanceKm,
      manualDieselRate,
      manualFixedMonthly,
      manualLoadingCost = 0,
      manualPackingCost = 0,
      manualTollCost = 0,
      manualBorderCost = 0,
      loadingWorkers = 0,
      loadingHours = 0,
      loadingRate = 45,
      packingWorkers = 0,
      packingHours = 0,
      packingRate = 45,
      casualWorkers = 0,
      casualHours = 0,
      casualRate = 0,
      isCrossBorder = false,
    } = body

    if (!vehicleId || !distanceKm) {
      return NextResponse.json({ error: 'vehicleId and distanceKm are required' }, { status: 400 })
    }

    const supabase = await getSupabase()

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehiclesc')
      .select('*')
      .eq('id', vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Map vehicle type to costing profile
    const vehicleType = vehicle.vehicle_type || 'vehicle'
    const profileName = VEHICLE_TYPE_MAP[vehicleType] || DEFAULT_PROFILE

    // Try DB first, fall back to hardcoded profiles
    let profile = PROFILES[profileName] || PROFILES[DEFAULT_PROFILE]

    const { data: dbProfile } = await supabase
      .from('vehicle_type_costing')
      .select('*')
      .eq('vehicle_type', profileName)
      .single()

    if (dbProfile) {
      profile = {
        diesel_per_km: manualDieselRate ?? Number(dbProfile.diesel_per_km ?? profile.diesel_per_km),
        maintenance: Number(dbProfile.maintenance_rate ?? profile.maintenance),
        breakdown: Number(dbProfile.breakdown_rate ?? profile.breakdown),
        tolls: Number(dbProfile.toll_rate ?? profile.tolls),
        allowance: Number(dbProfile.allowance_rate ?? profile.allowance),
        cross_border_fee: Number(dbProfile.cross_border_fee ?? profile.cross_border_fee),
        fixed_monthly: manualFixedMonthly ?? Number(dbProfile.fixed_daily_cost ? Number(dbProfile.fixed_daily_cost) * WORKING_DAYS_PER_MONTH : profile.fixed_monthly),
      }
    }

    // Allow manual overrides
    const dieselRate = manualDieselRate ?? profile.diesel_per_km
    const fixedMonthly = manualFixedMonthly ?? profile.fixed_monthly

    // --- Calculations per workbook formulas ---

    const tripDays = Math.max(1, Math.ceil(distanceKm / 600))

    // Fixed cost: (fixed monthly / 25 working days) × trip days
    const fixedDaily = fixedMonthly / WORKING_DAYS_PER_MONTH
    const fixedCost = fixedDaily * tripDays

    // Variable cost: distance × sum of all per-km rates
    const dieselCost = distanceKm * dieselRate
    const maintenanceCost = distanceKm * profile.maintenance
    const breakdownCost = distanceKm * profile.breakdown
    const tollCost = (distanceKm * profile.tolls) + manualTollCost
    const allowanceCost = distanceKm * profile.allowance
    const variableCost = dieselCost + maintenanceCost + breakdownCost + tollCost + allowanceCost

    // Labour
    const loadingCost = (loadingWorkers * loadingHours * loadingRate) + manualLoadingCost
    const packingCost = (packingWorkers * packingHours * packingRate) + manualPackingCost
    const casualCost = casualWorkers * casualHours * casualRate

    // Cross border
    const crossBorderCost = isCrossBorder ? profile.cross_border_fee + manualBorderCost : 0

    // Total
    const totalTripCost = fixedCost + variableCost + loadingCost + packingCost + casualCost + crossBorderCost
    const costPerKm = distanceKm > 0 ? totalTripCost / distanceKm : 0

    return NextResponse.json({
      // Profile info
      vehicleType,
      profileUsed: profileName,

      // Distance & timing
      distanceKm,
      tripDays,

      // Variable cost breakdown (per km rates)
      dieselRate,
      maintenanceRate: profile.maintenance,
      breakdownRate: profile.breakdown,
      tollRate: profile.tolls,
      allowanceRate: profile.allowance,

      // Fixed cost breakdown
      fixedMonthly,
      fixedDaily: Math.round(fixedDaily * 100) / 100,
      fixedCost: Math.round(fixedCost * 100) / 100,

      // Variable cost totals
      dieselCost: Math.round(dieselCost * 100) / 100,
      maintenanceCost: Math.round(maintenanceCost * 100) / 100,
      breakdownCost: Math.round(breakdownCost * 100) / 100,
      tollCost: Math.round(tollCost * 100) / 100,
      allowanceCost: Math.round(allowanceCost * 100) / 100,
      variableCost: Math.round(variableCost * 100) / 100,

      // Labour
      loadingCost: Math.round(loadingCost * 100) / 100,
      packingCost: Math.round(packingCost * 100) / 100,
      casualCost: Math.round(casualCost * 100) / 100,

      // Cross border
      crossBorderCost: Math.round(crossBorderCost * 100) / 100,

      // Totals
      totalTripCost: Math.round(totalTripCost * 100) / 100,
      costPerKm: Math.round(costPerKm * 100) / 100,
    })
  } catch (error) {
    console.error('Calculate cost error:', error)
    return NextResponse.json({ error: 'Failed to calculate trip cost' }, { status: 500 })
  }
}
