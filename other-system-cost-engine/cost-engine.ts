// ============================================================
// PER-VEHICLE Cost Engine
// Each vehicle has its own monthly costs from the Excel P&L.
// No hardcoded profiles — all values come from the vehiclesc table.
// ============================================================

export const DRIVER_MONTHLY_SALARY = 23453.14
export const WORKING_DAYS_PER_MONTH = 25
const DAILY_DRIVER_COST = DRIVER_MONTHLY_SALARY / WORKING_DAYS_PER_MONTH

// Per-vehicle cost data fetched from vehiclesc table
export interface VehicleCostData {
  monthly_depreciation: number
  monthly_insurance: number
  monthly_licence: number
  monthly_interest: number
  monthly_repairs: number
  repairs_per_km: number
  breakdowns_per_km: number
  tolls_per_km: number
  driver_ot_per_km: number
  cross_border_charge: number
}

export interface CostBreakdown {
  driverCost: number
  fixedAssetCost: number
  fuelCost: number
  rmCost: number
  crossBorderCost: number
  totalCost: number
  tripDays: number
}

export function calculateTripCost(params: {
  vehicleCosts: VehicleCostData
  distanceKm: number
  tripDays: number
  fuelLinkRate: number
}): CostBreakdown {
  const { vehicleCosts, distanceKm, tripDays, fuelLinkRate } = params

  // 1. Driver Cost
  const driverCost = DAILY_DRIVER_COST * tripDays

  // 2. Fixed Asset Cost (from vehicle's actual monthly costs)
  const monthlyFixed =
    vehicleCosts.monthly_depreciation +
    vehicleCosts.monthly_insurance +
    vehicleCosts.monthly_licence +
    vehicleCosts.monthly_interest
  const dailyFixed = monthlyFixed / WORKING_DAYS_PER_MONTH
  const fixedAssetCost = dailyFixed * tripDays

  // 3. Fuel Cost
  const fuelCost = fuelLinkRate * distanceKm

  // 4. R&M Cost (per-km rates × distance)
  const rmRatePerKm =
    vehicleCosts.repairs_per_km +
    vehicleCosts.breakdowns_per_km +
    vehicleCosts.tolls_per_km +
    vehicleCosts.driver_ot_per_km
  const rmCost = rmRatePerKm * distanceKm

  // 5. Cross Border (one-time trip charge)
  const crossBorderCost = vehicleCosts.cross_border_charge

  // 6. Total Cost
  const totalCost = driverCost + fixedAssetCost + fuelCost + rmCost + crossBorderCost

  return {
    driverCost: round2(driverCost),
    fixedAssetCost: round2(fixedAssetCost),
    fuelCost: round2(fuelCost),
    rmCost: round2(rmCost),
    crossBorderCost: round2(crossBorderCost),
    totalCost: round2(totalCost),
    tripDays,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
