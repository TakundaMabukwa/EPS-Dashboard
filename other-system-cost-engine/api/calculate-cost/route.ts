// ============================================================
// API Route: /api/calculate-cost
// POST: { vehicleId, distanceKm, tripDays, monthLabel }
// Returns: CostBreakdown
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateTripCost, VehicleCostData } from '@/lib/cost-engine'

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, distanceKm, tripDays, monthLabel } = await request.json()

    if (!vehicleId || !distanceKm || distanceKm <= 0) {
      return NextResponse.json({ error: 'vehicleId and distanceKm are required' }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch vehicle's per-vehicle cost data
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehiclesc')
      .select(`
        monthly_depreciation,
        monthly_insurance,
        monthly_licence,
        monthly_interest,
        monthly_repairs,
        repairs_per_km,
        breakdowns_per_km,
        tolls_per_km,
        driver_ot_per_km,
        cross_border_charge
      `)
      .eq('id', vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Fetch fuel link rate for the month
    let fuelLinkRate = 0
    if (monthLabel) {
      const { data: fuelData } = await supabase
        .from('fuel_prices_history')
        .select('link_rate')
        .eq('month_label', monthLabel)
        .single()

      if (fuelData) {
        fuelLinkRate = Number(fuelData.link_rate)
      }
    }

    // Calculate trip cost using per-vehicle data
    const result = calculateTripCost({
      vehicleCosts: vehicle as VehicleCostData,
      distanceKm,
      tripDays: tripDays || 1,
      fuelLinkRate,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Error calculating cost:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
