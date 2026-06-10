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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      vehicleId,
      distanceKm,
      manualFuelPrice,
      manualLoadingCost = 0,
      manualPackingCost = 0,
      manualTollCost = 0,
      manualBorderCost = 0,
      loadingWorkers = 0,
      loadingHours = 0,
      packingWorkers = 0,
      packingHours = 0,
      casualWorkers = 0,
      casualHours = 0,
      casualRate = 0,
      isCrossBorder = false,
      profitMargin = 0.20,
    } = body

    if (!vehicleId || !distanceKm) {
      return NextResponse.json({ error: 'vehicleId and distanceKm are required' }, { status: 400 })
    }

    const supabase = await getSupabase()

    // Fetch vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehiclesc')
      .select('*')
      .eq('id', vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Fetch vehicle costing profile
    const { data: profile, error: profileError } = await supabase
      .from('vehicle_type_costing')
      .select('*')
      .eq('vehicle_type', vehicle.vehicle_type)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: `No costing profile for vehicle type: ${vehicle.vehicle_type}` }, { status: 404 })
    }

    // Fetch latest fuel price
    const { data: fuelPriceData } = await supabase
      .from('fuel_prices')
      .select('price_per_litre')
      .eq('effective_date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const dieselPrice = manualFuelPrice || fuelPriceData?.price_per_litre || 9.67

    // --- Calculations ---

    // Fuel
    const fuelEfficiency = profile.fuel_efficiency
    const fuelLitres = distanceKm / fuelEfficiency
    const fuelCost = fuelLitres * dieselPrice

    // Maintenance
    const maintenanceCost = distanceKm * Number(profile.maintenance_rate)

    // Breakdown reserve
    const breakdownCost = distanceKm * Number(profile.breakdown_rate)

    // Toll (profile rate + manual override)
    const tollCost = distanceKm * Number(profile.toll_rate) + manualTollCost

    // Driver cost (hourly)
    const tripHours = distanceKm / Number(profile.average_speed)
    const driverCost = vehicle.hourly_rate ? tripHours * Number(vehicle.hourly_rate) : 0

    // Driver allowance
    const allowanceCost = distanceKm * Number(profile.allowance_rate)

    // Fixed ownership cost
    const fixedMonthlyCost =
      Number(vehicle.tracking_prd || 0) +
      Number(vehicle.insurance_prd || 0) +
      Number(vehicle.licences_prd || 0) +
      Number(vehicle.vehicle_payments_prd || 0) +
      Number(vehicle.wages_prd || 0)

    const hasVehicleCosts = fixedMonthlyCost > 0
    const dailyFixedCost = hasVehicleCosts ? fixedMonthlyCost / 30 : Number(profile.fixed_daily_cost)
    const tripDays = Math.max(1, Math.ceil(distanceKm / 600))
    const tripFixedCost = dailyFixedCost * tripDays

    // Loading
    const loadingCost = loadingWorkers * loadingHours * Number(profile.loading_rate) + manualLoadingCost

    // Packing
    const packingCost = packingWorkers * packingHours * Number(profile.packing_rate) + manualPackingCost

    // Casual labour
    const casualCost = casualWorkers * casualHours * casualRate

    // Cross border
    const crossBorderCost = isCrossBorder ? Number(profile.cross_border_fee) : 0

    // Total
    const totalTripCost =
      fuelCost +
      maintenanceCost +
      breakdownCost +
      tollCost +
      driverCost +
      allowanceCost +
      tripFixedCost +
      loadingCost +
      packingCost +
      casualCost +
      crossBorderCost +
      manualBorderCost

    // CPK
    const costPerKm = distanceKm > 0 ? totalTripCost / distanceKm : 0

    // Selling price
    const recommendedSellingPrice = totalTripCost * (1 + profitMargin)
    const profit = recommendedSellingPrice - totalTripCost
    const profitMarginPct = recommendedSellingPrice > 0 ? (profit / recommendedSellingPrice) * 100 : 0

    return NextResponse.json({
      distanceKm,
      fuelLitres: Math.round(fuelLitres * 100) / 100,
      fuelCost: Math.round(fuelCost * 100) / 100,
      maintenanceCost: Math.round(maintenanceCost * 100) / 100,
      breakdownCost: Math.round(breakdownCost * 100) / 100,
      tollCost: Math.round(tollCost * 100) / 100,
      driverCost: Math.round(driverCost * 100) / 100,
      allowanceCost: Math.round(allowanceCost * 100) / 100,
      tripFixedCost: Math.round(tripFixedCost * 100) / 100,
      loadingCost: Math.round(loadingCost * 100) / 100,
      packingCost: Math.round(packingCost * 100) / 100,
      casualCost: Math.round(casualCost * 100) / 100,
      crossBorderCost: Math.round(crossBorderCost * 100) / 100,
      totalTripCost: Math.round(totalTripCost * 100) / 100,
      costPerKm: Math.round(costPerKm * 100) / 100,
      recommendedSellingPrice: Math.round(recommendedSellingPrice * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitMargin: Math.round(profitMarginPct * 100) / 100,
      tripDays,
      fuelEfficiency,
      dieselPrice,
      vehicleType: vehicle.vehicle_type,
      profileUsed: profile.vehicle_type,
    })
  } catch (error) {
    console.error('Calculate cost error:', error)
    return NextResponse.json({ error: 'Failed to calculate trip cost' }, { status: 500 })
  }
}
